import { NextResponse } from "next/server";
import { z } from "zod";
import { aiModel, canStartAiRun, runStructured } from "@/lib/ai";
import { publicAiError, readJson } from "@/lib/api";
import { reviewAnalysisSchema } from "@/lib/ai-schemas";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  publicationId: z.string().uuid().optional(),
  days: z.union([z.literal(7), z.literal(30)]).default(7),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
}).refine((value) => Boolean(value.startDate) === Boolean(value.endDate), {
  message: "自定义日期范围必须完整",
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
  message: "开始日期不能晚于结束日期",
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = inputSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "复盘参数无效" }, { status: 422 });

  let publicationQuery = supabase
    .from("publications")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(100);
  if (parsed.data.publicationId) publicationQuery = publicationQuery.eq("id", parsed.data.publicationId);
  else if (parsed.data.startDate && parsed.data.endDate) {
    publicationQuery = publicationQuery
      .gte("published_at", `${parsed.data.startDate}T00:00:00.000Z`)
      .lte("published_at", `${parsed.data.endDate}T23:59:59.999Z`);
  }
  else {
    const since = new Date(Date.now() - parsed.data.days * 86_400_000).toISOString();
    publicationQuery = publicationQuery.gte("published_at", since);
  }
  const { data: publications } = await publicationQuery;
  if (!publications?.length) return NextResponse.json({ error: "该范围内还没有发布记录" }, { status: 422 });
  const { data: snapshots } = await supabase
    .from("metric_snapshots")
    .select("*")
    .in("publication_id", publications.map((item) => item.id))
    .order("recorded_at", { ascending: true })
    .limit(1_000);
  const versionIds = publications
    .map((item) => item.script_version_id)
    .filter((id): id is string => Boolean(id));
  const { data: publicationVersions } = versionIds.length
    ? await supabase
      .from("script_versions")
      .select("id, script_id, version_number, version_type, content")
      .in("id", versionIds)
    : { data: [] };
  const reviewInputs = publications.map((publication) => ({
    publication,
    publishedCopy: publicationVersions?.find((version) => version.id === publication.script_version_id) ?? null,
    snapshots: (snapshots ?? []).filter((snapshot) => snapshot.publication_id === publication.id),
  }));
  if (!(await canStartAiRun(supabase, auth.user.id))) {
    return NextResponse.json({ error: "AI 请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: auth.user.id,
    task_type: "performance_review",
    entity_type: parsed.data.publicationId ? "publication" : "date_range",
    entity_id: parsed.data.publicationId ?? null,
    status: "running",
    model: aiModel,
    request_summary: parsed.data.publicationId
      ? "单条发布复盘"
      : parsed.data.startDate
        ? `${parsed.data.startDate} 至 ${parsed.data.endDate} 发布复盘`
        : `${parsed.data.days} 天发布复盘`,
  }).select().single();

  try {
    const ai = await runStructured(
      reviewAnalysisSchema,
      "content_performance_review",
      `你是短视频内容复盘分析师。严格遵守以下输出标准：
1. 同时覆盖数据表现与实际发布文案，但同一事实只能出现一次，禁止换句话重复。
2. summary 只写总判断和最关键的数据缺口，不超过 120 个汉字。
3. 每个列表最多 3 条；每条只表达一个结论，先给依据，再给判断，删除空泛鼓励和行业套话。
4. 开头钩子必须结合跳出率判断；结尾必须结合完播率、平均观看时长和互动设计判断。缺少对应指标时，只说明一次“待验证”，不得虚构。
5. 文案分析只保留钩子、结构节奏、核心观点、结尾互动这四类中真正影响表现的内容。
6. hypotheses 使用“数据现象 → 文案可能原因 → 如何验证”的格式，只能写相关性假设，不能宣称因果。
7. nextActions 必须是可执行实验，写清改动变量和观察指标。
8. 不引用行业平均值，不做没有数据支撑的高低评价。
只能依据用户录入的数据和文案判断。`,
      `复盘输入：${JSON.stringify(reviewInputs)}
请按标准输出精炼、无重复的中文综合复盘。`,
    );
    const result = ai.data;
    if (run) await supabase.from("ai_runs").update({
      status: "completed",
      result,
      input_tokens: ai.inputTokens,
      output_tokens: ai.outputTokens,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 复盘失败";
    if (run) await supabase.from("ai_runs").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return publicAiError(error);
  }
}
