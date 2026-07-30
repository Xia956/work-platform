import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { inspirationSchema, publicationSchema, topicSchema } from "@/lib/validation";

const resources = {
  inspirations: inspirationSchema,
  topics: topicSchema,
  publications: publicationSchema,
} as const;

type Resource = keyof typeof resources;
const idSchema = z.string().uuid();

async function authenticate() {
  const supabase = await createClient();
  if (!supabase) return { error: NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 }) };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  return { supabase, user: data.user };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!(resource in resources)) return NextResponse.json({ error: "未知资源" }, { status: 404 });
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 200)) : 100;
  const { data, error } = await auth.supabase!
    .from(resource)
    .select("*")
    .order(resource === "publications" ? "published_at" : "created_at", { ascending: false })
    .limit(limit);
  return error
    ? NextResponse.json({ error: databaseError(error.message, "数据读取失败") }, { status: 400 })
    : NextResponse.json({ data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!(resource in resources)) return NextResponse.json({ error: "未知资源" }, { status: 404 });
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = resources[resource as Resource].safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { data, error } = await auth.supabase!
    .from(resource)
    .insert({ ...parsed.data, user_id: auth.user!.id })
    .select()
    .single();
  return error
    ? NextResponse.json({ error: databaseError(error.message) }, { status: 400 })
    : NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!(resource in resources)) return NextResponse.json({ error: "未知资源" }, { status: 404 });
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const envelope = z.object({ id: idSchema, data: z.unknown() }).safeParse(body.value);
  if (!envelope.success) return NextResponse.json({ error: "更新参数无效" }, { status: 422 });
  const parsed = resources[resource as Resource].partial().safeParse(envelope.data.data);
  if (!parsed.success) return NextResponse.json({ error: "更新参数无效" }, { status: 422 });
  const { data, error } = await auth.supabase!
    .from(resource)
    .update(parsed.data)
    .eq("id", envelope.data.id)
    .eq("user_id", auth.user!.id)
    .select()
    .single();
  return error
    ? NextResponse.json({ error: databaseError(error.message, "更新失败，请稍后重试") }, { status: 400 })
    : NextResponse.json({ data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  if (!(resource in resources)) return NextResponse.json({ error: "未知资源" }, { status: 404 });
  const auth = await authenticate();
  if (auth.error) return auth.error;
  const id = idSchema.safeParse(request.nextUrl.searchParams.get("id"));
  if (!id.success) return NextResponse.json({ error: "记录 ID 无效" }, { status: 422 });
  const { error } = await auth.supabase!
    .from(resource)
    .delete()
    .eq("id", id.data)
    .eq("user_id", auth.user!.id);
  return error
    ? NextResponse.json({ error: databaseError(error.message, "删除失败，请稍后重试") }, { status: 400 })
    : NextResponse.json({ ok: true });
}
