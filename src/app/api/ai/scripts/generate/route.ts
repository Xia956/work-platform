import { NextResponse } from "next/server";
import { z } from "zod";
import { aiModel, canStartAiRun, runStructured } from "@/lib/ai";
import { publicAiError, readJson } from "@/lib/api";
import { generatedScriptSchema } from "@/lib/ai-schemas";
import { createClient } from "@/lib/supabase/server";

const inputSchema = z.object({
  topicId: z.string().uuid(),
  targetDuration: z.number().int().min(15).max(600).default(60),
  instruction: z.string().max(1000).default(""),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = inputSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "生成参数无效" }, { status: 422 });
  const [{ data: topic }, { data: profile }] = await Promise.all([
    supabase.from("topics").select("*").eq("id", parsed.data.topicId).single(),
    supabase.from("creator_profiles").select("*").maybeSingle(),
  ]);
  if (!topic) return NextResponse.json({ error: "选题不存在" }, { status: 404 });
  if (!(await canStartAiRun(supabase, auth.user.id))) {
    return NextResponse.json({ error: "AI 请求过于频繁，请稍后再试" }, { status: 429 });
  }

  const { data: run } = await supabase.from("ai_runs").insert({
    user_id: auth.user.id,
    task_type: "script_generate",
    entity_type: "topic",
    entity_id: topic.id,
    status: "running",
    model: aiModel,
    request_summary: `从选题生成 ${parsed.data.targetDuration} 秒口播稿`,
  }).select().single();

  try {
    const ai = await runStructured(
      generatedScriptSchema,
      "generated_script",
      `你是中文短视频口播编导。为创作者写一篇可以直接对镜头表达的口播稿。
创作者定位：${profile?.positioning || "未填写"}
目标受众：${profile?.audience || topic.audience || "泛用户"}
风格：${profile?.speaking_style || "自然、真诚、具体"}
目标时长：${parsed.data.targetDuration} 秒。避免空洞套话和虚构数据。`,
      `选题：${topic.title}
切入角度：${topic.angle || "未填写"}
核心痛点：${topic.pain_point || "未填写"}
补充要求：${parsed.data.instruction || "无"}`,
    );
    const result = ai.data;
    const { data, error } = await supabase.rpc("create_script_from_ai", {
      p_title: result.title,
      p_topic_id: topic.id,
      p_content: result.content,
      p_target_duration: parsed.data.targetDuration,
      p_instruction: parsed.data.instruction,
      p_change_summary: result.changeSummary,
      p_estimated_duration: result.estimatedDuration,
    });
    if (error) throw error;
    if (run) await supabase.from("ai_runs").update({
      status: "completed",
      entity_type: "script",
      entity_id: data.script.id,
      result,
      input_tokens: ai.inputTokens,
      output_tokens: ai.outputTokens,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败";
    if (run) await supabase.from("ai_runs").update({
      status: "failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return publicAiError(error);
  }
}
