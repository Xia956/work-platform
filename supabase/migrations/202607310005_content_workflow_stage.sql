alter table public.inspirations
  add column if not exists workflow_stage text;

update public.inspirations as inspiration
set workflow_stage = case
  when exists (
    select 1
    from public.topics as topic
    join public.scripts as script on script.topic_id = topic.id
    join public.publications as publication on publication.script_id = script.id
    where topic.inspiration_id = inspiration.id
  ) then 'published'
  when exists (
    select 1
    from public.topics as topic
    join public.scripts as script on script.topic_id = topic.id
    where topic.inspiration_id = inspiration.id
      and script.status = 'ready'
  ) then 'ready'
  when exists (
    select 1
    from public.topics as topic
    join public.scripts as script on script.topic_id = topic.id
    join public.script_versions as version on version.script_id = script.id
    where topic.inspiration_id = inspiration.id
      and version.version_type in ('manual_edit', 'ai_generated', 'ai_optimized', 'restored')
  ) then 'ai_optimized'
  when exists (
    select 1
    from public.topics as topic
    where topic.inspiration_id = inspiration.id
  ) then 'rough_draft'
  else 'idea'
end
where workflow_stage is null;

alter table public.inspirations
  alter column workflow_stage set default 'idea',
  alter column workflow_stage set not null;

alter table public.inspirations
  drop constraint if exists inspirations_workflow_stage_check;

alter table public.inspirations
  add constraint inspirations_workflow_stage_check
  check (workflow_stage in ('idea', 'rough_draft', 'ai_optimized', 'ready', 'published'));

create or replace function public.sync_content_workflow_stage()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_inspiration_id uuid;
  next_stage text;
begin
  if tg_table_name = 'topics' then
    target_inspiration_id := new.inspiration_id;
    next_stage := 'rough_draft';
  elsif tg_table_name = 'scripts' then
    select topic.inspiration_id into target_inspiration_id
    from public.topics as topic
    where topic.id = new.topic_id;

    if new.status = 'published' then
      next_stage := 'published';
    elsif new.status = 'ready' then
      next_stage := 'ready';
    elsif tg_op = 'INSERT' then
      next_stage := 'rough_draft';
    end if;
  elsif tg_table_name = 'script_versions' then
    select topic.inspiration_id into target_inspiration_id
    from public.scripts as script
    join public.topics as topic on topic.id = script.topic_id
    where script.id = new.script_id;

    if new.version_type = 'rough_draft' then
      next_stage := 'rough_draft';
    else
      next_stage := 'ai_optimized';
    end if;
  elsif tg_table_name = 'publications' then
    select topic.inspiration_id into target_inspiration_id
    from public.scripts as script
    join public.topics as topic on topic.id = script.topic_id
    where script.id = new.script_id;
    next_stage := 'published';
  end if;

  if target_inspiration_id is not null and next_stage is not null then
    update public.inspirations
    set workflow_stage = next_stage
    where id = target_inspiration_id;
  end if;

  return new;
end;
$$;

drop trigger if exists topics_sync_workflow_stage on public.topics;
create trigger topics_sync_workflow_stage
after insert on public.topics
for each row execute function public.sync_content_workflow_stage();

drop trigger if exists scripts_sync_workflow_stage on public.scripts;
create trigger scripts_sync_workflow_stage
after insert or update of status on public.scripts
for each row execute function public.sync_content_workflow_stage();

drop trigger if exists versions_sync_workflow_stage on public.script_versions;
create trigger versions_sync_workflow_stage
after insert on public.script_versions
for each row execute function public.sync_content_workflow_stage();

drop trigger if exists publications_sync_workflow_stage on public.publications;
create trigger publications_sync_workflow_stage
after insert on public.publications
for each row execute function public.sync_content_workflow_stage();
