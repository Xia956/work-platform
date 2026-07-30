import { safeNextPath } from "@/lib/validation";

export type EmailAuthHash =
  | {
      kind: "session";
      accessToken: string;
      refreshToken: string;
      authType: string;
      destination: string;
    }
  | { kind: "error"; message: string }
  | { kind: "none" };

export function parseEmailAuthHash(urlValue: string): EmailAuthHash {
  const url = new URL(urlValue);
  const hash = new URLSearchParams(url.hash.slice(1));
  const error = hash.get("error_description") || hash.get("error");
  if (error) {
    return {
      kind: "error",
      message: "邮件链接无效或已过期，请使用最新一封邮件。",
    };
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const authType = hash.get("type") || "";
  if (!accessToken || !refreshToken || !authType) return { kind: "none" };

  const requestedNext = safeNextPath(url.searchParams.get("next") ?? undefined);
  const destination =
    authType === "recovery"
      ? `/update-password?next=${encodeURIComponent(requestedNext)}`
      : requestedNext;

  return {
    kind: "session",
    accessToken,
    refreshToken,
    authType,
    destination,
  };
}

type SessionSetter = (tokens: {
  access_token: string;
  refresh_token: string;
}) => Promise<{ error: unknown | null }>;

export async function completeEmailAuth(
  urlValue: string,
  setSession: SessionSetter,
) {
  const parsed = parseEmailAuthHash(urlValue);
  if (parsed.kind !== "session") return parsed;

  const { error } = await setSession({
    access_token: parsed.accessToken,
    refresh_token: parsed.refreshToken,
  });
  return error
    ? ({
        kind: "error",
        message: "邮件链接无效或已过期，请使用最新一封邮件。",
      } as const)
    : ({
        kind: "complete",
        destination: parsed.destination,
      } as const);
}
