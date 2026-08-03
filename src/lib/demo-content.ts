import type { BenchmarkSource, Inspiration, Script, ScriptVersion, Topic } from "@/lib/types";

const titles = [
  "长大以后才发现，很多关系不是吵散的",
  "人真正开始成熟，是不再急着证明自己",
  "有时候你不是累，只是太久没有为自己活了",
  "不是所有失去，都需要一个解释",
  "成年人最体面的告别，是不再打扰",
  "后来我越来越喜欢那些不需要解释的关系",
] as const;

const ideas = [
  "有些人没有发生矛盾，只是后来谁都没有再主动。",
  "以前总希望别人理解我，后来发现，很多事情自己清楚就够了。",
  "每天都在完成别人期待的事情，却很少问自己真正想要什么。",
  "有些关系走散，不一定是谁做错了，只是彼此走到了不同的地方。",
  "真正的放下，不一定要删除拉黑，而是不再期待对方回应。",
  "真正舒服的关系，不需要反复证明在乎，也不需要猜来猜去。",
] as const;

const angles = [
  "成年人真正的疲惫，往往不是事情多，而是长期忽略自己的感受。",
  "面对结束，有时接受比追问原因更重要。",
  "告别不是说一句再见，而是停止继续消耗自己。",
  "好的关系会让人放松，而不是长期处于自我怀疑。",
] as const;

const drafts = [
  "你有没有过这种感觉，明明也没有做什么特别累的事，但每天醒来都觉得很疲惫。后来我才发现，有时候人不是累，而是太久没有为自己活了。每天回复消息、完成工作、照顾别人的情绪，好像一直都在做应该做的事，却很少问自己，我今天开不开心，我到底想要什么。真正消耗人的，可能不是忙，而是一直忽略自己的感受。",
  "以前遇到一段关系结束，我总想问清楚为什么。是不是我哪里做得不够好，是不是还能挽回。后来才明白，不是所有失去都有一个清楚的答案。有些人离开，不是因为谁错了，只是你们后来走向了不同的方向。很多时候，真正让人放下的，不是终于问到了答案，而是你接受了这件事不会再有答案。",
  "以前我以为放下一个人，就一定要删除、拉黑，告诉自己再也不联系。后来我发现，真正的放下其实很安静。你没有刻意删掉对方，也没有再去翻他的动态，只是某一天，你突然不再期待他的消息，也不再幻想以后会发生什么。成年人最体面的告别，不是说一句再见，而是从此不再打扰，也不再继续消耗自己。",
  "后来我越来越喜欢那些不需要解释的关系。不需要因为晚回了一条消息，就急着说明自己在忙；不需要反复确认对方是不是生气了；也不需要靠猜测判断自己重不重要。真正舒服的关系，不会让你一直紧张，也不会让你反复怀疑自己。你可以做自己，也相信对方不会因为一点小事就离开。好的关系不是让你更用力，而是让你更放松。",
] as const;

const optimized =
  "后来我越来越珍惜那些不需要反复解释的关系。晚回一条消息，不用急着证明自己没有冷落对方；情绪低落的时候，也不用担心对方会因此离开。真正舒服的关系，不会让你一直猜，不会让你反复确认自己重不重要。它给你的感觉不是紧张，而是安心。你可以做真实的自己，也知道对方不会因为一次沉默、一点情绪，就否定你们之间的一切。好的关系，从来不是让你更小心，而是让你终于可以放松。";

const dates = [
  ["2026-07-24T16:10:00.000Z", "2026-07-24T16:10:00.000Z"],
  ["2026-07-25T16:57:00.000Z", "2026-07-25T18:22:00.000Z"],
  ["2026-07-26T17:10:00.000Z", "2026-07-26T19:10:00.000Z"],
  ["2026-07-27T16:45:00.000Z", "2026-07-27T20:10:00.000Z"],
  ["2026-07-28T16:35:00.000Z", "2026-07-28T21:10:00.000Z"],
  ["2026-07-29T16:30:00.000Z", "2026-07-29T22:10:00.000Z"],
] as const;

const inspirationId = (index: number) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
const topicId = (index: number) => `00000000-0000-4000-8100-${String(index + 1).padStart(12, "0")}`;
const scriptId = (index: number) => `00000000-0000-4000-8200-${String(index + 1).padStart(12, "0")}`;
const versionId = (index: number, version: number) =>
  `00000000-0000-4000-83${String(index).padStart(2, "0")}-${String(version).padStart(12, "0")}`;

export const demoInspirations: Inspiration[] = titles.map((title, index) => ({
  id: inspirationId(index),
  title,
  content: ideas[index],
  tags: [],
  status: index === 0 ? "inbox" : index === 1 ? "developing" : "converted",
  is_demo: true,
  created_at: dates[index][0],
  updated_at: dates[index][1],
}));

export const demoTopics: Topic[] = titles.slice(2).map((title, index) => ({
  id: topicId(index),
  title,
  angle: angles[index],
  audience: null,
  pain_point: null,
  keywords: [],
  priority: index >= 2 ? 2 : 3,
  status: index === 3 ? "completed" : "drafting",
  inspiration_id: inspirationId(index + 2),
  is_demo: true,
  created_at: dates[index + 2][0],
  updated_at: dates[index + 2][1],
}));

export const demoScripts: Script[] = titles.slice(2).map((title, index) => ({
  id: scriptId(index),
  title,
  topic_id: topicId(index),
  status: index === 3 ? "ready" : "drafting",
  target_duration: 60,
  current_version_id: versionId(index, index >= 2 ? 2 : 1),
  autosave_content: index === 3 ? optimized : drafts[index],
  autosaved_at: dates[index + 2][1],
  is_demo: true,
  created_at: dates[index + 2][0],
  updated_at: dates[index + 2][1],
}));

export const demoVersions: ScriptVersion[] = demoScripts.flatMap((script, index) => {
  const rough: ScriptVersion = {
    id: versionId(index, 1),
    script_id: script.id,
    parent_version_id: null,
    version_number: 1,
    version_type: "rough_draft",
    content: drafts[index],
    optimization_type: null,
    optimization_prompt: null,
    change_summary: null,
    estimated_duration: 60,
    is_demo: true,
    created_at: dates[index + 2][0],
  };
  if (index < 2) return [rough];
  return [
    rough,
    {
      id: versionId(index, 2),
      script_id: script.id,
      parent_version_id: rough.id,
      version_number: 2,
      version_type: index === 2 ? "manual_edit" : "ai_optimized",
      content: index === 2 ? drafts[index] : optimized,
      optimization_type: index === 3 ? "conversational" : null,
      optimization_prompt: null,
      change_summary: index === 2 ? "文案打磨中" : "增强情绪和个人表达",
      estimated_duration: 60,
      is_demo: true,
      created_at: dates[index + 2][1],
    },
  ];
});

const demoBenchmarkSourceId = "00000000-0000-4000-8400-000000000001";

export const demoBenchmarkSources: BenchmarkSource[] = [{
  id: demoBenchmarkSourceId,
  original_url: "https://v.douyin.com/gZbCoVCW4Io/",
  normalized_url: "https://www.douyin.com/video/7656514231807146353",
  source_type: "video",
  parse_status: "parsed",
  error_message: null,
  parsed_metadata: {
    title: "#伤心大圆啵 #张诗婷",
    description: "#伤心大圆啵 #张诗婷 - 1702409413 于 2026-06-28 发布，公开页面显示已获赞 477.8 万。",
    authorName: "1702409413",
    videoId: "7656514231807146353",
    publishedAt: "2026-06-28",
    likesText: "477.8万",
    keywords: ["伤心大圆啵", "张诗婷"],
  },
  parsed_at: "2026-08-03T08:01:00.000Z",
  created_at: "2026-08-03T08:01:00.000Z",
}];

export const demoBenchmarkVideos = [{
  id: "00000000-0000-4000-8500-000000000001",
  source_id: demoBenchmarkSourceId,
  video_id: "7656514231807146353",
  title: "#伤心大圆啵 #张诗婷",
  description: "1702409413 于 2026-06-28 发布，公开页面显示已获赞 477.8 万。",
  transcript: null,
  author_name: "1702409413",
  cover_url: "https://p3-pc-sign.douyinpic.com/image-cut-tos-priv/03dce98313279450000c5aeb78a85c2a~tplv-dy-resize-origshort-autoq-75:330.jpeg?biz_tag=pcweb_cover&from=327834062&lk3s=138a59ce&s=PackSourceEnum_AWEME_DETAIL&sc=cover&se=false&x-expires=2101104000&x-signature=ICbBD%2BZnS4FFLbHRPGp18apM0jo%3D",
  public_metrics: { likes: 4_778_000, likes_display: "477.8万" },
  published_at: "2026-06-28T00:00:00.000Z",
  ai_analysis: null,
  analysis_depth: null,
  created_at: "2026-08-03T08:01:00.000Z",
}];

export const localDemoRows: Record<string, unknown[]> = {
  inspirations: demoInspirations,
  topics: demoTopics,
  scripts: demoScripts,
  script_versions: demoVersions,
  publications: [],
  metric_snapshots: [],
  benchmark_sources: demoBenchmarkSources,
  benchmark_accounts: [],
  benchmark_videos: demoBenchmarkVideos,
  creator_profiles: [],
};
