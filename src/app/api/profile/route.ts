import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  display_name: z.string().trim().max(80),
  positioning: z.string().trim().max(1000),
  audience: z.string().trim().max(1000),
  persona: z.string().trim().max(1000),
  speaking_style: z.string().trim().max(1000),
  content_pillars: z.array(z.string().trim().min(1).max(80)).max(20),
  banned_phrases: z.array(z.string().trim().min(1).max(80)).max(30),
  default_duration: z.number().int().min(15).max(600),
});

export async function PUT(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = profileSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "创作者档案参数无效" }, { status: 422 });
  const { data, error } = await supabase.from("creator_profiles").upsert({
    ...parsed.data,
    user_id: auth.user.id,
  }, { onConflict: "user_id" }).select().single();
  return error
    ? NextResponse.json({ error: databaseError(error.message, "创作者档案保存失败") }, { status: 400 })
    : NextResponse.json({ data });
}
