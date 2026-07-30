import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { roughDraftSchema } from "@/lib/validation";

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("autosave"),
    scriptId: z.string().uuid(),
    content: z.string().max(20000),
  }),
  z.object({
    action: z.literal("append"),
    scriptId: z.string().uuid(),
    sourceVersionId: z.string().uuid().nullable(),
    content: z.string().trim().min(1).max(20000),
    versionType: z.enum(["manual_edit", "restored"]),
    summary: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal("updateStatus"),
    scriptId: z.string().uuid(),
    status: z.enum(["drafting", "ready", "published", "archived"]),
  }),
]);

async function getAuth() {
  const supabase = await createClient();
  if (!supabase) return { response: NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 }) };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { supabase, user: data.user };
}

export async function POST(request: Request) {
  const auth = await getAuth();
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = roughDraftSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { data, error } = await auth.supabase!.rpc("create_script_with_draft", {
    p_title: parsed.data.title,
    p_topic_id: parsed.data.topicId ?? null,
    p_content: parsed.data.content,
    p_target_duration: parsed.data.targetDuration,
  });
  if (error) return NextResponse.json({ error: databaseError(error.message) }, { status: 400 });
  const script = data;
  const { data: versions } = await auth.supabase!
    .from("script_versions")
    .select("*")
    .eq("script_id", script.id)
    .order("version_number", { ascending: false });
  return NextResponse.json({ data: { script, versions: versions ?? [] } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await getAuth();
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = mutationSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "文案参数无效" }, { status: 422 });

  if (parsed.data.action === "autosave") {
    const { error } = await auth.supabase!
      .from("scripts")
      .update({ autosave_content: parsed.data.content, autosaved_at: new Date().toISOString() })
      .eq("id", parsed.data.scriptId)
      .eq("user_id", auth.user!.id);
    return error
      ? NextResponse.json({ error: databaseError(error.message, "自动保存失败") }, { status: 400 })
      : NextResponse.json({ ok: true });
  }

  if (parsed.data.action === "updateStatus") {
    const { data, error } = await auth.supabase!
      .from("scripts")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.scriptId)
      .eq("user_id", auth.user!.id)
      .select()
      .single();
    return error
      ? NextResponse.json({ error: databaseError(error.message, "状态更新失败") }, { status: 400 })
      : NextResponse.json({ data });
  }

  const { data, error } = await auth.supabase!.rpc("append_script_version", {
    p_script_id: parsed.data.scriptId,
    p_parent_version_id: parsed.data.sourceVersionId,
    p_version_type: parsed.data.versionType,
    p_content: parsed.data.content,
    p_optimization_type: null,
    p_optimization_prompt: null,
    p_change_summary: parsed.data.summary ?? (parsed.data.versionType === "restored" ? "恢复历史版本" : "手动保存"),
    p_estimated_duration: null,
  });
  return error
    ? NextResponse.json({ error: databaseError(error.message) }, { status: 400 })
    : NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const auth = await getAuth();
  if (auth.response) return auth.response;
  const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
  if (!id.success) return NextResponse.json({ error: "文案 ID 无效" }, { status: 422 });
  const { error } = await auth.supabase!
    .from("scripts")
    .delete()
    .eq("id", id.data)
    .eq("user_id", auth.user!.id);
  return error
    ? NextResponse.json({ error: databaseError(error.message, "删除失败，请稍后重试") }, { status: 400 })
    : NextResponse.json({ ok: true });
}
