import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const supplementSchema = z.object({
  transcript: z.string().trim().max(30000).optional(),
  title: z.string().trim().max(300).optional(),
  description: z.string().trim().max(5000).optional(),
  author_name: z.string().trim().max(160).optional(),
  nickname: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(2000).optional(),
  douyin_id: z.string().trim().max(160).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "至少需要一个修正字段",
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = supplementSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "补充内容无效" }, { status: 422 });
  const { data: source } = await supabase.from("benchmark_sources").select("*").eq("id", id).single();
  if (!source) return NextResponse.json({ error: "对标资料不存在" }, { status: 404 });

  if (source.source_type === "account") {
    const { data: current } = await supabase.from("benchmark_accounts").select("*").eq("source_id", id).single();
    if (!current) return NextResponse.json({ error: "账号资料不存在" }, { status: 404 });
    const patch = {
      ...(parsed.data.nickname !== undefined ? { nickname: parsed.data.nickname } : {}),
      ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
      ...(parsed.data.douyin_id !== undefined ? { douyin_id: parsed.data.douyin_id } : {}),
    };
    const fieldSources = Object.fromEntries(
      Object.keys(patch).map((key) => [key, "user_override"]),
    );
    const { data, error } = await supabase.from("benchmark_accounts").update({
      ...patch,
      user_overrides: { ...(current.user_overrides ?? {}), ...patch },
      field_sources: { ...(current.field_sources ?? {}), ...fieldSources },
    }).eq("source_id", id).select().single();
    if (error) return NextResponse.json({ error: "账号资料保存失败" }, { status: 400 });
    await supabase.from("benchmark_sources").update({
      parse_status: "parsed",
      error_message: null,
    }).eq("id", id);
    return NextResponse.json({ data, sourceType: "account" });
  }

  const { data: current } = await supabase.from("benchmark_videos").select("*").eq("source_id", id).single();
  if (!current) return NextResponse.json({ error: "视频资料不存在" }, { status: 404 });
  const patch = {
    ...(parsed.data.transcript !== undefined ? { transcript: parsed.data.transcript } : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
    ...(parsed.data.author_name !== undefined ? { author_name: parsed.data.author_name } : {}),
  };
  const fieldSources = Object.fromEntries(
    Object.keys(patch).map((key) => [key, "user_override"]),
  );
  const { data: video, error } = await supabase.from("benchmark_videos").update({
    ...patch,
    user_overrides: { ...(current.user_overrides ?? {}), ...patch },
    field_sources: { ...(current.field_sources ?? {}), ...fieldSources },
  }).eq("source_id", id).select().single();
  if (error) return NextResponse.json({ error: "视频资料保存失败" }, { status: 400 });
  const hasText = Boolean(video.transcript || video.description || video.title);
  await supabase.from("benchmark_sources").update({
    parse_status: hasText ? "parsed" : "needs_input",
    error_message: hasText ? null : "请补充口播原文或摘要",
  }).eq("id", id);
  return NextResponse.json({ data: video, sourceType: "video" });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { error } = await supabase.from("benchmark_sources").delete().eq("id", id);
  return error
    ? NextResponse.json({ error: databaseError(error.message, "删除失败，请稍后重试") }, { status: 400 })
    : NextResponse.json({ ok: true });
}
