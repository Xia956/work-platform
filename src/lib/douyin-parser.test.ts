import { describe, expect, it } from "vitest";
import {
  classifyDouyinUrl,
  extractDouyinMetadata,
  fetchPublicDouyinPage,
  isAllowedDouyinHost,
  isPrivateAddress,
  MAX_RESPONSE_BYTES,
  normalizeDouyinUrl,
} from "@/lib/douyin-parser";

describe("douyin URL safety", () => {
  it("allows known Douyin hosts and rejects lookalikes", () => {
    expect(isAllowedDouyinHost("v.douyin.com")).toBe(true);
    expect(isAllowedDouyinHost("www.douyin.com")).toBe(true);
    expect(isAllowedDouyinHost("douyin.com.evil.test")).toBe(false);
  });

  it("requires HTTPS and removes tracking parameters", () => {
    expect(normalizeDouyinUrl("https://www.douyin.com/video/123?foo=bar"))
      .toBe("https://www.douyin.com/video/123");
    expect(() => normalizeDouyinUrl("http://www.douyin.com/video/123")).toThrow();
  });

  it("classifies account and video links", () => {
    expect(classifyDouyinUrl("https://www.douyin.com/video/123")).toBe("video");
    expect(classifyDouyinUrl("https://www.douyin.com/user/MS4wLjAB")).toBe("account");
    expect(classifyDouyinUrl("https://v.douyin.com/abc")).toBe("unknown");
  });

  it("blocks private and loopback addresses", () => {
    [
      "127.0.0.1",
      "10.0.0.8",
      "100.64.0.1",
      "172.16.4.2",
      "192.168.1.2",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ].forEach((ip) => {
      expect(isPrivateAddress(ip)).toBe(true);
    });
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("rejects non-Douyin and invalid protocols", () => {
    expect(() => normalizeDouyinUrl("https://douyin.com.evil.test/video/1")).toThrow();
    expect(() => normalizeDouyinUrl("file:///etc/passwd")).toThrow();
  });
});

describe("Douyin public metadata", () => {
  it("extracts stable Open Graph fields", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="三秒开场示例">
        <meta property="og:description" content="一段公开描述">
        <meta property="og:image" content="https://example.test/cover.jpg">
      </head></html>`;
    expect(extractDouyinMetadata(html, "https://www.douyin.com/video/7654321")).toMatchObject({
      title: "三秒开场示例",
      description: "一段公开描述",
      videoId: "7654321",
    });
  });
});

describe("Douyin fetch safety", () => {
  const lookupHost = async () => [{ address: "8.8.8.8" }];

  it("rejects open redirects", async () => {
    const fetcher = (async () => new Response(null, {
      status: 302,
      headers: { location: "https://evil.example/private" },
    })) as typeof fetch;
    await expect(fetchPublicDouyinPage("https://v.douyin.com/test", {
      fetcher,
      lookupHost,
    })).rejects.toThrow("不受信任");
  });

  it("stops redirect loops", async () => {
    const fetcher = (async () => new Response(null, {
      status: 302,
      headers: { location: "https://v.douyin.com/test" },
    })) as typeof fetch;
    await expect(fetchPublicDouyinPage("https://v.douyin.com/test", {
      fetcher,
      lookupHost,
    })).rejects.toThrow("跳转次数过多");
  });

  it("rejects oversized responses before reading the body", async () => {
    const fetcher = (async () => new Response("<html></html>", {
      headers: {
        "content-type": "text/html",
        "content-length": String(MAX_RESPONSE_BYTES + 1),
      },
    })) as typeof fetch;
    await expect(fetchPublicDouyinPage("https://www.douyin.com/video/1", {
      fetcher,
      lookupHost,
    })).rejects.toThrow("内容过大");
  });

  it("times out stalled requests", async () => {
    const fetcher = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      })) as typeof fetch;
    await expect(fetchPublicDouyinPage("https://www.douyin.com/video/1", {
      fetcher,
      lookupHost,
      timeoutMs: 5,
    })).rejects.toThrow("请求超时");
  });
});
