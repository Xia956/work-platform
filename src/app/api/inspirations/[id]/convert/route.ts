import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "灵感 ID 无效" }, { status: 422 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { data, error } = await supabase.rpc("convert_inspiration_to_topic", {
    p_inspiration_id: id,
  });
  return error
    ? NextResponse.json({ error: "灵感转为选题失败，请稍后重试" }, { status: 400 })
    : NextResponse.json({ data });
}
