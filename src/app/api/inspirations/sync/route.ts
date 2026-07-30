import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { inspirationSchema } from "@/lib/validation";

const syncSchema = z.object({
  items: z.array(inspirationSchema.extend({
    id: z.string().uuid(),
    created_at: z.string().datetime(),
  })).max(100),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = syncSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "同步数据无效" }, { status: 422 });

  const items = parsed.data.items.map((item) => ({ ...item, user_id: auth.user!.id }));
  const { error } = await supabase.from("inspirations").upsert(items, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (error) {
    return NextResponse.json({ error: databaseError(error.message, "离线灵感同步失败") }, { status: 400 });
  }
  return NextResponse.json({ syncedIds: items.map((item) => item.id) });
}
