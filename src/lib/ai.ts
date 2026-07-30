import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

export const aiModel = process.env.OPENAI_MODEL || "gpt-5.6-sol";

export interface StructuredResult<T> {
  data: T;
  inputTokens: number | null;
  outputTokens: number | null;
}

export async function canStartAiRun(client: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await client
    .from("ai_runs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) return true;
  return (count ?? 0) < 8;
}

export async function runStructured<T extends z.ZodType>(
  schema: T,
  name: string,
  system: string,
  user: string,
): Promise<StructuredResult<z.infer<T>>> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY 尚未配置");
  }
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 35_000,
    maxRetries: 1,
  });
  let response;
  try {
    response = await client.responses.parse({
      model: aiModel,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_output_tokens: 4_000,
      store: false,
      text: { format: zodTextFormat(schema, name) },
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "APIConnectionTimeoutError" || error.message.includes("timed out"))) {
      throw new Error("AI 请求超时，请稍后重试");
    }
    throw error;
  }
  if (!response.output_parsed) throw new Error("AI 未返回可用结果，请重试");
  return {
    data: response.output_parsed as z.infer<T>,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}
