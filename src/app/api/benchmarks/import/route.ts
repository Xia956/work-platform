import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { benchmarkUrlSchema } from "@/lib/validation";
import {
  classifyDouyinUrl,
  extractDouyinShare,
  extractDouyinMetadata,
  fetchPublicDouyinPage,
  normalizeDouyinUrl,
} from "@/lib/douyin-parser";

export const runtime = "nodejs";

const importSchema = benchmarkUrlSchema.extend({
  force: z.boolean().default(false),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = importSchema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: "请粘贴有效的抖音链接或分享文案" }, { status: 422 });

  let initialNormalized: string;
  let share: ReturnType<typeof extractDouyinShare>;
  try {
    share = extractDouyinShare(parsed.data.url);
    initialNormalized = normalizeDouyinUrl(share.url);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "链接无效" }, { status: 422 });
  }

  const { data: existing } = await supabase
    .from("benchmark_sources")
    .select("*")
    .eq("normalized_url", initialNormalized)
    .maybeSingle();
  if (existing && !parsed.data.force) {
    const [{ data: video }, { data: account }] = await Promise.all([
      supabase.from("benchmark_videos").select("*").eq("source_id", existing.id).maybeSingle(),
      supabase.from("benchmark_accounts").select("*").eq("source_id", existing.id).maybeSingle(),
    ]);
    return NextResponse.json({ data: existing, entity: video ?? account, duplicate: true });
  }

  let source = existing;
  let created = false;
  if (source) {
    const { data: reset, error } = await supabase.from("benchmark_sources").update({
      parse_status: "parsing",
      error_message: null,
    }).eq("id", source.id).select().single();
    if (error) return NextResponse.json({ error: "无法重新解析该链接" }, { status: 400 });
    source = reset;
  } else {
    const { data: inserted, error: insertError } = await supabase.from("benchmark_sources").insert({
      user_id: auth.user.id,
      original_url: share.url,
      normalized_url: initialNormalized,
      source_type: classifyDouyinUrl(initialNormalized),
      parse_status: "parsing",
    }).select().single();
    if (insertError?.code === "23505") {
      const { data: duplicate } = await supabase
        .from("benchmark_sources")
        .select("*")
        .eq("normalized_url", initialNormalized)
        .single();
      return NextResponse.json({ data: duplicate, duplicate: true });
    }
    if (insertError || !inserted) {
      return NextResponse.json({ error: "链接保存失败，请稍后重试" }, { status: 400 });
    }
    source = inserted;
    created = true;
  }

  try {
    const { html, finalUrl, warning: pageWarning } = await fetchPublicDouyinPage(share.url);
    const sourceType = classifyDouyinUrl(finalUrl);
    const publicMetadata = extractDouyinMetadata(html, finalUrl);
    const metadata = {
      ...publicMetadata,
      title: publicMetadata.title ?? share.title,
      description: publicMetadata.description ?? share.description,
    };
    const { data: resolvedDuplicate } = await supabase
      .from("benchmark_sources")
      .select("*")
      .eq("normalized_url", finalUrl)
      .neq("id", source.id)
      .maybeSingle();
    if (resolvedDuplicate) {
      if (created) await supabase.from("benchmark_sources").delete().eq("id", source.id);
      else await supabase.from("benchmark_sources").update({
        parse_status: "failed",
        error_message: "该链接与资料库中的另一条记录指向相同内容",
      }).eq("id", source.id);
      return NextResponse.json({ data: resolvedDuplicate, duplicate: true });
    }

    const sufficient = sourceType === "account"
      ? Boolean(metadata.title || metadata.authorName)
      : Boolean(metadata.title || metadata.description);
    const parseStatus = sufficient ? "parsed" : "needs_input";
    const { data: updated, error: updateError } = await supabase.from("benchmark_sources").update({
      normalized_url: finalUrl,
      source_type: sourceType,
      parse_status: parseStatus,
      parsed_metadata: metadata,
      parsed_at: new Date().toISOString(),
      error_message: pageWarning ?? (sufficient ? null : "页面未提供足够的公开文字，可补充文案或摘要"),
    }).eq("id", source.id).select().single();
    if (updateError) throw updateError;

    let entity;
    if (sourceType === "account") {
      const { data: existingAccount } = await supabase
        .from("benchmark_accounts")
        .select("user_overrides, field_sources")
        .eq("source_id", source.id)
        .maybeSingle();
      const overrides = (existingAccount?.user_overrides ?? {}) as Record<string, string>;
      const overrideSources = Object.fromEntries(
        Object.keys(overrides).map((key) => [key, "user_override"]),
      );
      const { data: account, error } = await supabase.from("benchmark_accounts").upsert({
        user_id: auth.user.id,
        source_id: source.id,
        nickname: overrides.nickname ?? metadata.title ?? metadata.authorName,
        profile_url: finalUrl,
        avatar_url: metadata.coverUrl,
        bio: overrides.bio ?? metadata.description,
        douyin_id: overrides.douyin_id ?? metadata.secUid,
        user_overrides: overrides,
        field_sources: {
          nickname: "public_page",
          bio: "public_page",
          avatar_url: "public_page",
          ...overrideSources,
        },
      }, { onConflict: "source_id" }).select().single();
      if (error) throw error;
      entity = account;
    } else {
      const { data: existingVideo } = await supabase
        .from("benchmark_videos")
        .select("user_overrides, transcript, field_sources")
        .eq("source_id", source.id)
        .maybeSingle();
      const overrides = (existingVideo?.user_overrides ?? {}) as Record<string, string>;
      const overrideSources = Object.fromEntries(
        Object.keys(overrides).map((key) => [key, "user_override"]),
      );
      const { data: video, error } = await supabase.from("benchmark_videos").upsert({
        user_id: auth.user.id,
        source_id: source.id,
        video_id: metadata.videoId,
        title: overrides.title ?? metadata.title,
        description: overrides.description ?? metadata.description,
        author_name: overrides.author_name ?? metadata.authorName,
        transcript: overrides.transcript ?? existingVideo?.transcript ?? null,
        cover_url: metadata.coverUrl,
        user_overrides: overrides,
        field_sources: {
          title: "public_page",
          description: "public_page",
          cover_url: "public_page",
          ...overrideSources,
        },
      }, { onConflict: "source_id" }).select().single();
      if (error) throw error;
      entity = video;
    }
    return NextResponse.json({ data: updated, entity, warning: pageWarning }, { status: created ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析失败";
    const { data: updated } = await supabase.from("benchmark_sources").update({
      parse_status: "failed",
      error_message: message,
      parsed_at: new Date().toISOString(),
    }).eq("id", source.id).select().single();
    return NextResponse.json({ data: updated, warning: message }, { status: created ? 201 : 200 });
  }
}
