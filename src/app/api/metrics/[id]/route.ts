import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const metricPatchSchema = z.object({
  recorded_at: z.string().datetime().optional(),
  views: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  favorites: z.number().int().min(0).optional(),
  followers_gained: z.number().int().optional(),
  completion_rate: z.number().min(0).max(100).nullable().optional(),
  avg_watch_time: z.number().min(0).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0);

async function authenticate() {
  const supabase = await createClient();
  if (!supabase) return { response: NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 }) };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { response: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { supabase, user: data.user };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "数据快照 ID 无效" }, { status: 422 });
  }
  const auth = await authenticate();
  if (auth.response) return auth.response;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = metricPatchSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "数据快照参数无效" }, { status: 422 });
  const { data, error } = await auth.supabase!
    .from("metric_snapshots")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", auth.user!.id)
    .select()
    .single();
  return error
    ? NextResponse.json({ error: "数据快照更新失败" }, { status: 400 })
    : NextResponse.json({ data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "数据快照 ID 无效" }, { status: 422 });
  }
  const auth = await authenticate();
  if (auth.response) return auth.response;
  const { error } = await auth.supabase!
    .from("metric_snapshots")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user!.id);
  return error
    ? NextResponse.json({ error: "数据快照删除失败" }, { status: 400 })
    : NextResponse.json({ ok: true });
}
