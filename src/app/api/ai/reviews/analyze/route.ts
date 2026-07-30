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
  if (!snapshots?.length) return NextResponse.json({ error: "请先录入至少一组数据快照" }, { status: 422 });
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
      "你是短视频内容数据分析师。只能基于用户录入的发布记录和数据快照做判断。区分事实、推测和下一步实验，不承诺因果关系，不虚构行业基准。",
      `发布记录：${JSON.stringify(publications)}
数据快照：${JSON.stringify(snapshots)}
请给出简洁、可执行的中文复盘。`,
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
