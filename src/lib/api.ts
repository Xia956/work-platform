import { NextResponse } from "next/server";

export async function readJson(request: Request): Promise<
  { ok: true; value: unknown } | { ok: false; response: NextResponse }
> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "请求内容不是有效的 JSON" }, { status: 400 }),
    };
  }
}

export function publicAiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("OPENAI_API_KEY")) {
    return NextResponse.json({ error: "AI 服务尚未配置" }, { status: 503 });
  }
  if (message.includes("AI 请求超时")) {
    return NextResponse.json({ error: message }, { status: 504 });
  }
  return NextResponse.json({ error: "AI 服务暂时不可用，请稍后重试" }, { status: 502 });
}

export function databaseError(message: string, fallback = "保存失败，请稍后重试") {
  if (message.includes("does not belong") || message.includes("not found")) {
    return fallback;
  }
  return process.env.NODE_ENV === "development" ? message : fallback;
}
