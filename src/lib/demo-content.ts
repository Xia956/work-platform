import type { BenchmarkSource, Inspiration, Publication, Script, ScriptVersion, Topic } from "@/lib/types";

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

const demoShareScriptId = "00000000-0000-4000-8200-000000000007";
const demoShareVersionId = "00000000-0000-4000-8300-000000000007";
const demoShareScriptContent = "我好像终于知道青春到底是什么了,大家为什么如此的怀念青春了。就前几天是我自大学之后第一次时隔这么多年,因为喝酒而熬通宵,熬穿了。因为遇到了同样一群年轻且疯狂的朋友,我们就唠嗑,喝酒,一直到太阳升起,天色蒙蒙亮,然后去吃了早餐。这件事情已经很久没有发生过了。之前出去玩,大家好像都还保留了一丝理智,就是到点了,差不多了,就各回各家了,第二天都还有各自的事情要忙。就在这一次,我突然意识到,可能这大概就是青春吧。我觉得青春就是允许时间毫无意义地度过,允许时间被荒废,被虚度。和长大之后我们开始要求每一分钟都要有意义,每一分每一秒都需要被定义,都要有价值,否则我们就会感到焦虑。因为我们有太多的事情需要完成。人们总说在什么年纪就该干什么样的事,好像只有在青春这个年纪,人们应该做的事,它是可以是虚度光阴的,是可以是浪费时间的。";

export const demoShareScript: Script = {
  id: demoShareScriptId,
  title: "同时拥有青春和对青春的感受",
  topic_id: null,
  status: "published",
  target_duration: 90,
  current_version_id: demoShareVersionId,
  autosave_content: demoShareScriptContent,
  autosaved_at: "2026-06-18T19:00:00.000Z",
  is_demo: true,
  created_at: "2026-06-18T19:00:00.000Z",
  updated_at: "2026-06-18T19:00:00.000Z",
};

export const demoShareVersion: ScriptVersion = {
  id: demoShareVersionId,
  script_id: demoShareScriptId,
  parent_version_id: null,
  version_number: 1,
  version_type: "manual_edit",
  content: demoShareScriptContent,
  optimization_type: null,
  optimization_prompt: null,
  change_summary: "用户提供的实际发布文案",
  estimated_duration: 90,
  is_demo: true,
  created_at: "2026-06-18T19:00:00.000Z",
};

const benchmarkSourceIds = {
  selfBelief: "00000000-0000-4000-8400-000000000001",
  creatorReview: "00000000-0000-4000-8400-000000000002",
  account: "00000000-0000-4000-8400-000000000003",
} as const;

export const demoBenchmarkSources: BenchmarkSource[] = [
  {
    id: benchmarkSourceIds.selfBelief,
    original_url: "7.64 复制打开抖音，看看【静静会飞的作品】要发自内心的觉得自己很厉害 # 女性力量 # 女性... https://v.douyin.com/5JsYlYiGTCU/ t@E.Hi :2pm ZZM:/ 12/09",
    normalized_url: "https://v.douyin.com/5JsYlYiGTCU/",
    source_type: "video",
    parse_status: "parsed",
    error_message: null,
    parsed_metadata: {
      title: "要发自内心地觉得自己很厉害",
      authorName: "静静会飞",
      keywords: ["女性力量", "自我肯定", "独立成长"],
      dataOrigin: "用户提供的测试文本，未调用外部解析接口",
    },
    parsed_at: "2026-08-03T20:10:00.000Z",
    created_at: "2026-08-03T20:10:00.000Z",
  },
  {
    id: benchmarkSourceIds.creatorReview,
    original_url: "5.89 复制打开抖音，看看【大酱种的作品】@陈星越喊我拍视频之30条垃圾已完成 # 陈星越掏... https://v.douyin.com/NmP9V_042Mk/ 06/28 :9pm p@d.NJ rre:/",
    normalized_url: "https://v.douyin.com/NmP9V_042Mk/",
    source_type: "video",
    parse_status: "parsed",
    error_message: null,
    parsed_metadata: {
      title: "拍满 30 条视频后，我与我周旋久，宁做我",
      authorName: "大酱种",
      keywords: ["创作复盘", "自媒体成长", "做自己"],
      dataOrigin: "用户提供的测试文本，未调用外部解析接口",
    },
    parsed_at: "2026-08-03T20:06:00.000Z",
    created_at: "2026-08-03T20:06:00.000Z",
  },
  {
    id: benchmarkSourceIds.account,
    original_url: "7- 长按复制此条消息，打开抖音搜索，查看TA的更多作品。 https://v.douyin.com/NOed6rTPvxU/ 3@1.com :2pm",
    normalized_url: "https://v.douyin.com/NOed6rTPvxU/",
    source_type: "account",
    parse_status: "needs_input",
    error_message: "测试样本仅提供了账号主页链接，未提供昵称、简介或作品信息。",
    parsed_metadata: {
      title: "待补充的对标账号",
      dataOrigin: "用户提供的主页链接，未调用外部解析接口",
    },
    parsed_at: null,
    created_at: "2026-08-03T20:02:00.000Z",
  },
];

export const demoBenchmarkVideos = [
  {
    id: "00000000-0000-4000-8500-000000000001",
    source_id: benchmarkSourceIds.selfBelief,
    video_id: null,
    title: "要发自内心地觉得自己很厉害",
    description: "用连续的自我肯定把情绪从“可怜与依赖”推向“强大与自立”。",
    transcript: "你一定要反反复复的告诉自己，你要发自内心的觉得自己很厉害，我的潜力无比强大，我什么都能做到。就别觉得自己很可怜，知道吗？你老觉得自己很可怜，你就想要依赖别人，这个世界上唯一能依靠的只有我们自己。",
    author_name: "静静会飞",
    cover_url: null,
    public_metrics: {},
    published_at: null,
    ai_analysis: {
      summary: "这是一条高浓度的自我赋能口播。它先用重复命令建立信念，再点破“自怜会导向依赖”的心理链路，最后落到“依靠自己”的价值判断，短、直接、容易形成情绪共振。",
      hook: "你一定要反反复复地告诉自己，你要发自内心地觉得自己很厉害。",
      reusablePatterns: [
        "用“你一定要”直接下判断，第一秒就建立态度。",
        "连续三句自我肯定形成递进，提升语言节奏与记忆点。",
        "用“自怜 → 依赖别人”解释问题，再给出“依靠自己”的出口。",
      ],
      topicIdeas: [
        "停止等待别人肯定后，一个人会发生什么变化",
        "高敏感女生如何建立稳定的自我评价",
        "真正的女性力量，不是逞强而是相信自己",
      ],
      missingInformation: ["未提供发布日期与公开互动数据，结论只基于口播文本。"],
    },
    analysis_depth: "full" as const,
    created_at: "2026-08-03T20:10:00.000Z",
  },
  {
    id: "00000000-0000-4000-8500-000000000002",
    source_id: benchmarkSourceIds.creatorReview,
    video_id: null,
    title: "拍满 30 条视频后，我与我周旋久，宁做我",
    description: "从 30 天涨粉六千的结果出发，复盘小聪明、模仿焦虑与重新做自己的过程。",
    transcript: `我在陈星越教我拍视频的这个话题里拍了三十天，涨粉了六千加。我不知道这个成绩能不能拿到一个结业证书，但是我的确做到了先拍起来，和不断订正自己、审视自己，这一点已经形成了一个动作连续性。

其实在我第一天发布视频的时候，我就想好了，第三十天的时候我一定要做一个总结性发言，或是慷慨激昂的，或是感恩感谢，亦或是垂头丧气的，假装自己完全不在意然后潇洒离场。但是真的连续更新三十天之后，我发现这一刻我没有任何能说的总结性发言。因为在互联网这场盛大的宴会上，我甚至连围观的资格都没有，更别提拿到所谓的入场券。当下的我只是听到了宴会中传来优雅的交响乐和一阵阵松弛的笑声。我目前处在的阶段就是，我刚走到宴会大厅门外，想要踏入这场流光溢彩时，被别人要求出示请柬一样窘迫。我能想象得到那道门里的觥筹交错，甚至开始幻想自己跻身于这场华丽宴会时的样子。之所以能幻想，是因为我真的走到了宴会门外。但你要我去总结这场宴会的体验感，不好意思，我没有拿到请柬，所以我说不出来一套像样的总结性发言。

但是这三十天让我找到了我最开始写小说的感觉，就是虽然我不知道前途在哪里，但是我知道此时此刻我正站在前途里。不知道为什么，我就是知道我的文字会被人喜欢，会有人看。这可能源于我的聪明，我不自谦的时候，我确实很聪明。因为我看一遍小说榜靠前的书名及简介，我就立刻知道这个平台受众群体是更喜欢哪类小说，然后我就可以去写一本这样的书，最后取得一个不错的成绩。

但很遗憾，我的聪明就只是一些小聪明。所以在自媒体上，靠小聪明的我快速取得了一些小结果，但也就仅限于此。比如说我的第一条视频，其实我做这个账号第一选择就是做口播，因为我非常清晰自己的优势。我有不错的文字功底，我是高敏感人格，我有更好的共情能力，加上我自己知道我自己的优势就是不错的语言组织能力。所以我说我太知道自己的底牌是什么了。但我的小聪明告诉我自己，这样带着底牌上牌桌可能会适得其反，所以我故作愚钝，用诙谐反讽的方式向观众们求助，让大家对我放下戒备心，让大家对我来品头论足、来指点。数据证明我的第一条作品小爆了。我的小聪明起作用了，但我的这份小聪明也限制住了我。可能原本我会以一个更有深度、更有语言魅力的博主形象出现在观众面前，或许那样的我数据会更漂亮，但没办法，我就是一个总爱耍小聪明的人。

当然同样和我一样爱耍小聪明的人也不少，甚至手段更拙劣于我。他们将模仿爆款视频视若神明，将找对标账号封为铁律，尝到了一点数据甜头后更为疯狂，殊不知这是一场饮鸩止渴。为什么对待这类人的措辞我如此犀利？因为我曾经也这样做过。我凿壁偷光的勤学苦练，就在我想歌颂自己如此努力的时候，我发现凿壁偷光在我这并不是一个形容人勤勉好学的褒义词，而是我扒开别人的墙壁，试图将他人之光镀在自己身上，仿佛就能得到墙壁另外一侧的所有好光景。但我错了，画虎画皮难画骨。好在我在关键时刻收起我的小聪明，隐藏了那几条时至今日想起来都令我十分汗颜的视频，也就是这个账号的前身，然后重新拿起手机拍起了一条属于我自己的视频。这一次我不再模仿任何人，我只做我自己。

但是新的问题又出现了，我开始焦虑、开始质疑。看着很多同类口播博主的优秀和成绩，让我有一瞬间想注销这个账号。对没错，我不想自己过于努力的姿态被这三十条视频记录下来。因为和我同样赛道的博主对比，我的数据让我的努力看起来非常心酸，心酸到我自卑痛苦，甚至袭来滔天的恨意。都说苦难是滋养文学的温床，我甚至开始恨自己为什么没有一个天崩开局的人生，这样我就能有更多的伤痛、更多的伤疤揭给世人看。

不过为什么我还是接纳了自己，以这样的姿态开启了我的第三十条视频呢？是因为我这三十天里遇见的每一个人。庆幸我这三十天里没有收到过一条带有抨击和打击性的评论或私信。这也是我做自媒体时，认为上天无时无刻不在拿皮鞭抽我的时候，我发现老天爷竟然还给皮鞭沾了碘伏，边打边消毒。

以前我在当观众的时候是很吝啬的，有的时候我手滑不小心给哪个视频点赞，我都赶紧取消。这是我成为创作者时最为羞愧难当的点。因为我遇见的你们，是比我慷慨百倍的天使，你们从不吝啬对我的作品点赞夸奖，这也成为了我没有羞愤注销这个账号的最大动力。

然后我就在镜子面前审视我自己，在互联网这场盛大晚宴上，我到底要充当一个什么角色。忽然我想起一句话：我与我周旋久，宁做我。一杯酒，送给同样迷茫的朋友。`,
    author_name: "大酱种",
    cover_url: null,
    public_metrics: {},
    published_at: null,
    ai_analysis: {
      summary: "这是一篇以“30 天挑战复盘”为外壳的创作者身份宣言。内容从可量化结果切入，经由“宴会门外”的处境隐喻，逐层自剖小聪明、模仿、焦虑与羞耻，最后把观众的善意转化为继续创作的理由，收束到“宁做我”。",
      hook: "我拍了三十天，涨粉六千加，但我说不出一套像样的总结性发言。",
      reusablePatterns: [
        "先报出“30 天、6000 粉”的具体结果，再用反预期转折制造继续听的理由。",
        "用同一个“互联网晚宴”隐喻贯穿处境、欲望与身份追问，统一长文结构。",
        "主动暴露小聪明、自卑与嫉妒，让人物不是成功模板，而是可信的成长主体。",
        "结尾回扣开头的总结命题，并用一句古语形成可传播的价值落点。",
      ],
      topicIdeas: [
        "连续更新 30 天，真正改变我的不是数据",
        "模仿爆款为什么只能带来短期结果",
        "看见同行数据后，我如何处理创作羞耻",
        "做自媒体最难的不是坚持，而是承认自己想被看见",
      ],
      missingInformation: ["“涨粉六千加”等数据来自口播自述，未做外部核验。"],
    },
    analysis_depth: "full" as const,
    created_at: "2026-08-03T20:06:00.000Z",
  },
];

export const demoBenchmarkAccounts = [{
  id: "00000000-0000-4000-8600-000000000001",
  source_id: benchmarkSourceIds.account,
  nickname: null,
  douyin_id: null,
  avatar_url: null,
  bio: null,
  profile_url: "https://v.douyin.com/NOed6rTPvxU/",
  follower_count: null,
}];

export const demoSharePublication: Publication = {
  id: "00000000-0000-4000-8700-000000000001",
  title: "同时拥有青春和对青春的感受",
  script_id: demoShareScriptId,
  script_version_id: demoShareVersionId,
  video_url: "https://v.douyin.com/QygLlpR7D7I/",
  published_at: "2026-06-18T19:00:00.000Z",
  notes: `分析边界：仅基于你提供的抖音分享文案，未访问抖音页面，也没有播放或互动数据。

内容判断：这是一个以“青春仍在，却已经能够回望青春”为核心张力的情绪型主题。表达简短、具有矛盾感和金句感，容易触发怀旧、成长和时间流逝相关的个人记忆。

亮点：主题普适，情绪入口明确；“同时拥有”形成稀缺感，适合作为开场钩子；评论区具备讲述个人青春故事的互动空间。

待验证：目前无法判断画面、口播节奏、前 3 秒留存、完播率或真实传播效果，不能把情绪共鸣直接等同于高表现。

下一步：发布后优先记录播放、完播率、收藏率和高频评论。若收藏率突出，可继续测试金句型表达；若评论故事较多，可延展为“你在哪一刻意识到青春正在离开”系列。`,
  is_demo: true,
  review: {
    summary: "尚未录入视频指标，暂不判断表现。文案用一次通宵经历得出“青春允许时间被虚度”的观点，场景真实、主题明确。",
    wins: [
      "通宵喝酒、看日出、吃早餐提供了连续画面，让“青春”不是空泛感慨。",
      "“允许时间毫无意义地度过”是整篇唯一核心观点，容易被记住。",
    ],
    issues: [
      "开头先解释再讲事件，核心观点出现偏晚；需结合跳出率判断钩子是否留人。",
      "结尾停在观点陈述，没有互动问题；需结合完播率和评论率判断收束效果。",
    ],
    hypotheses: [
      "跳出率偏高 → 开头进入故事较慢 → 将核心观点前置后对比跳出率。",
      "完播率尚可但评论率低 → 结尾缺少互动入口 → 增加具体提问后对比评论率。",
      "收藏率高 → 核心观点具有保存价值 → 保留观点句，只调整前后结构验证。",
    ],
    nextActions: [
      "补录跳出率、完播率、平均观看时长和互动数据，建立首个表现基线。",
      "A/B 测试观点前置的开头，唯一观察指标为跳出率。",
      "结尾增加“你上一次痛快浪费时间是什么时候”，观察评论率。",
    ],
    nextTopics: [
      "长大以后，我们为什么害怕浪费时间",
      "成年人偶尔失控一次，为什么会觉得自由",
    ],
  },
  created_at: "2026-08-04T00:00:00.000Z",
};

export const localDemoRows: Record<string, unknown[]> = {
  inspirations: demoInspirations,
  topics: demoTopics,
  scripts: [...demoScripts, demoShareScript],
  script_versions: [...demoVersions, demoShareVersion],
  publications: [demoSharePublication],
  metric_snapshots: [],
  benchmark_sources: demoBenchmarkSources,
  benchmark_accounts: demoBenchmarkAccounts,
  benchmark_videos: demoBenchmarkVideos,
  creator_profiles: [],
};
