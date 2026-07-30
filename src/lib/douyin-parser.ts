import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const allowedDomains = ["douyin.com", "iesdouyin.com"];
export const MAX_RESPONSE_BYTES = 1_500_000;
export const MAX_REDIRECTS = 4;

export type DouyinSourceType = "account" | "video" | "unknown";

export function extractDouyinShare(input: string) {
  const candidates = input.match(/https:\/\/[^\s<>"']+/gi) ?? [];
  for (const candidate of candidates) {
    const cleaned = candidate.replace(/[，。！？；：、）】}>.,!?;:]+$/u, "");
    try {
      const url = new URL(cleaned);
      if (!isAllowedDouyinHost(url.hostname)) continue;
      const title = input.match(/【([^】]{1,160})】/u)?.[1]?.trim() || null;
      const urlIndex = input.indexOf(candidate);
      const beforeUrl = urlIndex >= 0 ? input.slice(0, urlIndex) : "";
      const afterTitle = beforeUrl.replace(/^[\s\S]*?【[^】]+】/u, "").trim();
      const description = afterTitle
        .replace(/^\s*[-—:：]?\s*/u, "")
        .replace(/\s+/gu, " ")
        .trim() || null;
      return { url: cleaned, title, description };
    } catch {
      // Continue until a valid, allow-listed Douyin URL is found.
    }
  }
  throw new Error("没有找到有效的抖音链接");
}

export function isAllowedDouyinHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const value = address.toLowerCase();
    const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mapped) return isPrivateAddress(mapped);
    return (
      value === "::" ||
      value === "::1" ||
      value.startsWith("fc") ||
      value.startsWith("fd") ||
      /^fe[89ab]/.test(value) ||
      value.startsWith("ff") ||
      value.startsWith("2001:db8:")
    );
  }
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

export function normalizeDouyinUrl(input: string) {
  const url = new URL(input);
  if (url.protocol !== "https:") throw new Error("只支持 HTTPS 抖音链接");
  if (!isAllowedDouyinHost(url.hostname)) throw new Error("只支持抖音账号或视频链接");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (!["modal_id"].includes(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

export function classifyDouyinUrl(input: string): DouyinSourceType {
  const url = new URL(input);
  if (/\/(?:video|note)\/\d+/i.test(url.pathname) || url.searchParams.has("modal_id")) return "video";
  if (/\/user\/[^/]+/i.test(url.pathname)) return "account";
  return "unknown";
}

function decodeEntities(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function meta(html: string, key: string) {
  const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${safeKey}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${safeKey}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1].trim());
  }
  return null;
}

export function extractDouyinMetadata(html: string, finalUrl: string) {
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const title = meta(html, "og:title") || (titleTag ? decodeEntities(titleTag.trim()) : null);
  const description = meta(html, "og:description") || meta(html, "description");
  const coverUrl = meta(html, "og:image");
  const videoId =
    finalUrl.match(/\/(?:video|note)\/(\d+)/i)?.[1] ||
    new URL(finalUrl).searchParams.get("modal_id") ||
    html.match(/"aweme_id"\s*:\s*"(\d+)"/)?.[1] ||
    null;
  const authorName =
    meta(html, "og:site_name") ||
    html.match(/"nickname"\s*:\s*"([^"]+)"/)?.[1] ||
    null;
  const secUid = finalUrl.match(/\/user\/([^/?]+)/i)?.[1] || null;

  return {
    title,
    description,
    coverUrl,
    videoId,
    authorName,
    secUid,
    finalUrl,
  };
}

type LookupHost = (hostname: string) => Promise<Array<{ address: string }>>;

export interface PublicPageDependencies {
  fetcher?: typeof fetch;
  lookupHost?: LookupHost;
  timeoutMs?: number;
}

async function assertSafeUrl(url: URL, lookupHost: LookupHost) {
  if (url.protocol !== "https:" || !isAllowedDouyinHost(url.hostname)) {
    throw new Error("链接跳转到了不受信任的地址");
  }
  const addresses = await lookupHost(url.hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("链接目标地址不安全");
  }
}

export async function fetchPublicDouyinPage(
  input: string,
  dependencies: PublicPageDependencies = {},
) {
  const fetcher = dependencies.fetcher ?? fetch;
  const lookupHost = dependencies.lookupHost ?? (async (hostname: string) =>
    lookup(hostname, { all: true }));
  const timeoutMs = dependencies.timeoutMs ?? 9_000;
  let current = new URL(normalizeDouyinUrl(input));
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertSafeUrl(current, lookupHost);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetcher(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "KoubotaiLinkPreview/1.0",
        },
      });
    } catch (error) {
      if (controller.signal.aborted) throw new Error("公开页面请求超时");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("分享链接缺少跳转地址");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) {
      const finalUrl = normalizeDouyinUrl(current.toString());
      if (classifyDouyinUrl(finalUrl) !== "unknown") {
        return {
          html: "",
          finalUrl,
          warning: `已识别链接，但抖音公开页面暂时不可访问（${response.status}）`,
        };
      }
      throw new Error(`公开页面暂时不可访问（${response.status}）`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) throw new Error("链接返回的不是公开网页");
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("公开页面内容过大");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取公开页面");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("公开页面内容过大");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const finalUrl = normalizeDouyinUrl(current.toString());
    return { html: new TextDecoder().decode(bytes), finalUrl, warning: null };
  }
  throw new Error("分享链接跳转次数过多");
}
