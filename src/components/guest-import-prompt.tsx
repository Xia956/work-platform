"use client";

import { useEffect, useState } from "react";
import { CloudUpload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  clearGuestContents,
  GUEST_CONTENT_CHANGED_EVENT,
  readGuestContents,
  type GuestContent,
} from "@/lib/guest-content";

export function GuestImportPrompt({ authenticated }: { authenticated: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<GuestContent[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!authenticated) return;
    const sync = () => setItems(readGuestContents());
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener(GUEST_CONTENT_CHANGED_EVENT, sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(GUEST_CONTENT_CHANGED_EVENT, sync);
    };
  }, [authenticated]);

  if (!authenticated || !items.length || dismissed) return null;

  async function importItems() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/guest/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "导入失败，请稍后重试");
      clearGuestContents();
      setItems([]);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="fixed inset-x-3 bottom-[86px] z-[60] mx-auto max-w-md rounded-[18px] border border-[#d7c8b9] bg-[#fffdf8] p-4 shadow-[0_16px_42px_rgb(40_31_24/20%)] md:bottom-6 md:left-auto md:right-6 md:mx-0">
      <button
        type="button"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-[#81796e] hover:bg-[#eee8df]"
        onClick={() => setDismissed(true)}
        aria-label="稍后导入"
      >
        <X className="size-4" />
      </button>
      <div className="flex gap-3 pr-7">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#efe2dc] text-[#a24e37]">
          <CloudUpload className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">发现 {items.length} 条本地内容</p>
          <p className="mt-1 text-xs leading-5 text-[#756e64]">
            导入当前账号后即可云端保存，并继续使用 AI、发布和复盘。
          </p>
        </div>
      </div>
      {message ? <p className="mt-2 text-xs text-[#9b4432]">{message}</p> : null}
      <button
        type="button"
        className="btn-primary mt-3 w-full"
        disabled={busy}
        onClick={() => void importItems()}
      >
        <CloudUpload className="size-4" /> {busy ? "正在导入…" : "导入到我的账号"}
      </button>
    </aside>
  );
}
