-- Access trigger rows through JSONB so one generic trigger function can safely
-- validate tables that do not share the same foreign-key columns.
create or replace function public.assert_owned_references()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  row_data jsonb := to_jsonb(new);
  row_user_id uuid := nullif(row_data ->> 'user_id', '')::uuid;
begin
  if row_user_id is null then
    raise exception 'user_id is required';
  end if;

  if tg_table_name = 'topics' then
    if nullif(row_data ->> 'inspiration_id', '') is not null
      and not exists (
        select 1 from public.inspirations
        where id = (row_data ->> 'inspiration_id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'inspiration does not belong to user';
    end if;

  elsif tg_table_name = 'scripts' then
    if nullif(row_data ->> 'topic_id', '') is not null
      and not exists (
        select 1 from public.topics
        where id = (row_data ->> 'topic_id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'topic does not belong to user';
    end if;

    if nullif(row_data ->> 'current_version_id', '') is not null
      and not exists (
        select 1 from public.script_versions
        where id = (row_data ->> 'current_version_id')::uuid
          and script_id = (row_data ->> 'id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'current version does not belong to script';
    end if;

  elsif tg_table_name = 'script_versions' then
    if not exists (
      select 1 from public.scripts
      where id = (row_data ->> 'script_id')::uuid
        and user_id = row_user_id
    )
    then
      raise exception 'script does not belong to user';
    end if;

    if nullif(row_data ->> 'parent_version_id', '') is not null
      and not exists (
        select 1 from public.script_versions
        where id = (row_data ->> 'parent_version_id')::uuid
          and script_id = (row_data ->> 'script_id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'parent version does not belong to script';
    end if;

  elsif tg_table_name = 'benchmark_accounts' then
    if not exists (
      select 1 from public.benchmark_sources
      where id = (row_data ->> 'source_id')::uuid
        and user_id = row_user_id
    )
    then
      raise exception 'benchmark source does not belong to user';
    end if;

  elsif tg_table_name = 'benchmark_videos' then
    if not exists (
      select 1 from public.benchmark_sources
      where id = (row_data ->> 'source_id')::uuid
        and user_id = row_user_id
    )
    then
      raise exception 'benchmark source does not belong to user';
    end if;

    if nullif(row_data ->> 'account_id', '') is not null
      and not exists (
        select 1 from public.benchmark_accounts
        where id = (row_data ->> 'account_id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'benchmark account does not belong to user';
    end if;

  elsif tg_table_name = 'publications' then
    if nullif(row_data ->> 'script_id', '') is not null
      and not exists (
        select 1 from public.scripts
        where id = (row_data ->> 'script_id')::uuid
          and user_id = row_user_id
      )
    then
      raise exception 'script does not belong to user';
    end if;

    if nullif(row_data ->> 'script_version_id', '') is not null
      and not exists (
        select 1 from public.script_versions
        where id = (row_data ->> 'script_version_id')::uuid
          and user_id = row_user_id
          and (
            nullif(row_data ->> 'script_id', '') is null
            or script_id = (row_data ->> 'script_id')::uuid
          )
      )
    then
      raise exception 'script version does not belong to publication script';
    end if;

  elsif tg_table_name = 'metric_snapshots' then
    if not exists (
      select 1 from public.publications
      where id = (row_data ->> 'publication_id')::uuid
        and user_id = row_user_id
    )
    then
      raise exception 'publication does not belong to user';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.assert_owned_references() from public;
