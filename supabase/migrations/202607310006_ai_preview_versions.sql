create or replace function public.append_script_version_preview(
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

  return new_version;
end;
$$;

revoke all on function public.append_script_version_preview(
  uuid, uuid, text, text, text, text, text, integer
) from public;
grant execute on function public.append_script_version_preview(
  uuid, uuid, text, text, text, text, text, integer
) to authenticated;
