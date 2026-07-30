import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

const guestItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  idea: z.string().trim().max(5000),
  direction: z.string().trim().max(5000),
  draft: z.string().trim().max(20000),
  stage: z.enum(["idea", "rough_draft", "ai_optimized", "ready"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const importSchema = z.object({
  items: z.array(guestItemSchema).min(1).max(100),
});

function stableUuid(userId: string, guestId: string, kind: string) {
  const hex = createHash("sha256")
    .update(`${userId}:${guestId}:${kind}`)
    .digest("hex")
    .slice(0, 32)
    .split("");
  hex[12] = "4";
  hex[16] = ["8", "9", "a", "b"][Number.parseInt(hex[16], 16) % 4];
  const value = hex.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "请先登录后再导入" }, { status: 401 });
  }
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = importSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "本地内容格式无效" },
      { status: 422 },
    );
  }

  const userId = authData.user.id;
  for (const item of parsed.data.items) {
    const inspirationId = stableUuid(userId, item.id, "inspiration");
    const topicId = stableUuid(userId, item.id, "topic");
    const scriptId = stableUuid(userId, item.id, "script");
    const versionId = stableUuid(userId, item.id, "version");
    const hasTopic = Boolean(item.direction || item.draft);
    const hasScript = Boolean(item.draft);

    const { error: inspirationError } = await supabase.from("inspirations").upsert({
      id: inspirationId,
      user_id: userId,
      title: item.title,
      content: item.idea,
      tags: [],
      status: hasTopic ? "converted" : "inbox",
      is_demo: false,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    });
    if (inspirationError) {
      return NextResponse.json(
        { error: databaseError(inspirationError.message, "导入灵感失败") },
        { status: 400 },
      );
    }

    if (hasTopic) {
      const { error: topicError } = await supabase.from("topics").upsert({
        id: topicId,
        user_id: userId,
        inspiration_id: inspirationId,
        title: item.title,
        angle: item.direction || item.idea,
        keywords: [],
        priority: 3,
        status: hasScript ? "drafting" : "backlog",
        is_demo: false,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
      if (topicError) {
        return NextResponse.json(
          { error: databaseError(topicError.message, "导入选题失败") },
          { status: 400 },
        );
      }
    }

    if (hasScript) {
      const { error: scriptError } = await supabase.from("scripts").upsert({
        id: scriptId,
        user_id: userId,
        topic_id: hasTopic ? topicId : null,
        title: item.title,
        status: item.stage === "ready" ? "ready" : "drafting",
        target_duration: 60,
        current_version_id: null,
        autosave_content: item.draft,
        autosaved_at: item.updatedAt,
        is_demo: false,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      });
      if (scriptError) {
        return NextResponse.json(
          { error: databaseError(scriptError.message, "导入粗稿失败") },
          { status: 400 },
        );
      }

      const { data: existingVersion, error: versionLookupError } = await supabase
        .from("script_versions")
        .select("id")
        .eq("id", versionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (versionLookupError) {
        return NextResponse.json(
          { error: databaseError(versionLookupError.message, "检查文案版本失败") },
          { status: 400 },
        );
      }
      if (!existingVersion) {
        const { error: versionError } = await supabase.from("script_versions").insert({
          id: versionId,
          user_id: userId,
          script_id: scriptId,
          parent_version_id: null,
          version_number: 1,
          version_type: item.stage === "ai_optimized" ? "manual_edit" : "rough_draft",
          content: item.draft,
          estimated_duration: 60,
          is_demo: false,
          created_at: item.updatedAt,
        });
        if (versionError) {
          return NextResponse.json(
            { error: databaseError(versionError.message, "导入文案版本失败") },
            { status: 400 },
          );
        }
      }

      const { error: currentVersionError } = await supabase
        .from("scripts")
        .update({ current_version_id: versionId })
        .eq("id", scriptId)
        .eq("user_id", userId);
      if (currentVersionError) {
        return NextResponse.json(
          { error: databaseError(currentVersionError.message, "关联文案版本失败") },
          { status: 400 },
        );
      }
    }
  }

  return NextResponse.json({ imported: parsed.data.items.length });
}
