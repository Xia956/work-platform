-- Demo rows are explicitly tagged so they can be safely replaced or removed
-- without touching user-created content.
alter table public.inspirations add column if not exists is_demo boolean not null default false;
alter table public.topics add column if not exists is_demo boolean not null default false;
alter table public.scripts add column if not exists is_demo boolean not null default false;
alter table public.script_versions add column if not exists is_demo boolean not null default false;

create index if not exists inspirations_user_demo_idx
  on public.inspirations(user_id, is_demo, created_at desc);
create index if not exists topics_user_demo_idx
  on public.topics(user_id, is_demo, created_at desc);
create index if not exists scripts_user_demo_idx
  on public.scripts(user_id, is_demo, created_at desc);

create or replace function public.replace_my_demo_content()
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  inspiration_id uuid;
  topic_id uuid;
  script_id uuid;
  rough_version_id uuid;
  final_version_id uuid;
  base_time timestamptz := timestamptz '2026-07-24 09:10:00-07';
begin
  if owner_id is null then
    raise exception 'authentication required';
  end if;

  -- Delete only explicitly tagged demo data. Foreign-key order preserves all
  -- real rows and allows this function to be rerun without duplication.
  delete from public.scripts where user_id = owner_id and is_demo;
  delete from public.topics where user_id = owner_id and is_demo;
  delete from public.inspirations where user_id = owner_id and is_demo;

  -- 1. Inspiration only
  inspiration_id := md5(owner_id::text || ':life-demo:01')::uuid;
  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id,
    owner_id,
    '长大以后才发现，很多关系不是吵散的',
    '有些人没有发生矛盾，只是后来谁都没有再主动。',
    array['关系', '成长'],
    'inbox',
    true,
    base_time,
    base_time
  );

  -- 2. Inspiration developing
  inspiration_id := md5(owner_id::text || ':life-demo:02')::uuid;
  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id,
    owner_id,
    '人真正开始成熟，是不再急着证明自己',
    '以前总希望别人理解我，后来发现，很多事情自己清楚就够了。',
    array['成熟', '自我'],
    'developing',
    true,
    base_time + interval '1 day 47 minutes',
    base_time + interval '1 day 2 hours 12 minutes'
  );

  -- 3. Rough draft, waiting to be polished
  inspiration_id := md5(owner_id::text || ':life-demo:03:i')::uuid;
  topic_id := md5(owner_id::text || ':life-demo:03:t')::uuid;
  script_id := md5(owner_id::text || ':life-demo:03:s')::uuid;
  rough_version_id := md5(owner_id::text || ':life-demo:03:v1')::uuid;

  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id, owner_id,
    '有时候你不是累，只是太久没有为自己活了',
    '每天都在完成别人期待的事情，却很少问自己真正想要什么。',
    array['疲惫', '自我感受'], 'converted', true,
    base_time + interval '2 days 1 hour',
    base_time + interval '2 days 3 hours'
  );
  insert into public.topics(
    id, user_id, inspiration_id, title, angle, keywords, priority, status,
    is_demo, created_at, updated_at
  ) values (
    topic_id, owner_id, inspiration_id,
    '有时候你不是累，只是太久没有为自己活了',
    '成年人真正的疲惫，往往不是事情多，而是长期忽略自己的感受。',
    array['成年人', '情绪消耗'], 3, 'drafting', true,
    base_time + interval '2 days 1 hour 20 minutes',
    base_time + interval '2 days 3 hours'
  );
  insert into public.scripts(
    id, user_id, topic_id, title, status, target_duration, current_version_id,
    autosave_content, autosaved_at, is_demo, created_at, updated_at
  ) values (
    script_id, owner_id, topic_id,
    '有时候你不是累，只是太久没有为自己活了',
    'drafting', 60, null,
    '你有没有过这种感觉，明明也没有做什么特别累的事，但每天醒来都觉得很疲惫。后来我才发现，有时候人不是累，而是太久没有为自己活了。每天回复消息、完成工作、照顾别人的情绪，好像一直都在做应该做的事，却很少问自己，我今天开不开心，我到底想要什么。真正消耗人的，可能不是忙，而是一直忽略自己的感受。',
    base_time + interval '2 days 3 hours', true,
    base_time + interval '2 days 2 hours',
    base_time + interval '2 days 3 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, version_number, version_type, content,
    estimated_duration, is_demo, created_at
  ) values (
    rough_version_id, owner_id, script_id, 1, 'rough_draft',
    '你有没有过这种感觉，明明也没有做什么特别累的事，但每天醒来都觉得很疲惫。后来我才发现，有时候人不是累，而是太久没有为自己活了。每天回复消息、完成工作、照顾别人的情绪，好像一直都在做应该做的事，却很少问自己，我今天开不开心，我到底想要什么。真正消耗人的，可能不是忙，而是一直忽略自己的感受。',
    60, true, base_time + interval '2 days 2 hours'
  );
  update public.scripts set current_version_id = rough_version_id where id = script_id;

  -- 4. Rough draft, waiting for AI optimization
  inspiration_id := md5(owner_id::text || ':life-demo:04:i')::uuid;
  topic_id := md5(owner_id::text || ':life-demo:04:t')::uuid;
  script_id := md5(owner_id::text || ':life-demo:04:s')::uuid;
  rough_version_id := md5(owner_id::text || ':life-demo:04:v1')::uuid;

  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id, owner_id,
    '不是所有失去，都需要一个解释',
    '有些关系走散，不一定是谁做错了，只是彼此走到了不同的地方。',
    array['失去', '释怀'], 'converted', true,
    base_time + interval '3 days 35 minutes',
    base_time + interval '3 days 4 hours'
  );
  insert into public.topics(
    id, user_id, inspiration_id, title, angle, keywords, priority, status,
    is_demo, created_at, updated_at
  ) values (
    topic_id, owner_id, inspiration_id,
    '不是所有失去，都需要一个解释',
    '面对结束，有时接受比追问原因更重要。',
    array['关系结束', '接受'], 3, 'drafting', true,
    base_time + interval '3 days 1 hour',
    base_time + interval '3 days 4 hours'
  );
  insert into public.scripts(
    id, user_id, topic_id, title, status, target_duration, current_version_id,
    autosave_content, autosaved_at, is_demo, created_at, updated_at
  ) values (
    script_id, owner_id, topic_id,
    '不是所有失去，都需要一个解释',
    'drafting', 60, null,
    '以前遇到一段关系结束，我总想问清楚为什么。是不是我哪里做得不够好，是不是还能挽回。后来才明白，不是所有失去都有一个清楚的答案。有些人离开，不是因为谁错了，只是你们后来走向了不同的方向。很多时候，真正让人放下的，不是终于问到了答案，而是你接受了这件事不会再有答案。',
    base_time + interval '3 days 4 hours', true,
    base_time + interval '3 days 2 hours',
    base_time + interval '3 days 4 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, version_number, version_type, content,
    estimated_duration, is_demo, created_at
  ) values (
    rough_version_id, owner_id, script_id, 1, 'rough_draft',
    '以前遇到一段关系结束，我总想问清楚为什么。是不是我哪里做得不够好，是不是还能挽回。后来才明白，不是所有失去都有一个清楚的答案。有些人离开，不是因为谁错了，只是你们后来走向了不同的方向。很多时候，真正让人放下的，不是终于问到了答案，而是你接受了这件事不会再有答案。',
    60, true, base_time + interval '3 days 2 hours'
  );
  update public.scripts set current_version_id = rough_version_id where id = script_id;

  -- 5. Manual polishing in progress; the AI-optimized version is intentionally empty.
  inspiration_id := md5(owner_id::text || ':life-demo:05:i')::uuid;
  topic_id := md5(owner_id::text || ':life-demo:05:t')::uuid;
  script_id := md5(owner_id::text || ':life-demo:05:s')::uuid;
  rough_version_id := md5(owner_id::text || ':life-demo:05:v1')::uuid;
  final_version_id := md5(owner_id::text || ':life-demo:05:v2')::uuid;

  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id, owner_id,
    '成年人最体面的告别，是不再打扰',
    '真正的放下，不一定要删除拉黑，而是不再期待对方回应。',
    array['告别', '放下'], 'converted', true,
    base_time + interval '4 days 25 minutes',
    base_time + interval '4 days 5 hours'
  );
  insert into public.topics(
    id, user_id, inspiration_id, title, angle, keywords, priority, status,
    is_demo, created_at, updated_at
  ) values (
    topic_id, owner_id, inspiration_id,
    '成年人最体面的告别，是不再打扰',
    '告别不是说一句再见，而是停止继续消耗自己。',
    array['成年人', '告别'], 2, 'drafting', true,
    base_time + interval '4 days 1 hour',
    base_time + interval '4 days 5 hours'
  );
  insert into public.scripts(
    id, user_id, topic_id, title, status, target_duration, current_version_id,
    autosave_content, autosaved_at, is_demo, created_at, updated_at
  ) values (
    script_id, owner_id, topic_id,
    '成年人最体面的告别，是不再打扰',
    'drafting', 60, null,
    '以前我以为放下一个人，就一定要删除、拉黑，告诉自己再也不联系。后来我发现，真正的放下其实很安静。你没有刻意删掉对方，也没有再去翻他的动态，只是某一天，你突然不再期待他的消息，也不再幻想以后会发生什么。成年人最体面的告别，不是说一句再见，而是从此不再打扰，也不再继续消耗自己。',
    base_time + interval '4 days 5 hours', true,
    base_time + interval '4 days 2 hours',
    base_time + interval '4 days 5 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, version_number, version_type, content,
    estimated_duration, is_demo, created_at
  ) values (
    rough_version_id, owner_id, script_id, 1, 'rough_draft',
    '以前我以为放下一个人，就一定要删除、拉黑，告诉自己再也不联系。后来我发现，真正的放下其实很安静。你没有刻意删掉对方，也没有再去翻他的动态，只是某一天，你突然不再期待他的消息，也不再幻想以后会发生什么。成年人最体面的告别，不是说一句再见，而是从此不再打扰，也不再继续消耗自己。',
    60, true, base_time + interval '4 days 2 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, parent_version_id, version_number, version_type,
    content, change_summary, estimated_duration, is_demo, created_at
  ) values (
    final_version_id, owner_id, script_id, rough_version_id, 2, 'manual_edit',
    '以前我以为放下一个人，就一定要删除、拉黑，告诉自己再也不联系。后来我发现，真正的放下其实很安静。你没有刻意删掉对方，也没有再去翻他的动态，只是某一天，你突然不再期待他的消息，也不再幻想以后会发生什么。成年人最体面的告别，不是说一句再见，而是从此不再打扰，也不再继续消耗自己。',
    '文案打磨中', 60, true, base_time + interval '4 days 5 hours'
  );
  update public.scripts set current_version_id = final_version_id where id = script_id;

  -- 6. AI optimized and ready to publish
  inspiration_id := md5(owner_id::text || ':life-demo:06:i')::uuid;
  topic_id := md5(owner_id::text || ':life-demo:06:t')::uuid;
  script_id := md5(owner_id::text || ':life-demo:06:s')::uuid;
  rough_version_id := md5(owner_id::text || ':life-demo:06:v1')::uuid;
  final_version_id := md5(owner_id::text || ':life-demo:06:v2')::uuid;

  insert into public.inspirations(
    id, user_id, title, content, tags, status, is_demo, created_at, updated_at
  ) values (
    inspiration_id, owner_id,
    '后来我越来越喜欢那些不需要解释的关系',
    '真正舒服的关系，不需要反复证明在乎，也不需要猜来猜去。',
    array['关系', '安全感'], 'converted', true,
    base_time + interval '5 days 20 minutes',
    base_time + interval '5 days 6 hours'
  );
  insert into public.topics(
    id, user_id, inspiration_id, title, angle, keywords, priority, status,
    is_demo, created_at, updated_at
  ) values (
    topic_id, owner_id, inspiration_id,
    '后来我越来越喜欢那些不需要解释的关系',
    '好的关系会让人放松，而不是长期处于自我怀疑。',
    array['舒服的关系', '自我怀疑'], 2, 'completed', true,
    base_time + interval '5 days 1 hour',
    base_time + interval '5 days 6 hours'
  );
  insert into public.scripts(
    id, user_id, topic_id, title, status, target_duration, current_version_id,
    autosave_content, autosaved_at, is_demo, created_at, updated_at
  ) values (
    script_id, owner_id, topic_id,
    '后来我越来越喜欢那些不需要解释的关系',
    'ready', 60, null,
    '后来我越来越珍惜那些不需要反复解释的关系。晚回一条消息，不用急着证明自己没有冷落对方；情绪低落的时候，也不用担心对方会因此离开。真正舒服的关系，不会让你一直猜，不会让你反复确认自己重不重要。它给你的感觉不是紧张，而是安心。你可以做真实的自己，也知道对方不会因为一次沉默、一点情绪，就否定你们之间的一切。好的关系，从来不是让你更小心，而是让你终于可以放松。',
    base_time + interval '5 days 6 hours', true,
    base_time + interval '5 days 2 hours',
    base_time + interval '5 days 6 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, version_number, version_type, content,
    estimated_duration, is_demo, created_at
  ) values (
    rough_version_id, owner_id, script_id, 1, 'rough_draft',
    '后来我越来越喜欢那些不需要解释的关系。不需要因为晚回了一条消息，就急着说明自己在忙；不需要反复确认对方是不是生气了；也不需要靠猜测判断自己重不重要。真正舒服的关系，不会让你一直紧张，也不会让你反复怀疑自己。你可以做自己，也相信对方不会因为一点小事就离开。好的关系不是让你更用力，而是让你更放松。',
    60, true, base_time + interval '5 days 2 hours'
  );
  insert into public.script_versions(
    id, user_id, script_id, parent_version_id, version_number, version_type,
    content, optimization_type, change_summary, estimated_duration, is_demo,
    created_at
  ) values (
    final_version_id, owner_id, script_id, rough_version_id, 2, 'ai_optimized',
    '后来我越来越珍惜那些不需要反复解释的关系。晚回一条消息，不用急着证明自己没有冷落对方；情绪低落的时候，也不用担心对方会因此离开。真正舒服的关系，不会让你一直猜，不会让你反复确认自己重不重要。它给你的感觉不是紧张，而是安心。你可以做真实的自己，也知道对方不会因为一次沉默、一点情绪，就否定你们之间的一切。好的关系，从来不是让你更小心，而是让你终于可以放松。',
    'conversational', '增强情绪和个人表达', 60, true,
    base_time + interval '5 days 6 hours'
  );
  update public.scripts set current_version_id = final_version_id where id = script_id;

  return jsonb_build_object(
    'inspirations', 6,
    'topics', 4,
    'scripts', 4,
    'versions', 6
  );
end;
$$;

revoke all on function public.replace_my_demo_content() from public;
grant execute on function public.replace_my_demo_content() to authenticated;
