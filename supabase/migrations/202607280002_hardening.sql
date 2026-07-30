-- Enforce ownership across foreign-key relationships and make AI script creation atomic.

create or replace function public.assert_owned_references()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is null then
    raise exception 'user_id is required';
  end if;

  if tg_table_name = 'topics' and new.inspiration_id is not null
    and not exists (
      select 1 from public.inspirations
      where id = new.inspiration_id and user_id = new.user_id
    )
  then
    raise exception 'inspiration does not belong to user';
  end if;

  if tg_table_name = 'scripts' then
    if new.topic_id is not null and not exists (
      select 1 from public.topics where id = new.topic_id and user_id = new.user_id
    ) then
      raise exception 'topic does not belong to user';
    end if;
    if new.current_version_id is not null and not exists (
      select 1 from public.script_versions
      where id = new.current_version_id
        and script_id = new.id
        and user_id = new.user_id
    ) then
      raise exception 'current version does not belong to script';
    end if;
  end if;

  if tg_table_name = 'script_versions' then
    if not exists (
      select 1 from public.scripts where id = new.script_id and user_id = new.user_id
    ) then
      raise exception 'script does not belong to user';
    end if;
    if new.parent_version_id is not null and not exists (
      select 1 from public.script_versions
      where id = new.parent_version_id
        and script_id = new.script_id
        and user_id = new.user_id
    ) then
      raise exception 'parent version does not belong to script';
    end if;
  end if;

  if tg_table_name = 'benchmark_accounts' and not exists (
    select 1 from public.benchmark_sources
    where id = new.source_id and user_id = new.user_id
  ) then
    raise exception 'benchmark source does not belong to user';
  end if;

  if tg_table_name = 'benchmark_videos' then
    if not exists (
      select 1 from public.benchmark_sources
      where id = new.source_id and user_id = new.user_id
    ) then
      raise exception 'benchmark source does not belong to user';
    end if;
    if new.account_id is not null and not exists (
      select 1 from public.benchmark_accounts
      where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'benchmark account does not belong to user';
    end if;
  end if;

  if tg_table_name = 'publications' then
    if new.script_id is not null and not exists (
      select 1 from public.scripts where id = new.script_id and user_id = new.user_id
    ) then
      raise exception 'script does not belong to user';
    end if;
    if new.script_version_id is not null and not exists (
      select 1 from public.script_versions
      where id = new.script_version_id
        and user_id = new.user_id
        and (new.script_id is null or script_id = new.script_id)
    ) then
      raise exception 'script version does not belong to publication script';
    end if;
  end if;

  if tg_table_name = 'metric_snapshots' and not exists (
    select 1 from public.publications
    where id = new.publication_id and user_id = new.user_id
  ) then
    raise exception 'publication does not belong to user';
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'topics', 'scripts', 'script_versions', 'benchmark_accounts',
    'benchmark_videos', 'publications', 'metric_snapshots'
  ]
  loop
    execute format('drop trigger if exists owned_references on public.%I', table_name);
    execute format(
      'create trigger owned_references before insert or update on public.%I for each row execute function public.assert_owned_references()',
      table_name
    );
  end loop;
end $$;

revoke all on function public.assert_owned_references() from public;

-- Versions are append-only. They can still be removed through a script cascade.
drop policy if exists "own rows update" on public.script_versions;
drop policy if exists "own rows delete" on public.script_versions;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'creator_profiles','inspirations','topics','scripts','script_versions',
    'benchmark_sources','benchmark_accounts','benchmark_videos','publications',
    'metric_snapshots','ai_runs'
  ]
  loop
    execute format('revoke all on public.%I from anon', table_name);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated',
      table_name
    );
  end loop;
end $$;

create or replace function public.create_script_from_ai(
  p_title text,
  p_topic_id uuid,
  p_content text,
  p_target_duration integer,
  p_instruction text default null,
  p_change_summary text default null,
  p_estimated_duration integer default null
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_script public.scripts;
  new_version public.script_versions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_title)) < 1 or char_length(trim(p_title)) > 160 then
    raise exception 'invalid title';
  end if;
  if char_length(trim(p_content)) < 20 or char_length(p_content) > 20000 then
    raise exception 'invalid generated content';
  end if;
  if p_target_duration < 15 or p_target_duration > 600 then
    raise exception 'invalid target duration';
  end if;

  insert into public.scripts(
    user_id, title, topic_id, target_duration, autosave_content, autosaved_at
  ) values (
    auth.uid(), trim(p_title), p_topic_id, p_target_duration, p_content, now()
  ) returning * into new_script;

  insert into public.script_versions(
    user_id, script_id, version_number, version_type, content,
    optimization_prompt, change_summary, estimated_duration
  ) values (
    auth.uid(), new_script.id, 1, 'ai_generated', p_content,
    p_instruction, p_change_summary, p_estimated_duration
  ) returning * into new_version;

  update public.scripts
  set current_version_id = new_version.id
  where id = new_script.id
  returning * into new_script;

  return jsonb_build_object(
    'script', to_jsonb(new_script),
    'version', to_jsonb(new_version)
  );
end;
$$;

revoke all on function public.create_script_from_ai(
  text, uuid, text, integer, text, text, integer
) from public;
grant execute on function public.create_script_from_ai(
  text, uuid, text, integer, text, text, integer
) to authenticated;

create or replace function public.convert_inspiration_to_topic(
  p_inspiration_id uuid
) returns public.topics
language plpgsql
security invoker
set search_path = public
as $$
declare
  inspiration public.inspirations;
  topic public.topics;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtext(p_inspiration_id::text));

  select * into inspiration
  from public.inspirations
  where id = p_inspiration_id and user_id = auth.uid()
  for update;
  if not found then raise exception 'inspiration not found'; end if;

  select * into topic
  from public.topics
  where inspiration_id = inspiration.id and user_id = auth.uid()
  order by created_at
  limit 1;
  if found then return topic; end if;

  insert into public.topics(
    user_id, inspiration_id, title, angle, keywords, priority, status
  ) values (
    auth.uid(),
    inspiration.id,
    inspiration.title,
    nullif(inspiration.content, ''),
    inspiration.tags,
    3,
    'backlog'
  ) returning * into topic;

  update public.inspirations
  set status = 'converted'
  where id = inspiration.id;

  return topic;
end;
$$;

revoke all on function public.convert_inspiration_to_topic(uuid) from public;
grant execute on function public.convert_inspiration_to_topic(uuid) to authenticated;

-- Strengthen the existing version append function without changing its API.
create or replace function public.append_script_version(
  p_script_id uuid,
  p_parent_version_id uuid,
  p_version_type text,
  p_content text,
  p_optimization_type text default null,
  p_optimization_prompt text default null,
  p_change_summary text default null,
  p_estimated_duration integer default null
) returns public.script_versions
language plpgsql
security invoker
set search_path = public
as $$
declare
  next_number integer;
  new_version public.script_versions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_version_type not in ('manual_edit','ai_generated','ai_optimized','restored') then
    raise exception 'invalid version type';
  end if;
  if char_length(trim(p_content)) < 1 or char_length(p_content) > 20000 then
    raise exception 'invalid version content';
  end if;
  if not exists (
    select 1 from public.scripts where id = p_script_id and user_id = auth.uid()
  ) then
    raise exception 'script not found';
  end if;
  if p_parent_version_id is not null and not exists (
    select 1 from public.script_versions
    where id = p_parent_version_id
      and script_id = p_script_id
      and user_id = auth.uid()
  ) then
    raise exception 'parent version not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_script_id::text));
  select coalesce(max(version_number), 0) + 1 into next_number
  from public.script_versions where script_id = p_script_id;

  insert into public.script_versions(
    user_id, script_id, parent_version_id, version_number, version_type, content,
    optimization_type, optimization_prompt, change_summary, estimated_duration
  ) values (
    auth.uid(), p_script_id, p_parent_version_id, next_number, p_version_type, p_content,
    p_optimization_type, p_optimization_prompt, p_change_summary, p_estimated_duration
  ) returning * into new_version;

  update public.scripts
  set current_version_id = new_version.id,
      autosave_content = p_content,
      autosaved_at = now()
  where id = p_script_id;

  return new_version;
end;
$$;

revoke all on function public.create_script_with_draft(text, uuid, text, integer) from public;
revoke all on function public.append_script_version(
  uuid, uuid, text, text, text, text, text, integer
) from public;
grant execute on function public.create_script_with_draft(text, uuid, text, integer) to authenticated;
grant execute on function public.append_script_version(
  uuid, uuid, text, text, text, text, text, integer
) to authenticated;
