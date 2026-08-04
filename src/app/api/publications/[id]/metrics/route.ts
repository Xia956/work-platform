import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const metricSchema = z.object({
  recorded_at: z.string().datetime(),
  views: z.number().int().min(0),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  favorites: z.number().int().min(0),
  followers_gained: z.number().int(),
  bounce_rate: z.number().min(0).max(100).nullable(),
  completion_rate: z.number().min(0).max(100).nullable(),
  avg_watch_time: z.number().min(0).nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "发布记录 ID 无效" }, { status: 422 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = metricSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "数据快照参数无效" }, { status: 422 });
  const { data: publication } = await supabase
    .from("publications")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();
  if (!publication) return NextResponse.json({ error: "发布记录不存在" }, { status: 404 });
  const { data, error } = await supabase.from("metric_snapshots").insert({
    ...parsed.data,
    publication_id: id,
    user_id: auth.user.id,
  }).select().single();
  return error
    ? NextResponse.json({ error: databaseError(error.message, "数据快照保存失败") }, { status: 400 })
    : NextResponse.json({ data }, { status: 201 });
}
