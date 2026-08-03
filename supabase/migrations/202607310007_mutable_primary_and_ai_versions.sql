create or replace function public.save_script_primary_draft(
  p_script_id uuid,
  p_content text,
  p_estimated_duration integer default null
) returns public.script_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  primary_version public.script_versions;
  next_number integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_content)) < 1 or char_length(p_content) > 20000 then
    raise exception 'invalid version content';
  end if;
  if not exists (
    select 1 from public.scripts where id = p_script_id and user_id = auth.uid()
  ) then
    raise exception 'script not found';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_script_id::text));

  select version.* into primary_version
  from public.scripts as script
  join public.script_versions as version on version.id = script.current_version_id
  where script.id = p_script_id
    and script.user_id = auth.uid()
    and version.version_type in ('rough_draft', 'manual_edit', 'restored')
  limit 1;

  if not found then
    select version.* into primary_version
    from public.script_versions as version
    where version.script_id = p_script_id
      and version.user_id = auth.uid()
      and version.version_type in ('rough_draft', 'manual_edit', 'restored')
    order by version.version_number desc
    limit 1;
  end if;

  if found then
    update public.script_versions
    set content = p_content,
        change_summary = '我的文案已更新',
        estimated_duration = coalesce(p_estimated_duration, estimated_duration)
    where id = primary_version.id
    returning * into primary_version;
  else
    select coalesce(max(version_number), 0) + 1 into next_number
    from public.script_versions where script_id = p_script_id;

    insert into public.script_versions(
      user_id, script_id, parent_version_id, version_number, version_type, content,
      change_summary, estimated_duration
    ) values (
      auth.uid(), p_script_id, null, next_number, 'rough_draft', p_content,
      '我的文案', p_estimated_duration
    ) returning * into primary_version;
  end if;

  update public.scripts
  set current_version_id = primary_version.id,
      autosave_content = p_content,
      autosaved_at = now()
  where id = p_script_id and user_id = auth.uid();

  return primary_version;
end;
$$;

create or replace function public.update_ai_script_version(
  p_version_id uuid,
  p_content text,
  p_estimated_duration integer default null
) returns public.script_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_version public.script_versions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_content)) < 1 or char_length(p_content) > 20000 then
    raise exception 'invalid version content';
  end if;

  update public.script_versions
  set content = p_content,
      estimated_duration = coalesce(p_estimated_duration, estimated_duration)
  where id = p_version_id
    and user_id = auth.uid()
    and version_type = 'ai_optimized'
  returning * into updated_version;

  if not found then raise exception 'AI version not found'; end if;
  return updated_version;
end;
$$;

revoke all on function public.save_script_primary_draft(uuid, text, integer) from public;
revoke all on function public.update_ai_script_version(uuid, text, integer) from public;
grant execute on function public.save_script_primary_draft(uuid, text, integer) to authenticated;
grant execute on function public.update_ai_script_version(uuid, text, integer) to authenticated;
