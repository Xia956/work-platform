create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  positioning text not null default '',
  audience text not null default '',
  persona text not null default '',
  speaking_style text not null default '',
  content_pillars text[] not null default '{}',
  banned_phrases text[] not null default '{}',
  default_duration integer not null default 60 check (default_duration between 15 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  content text not null default '',
  tags text[] not null default '{}',
  status text not null default 'inbox' check (status in ('inbox','developing','converted','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  inspiration_id uuid references public.inspirations(id) on delete set null,
  title text not null,
  angle text,
  audience text,
  pain_point text,
  keywords text[] not null default '{}',
  priority integer not null default 3 check (priority between 1 and 5),
  status text not null default 'backlog' check (status in ('backlog','ready','drafting','completed','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  status text not null default 'drafting' check (status in ('drafting','ready','published','archived')),
  target_duration integer not null default 60 check (target_duration between 15 and 600),
  current_version_id uuid,
  autosave_content text not null default '',
  autosaved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null references public.scripts(id) on delete cascade,
  parent_version_id uuid references public.script_versions(id) on delete set null,
  version_number integer not null check (version_number > 0),
  version_type text not null check (version_type in ('rough_draft','manual_edit','ai_generated','ai_optimized','restored')),
  content text not null check (char_length(content) > 0),
  optimization_type text,
  optimization_prompt text,
  change_summary text,
  estimated_duration integer,
  created_at timestamptz not null default now(),
  unique (script_id, version_number)
);

alter table public.scripts
  add constraint scripts_current_version_fk
  foreign key (current_version_id) references public.script_versions(id) on delete set null;

create table public.benchmark_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_url text not null,
  normalized_url text,
  source_type text not null default 'unknown' check (source_type in ('account','video','unknown')),
  parse_status text not null default 'pending' check (parse_status in ('pending','parsing','parsed','needs_input','failed')),
  error_message text,
  parsed_metadata jsonb not null default '{}'::jsonb,
  parser_version text not null default 'douyin-public-v1',
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index benchmark_source_unique_url
  on public.benchmark_sources(user_id, normalized_url)
  where normalized_url is not null;

create table public.benchmark_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null unique references public.benchmark_sources(id) on delete cascade,
  nickname text,
  douyin_id text,
  avatar_url text,
  bio text,
  profile_url text,
  follower_count bigint,
  user_overrides jsonb not null default '{}'::jsonb,
  field_sources jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.benchmark_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null unique references public.benchmark_sources(id) on delete cascade,
  account_id uuid references public.benchmark_accounts(id) on delete set null,
  video_id text,
  title text,
  description text,
  transcript text,
  author_name text,
  cover_url text,
  published_at timestamptz,
  duration integer,
  public_metrics jsonb not null default '{}'::jsonb,
  user_overrides jsonb not null default '{}'::jsonb,
  field_sources jsonb not null default '{}'::jsonb,
  ai_analysis jsonb,
  analysis_depth text check (analysis_depth in ('basic','full')),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid references public.scripts(id) on delete set null,
  script_version_id uuid references public.script_versions(id) on delete set null,
  title text not null,
  video_url text,
  published_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  publication_id uuid not null references public.publications(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  comments bigint not null default 0 check (comments >= 0),
  shares bigint not null default 0 check (shares >= 0),
  favorites bigint not null default 0 check (favorites >= 0),
  followers_gained integer not null default 0,
  completion_rate numeric(6,3) check (completion_rate between 0 and 100),
  avg_watch_time numeric(10,2) check (avg_watch_time >= 0),
  created_at timestamptz not null default now()
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_type text not null,
  entity_type text not null,
  entity_id uuid,
  status text not null default 'running' check (status in ('running','completed','failed')),
  model text not null,
  request_summary text,
  result jsonb,
  error_message text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index inspirations_user_status_idx on public.inspirations(user_id, status, created_at desc);
create index topics_user_status_idx on public.topics(user_id, status, created_at desc);
create index scripts_user_status_idx on public.scripts(user_id, status, created_at desc);
create index script_versions_script_idx on public.script_versions(script_id, version_number desc);
create index benchmark_sources_user_status_idx on public.benchmark_sources(user_id, parse_status, created_at desc);
create index publications_user_date_idx on public.publications(user_id, published_at desc);
create index metric_snapshots_publication_idx on public.metric_snapshots(publication_id, recorded_at desc);
create index ai_runs_user_created_idx on public.ai_runs(user_id, created_at desc);

create trigger creator_profiles_updated before update on public.creator_profiles
for each row execute function public.set_updated_at();
create trigger inspirations_updated before update on public.inspirations
for each row execute function public.set_updated_at();
create trigger topics_updated before update on public.topics
for each row execute function public.set_updated_at();
create trigger scripts_updated before update on public.scripts
for each row execute function public.set_updated_at();
create trigger benchmark_sources_updated before update on public.benchmark_sources
for each row execute function public.set_updated_at();
create trigger benchmark_accounts_updated before update on public.benchmark_accounts
for each row execute function public.set_updated_at();
create trigger benchmark_videos_updated before update on public.benchmark_videos
for each row execute function public.set_updated_at();
create trigger publications_updated before update on public.publications
for each row execute function public.set_updated_at();

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'creator_profiles','inspirations','topics','scripts','script_versions',
    'benchmark_sources','benchmark_accounts','benchmark_videos','publications',
    'metric_snapshots','ai_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy "own rows select" on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy "own rows insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy "own rows update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name
    );
    execute format(
      'create policy "own rows delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name
    );
  end loop;
end $$;

create or replace function public.create_script_with_draft(
  p_title text,
  p_topic_id uuid,
  p_content text,
  p_target_duration integer
) returns public.scripts
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_script public.scripts;
  new_version public.script_versions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if char_length(trim(p_content)) < 10 then raise exception 'draft too short'; end if;

  insert into public.scripts(user_id, title, topic_id, target_duration, autosave_content, autosaved_at)
  values (auth.uid(), trim(p_title), p_topic_id, p_target_duration, p_content, now())
  returning * into new_script;

  insert into public.script_versions(
    user_id, script_id, version_number, version_type, content, estimated_duration
  ) values (
    auth.uid(), new_script.id, 1, 'rough_draft', p_content, p_target_duration
  ) returning * into new_version;

  update public.scripts set current_version_id = new_version.id where id = new_script.id
  returning * into new_script;
  return new_script;
end;
$$;

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
  if not exists(select 1 from public.scripts where id = p_script_id and user_id = auth.uid()) then
    raise exception 'script not found';
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

  update public.scripts set current_version_id = new_version.id where id = p_script_id;
  return new_version;
end;
$$;

grant execute on function public.create_script_with_draft(text, uuid, text, integer) to authenticated;
grant execute on function public.append_script_version(uuid, uuid, text, text, text, text, text, integer) to authenticated;
