"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ProfileMenu({ email, compact = false }: { email: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const initial = email && email.includes("@") ? email.slice(0, 1).toUpperCase() : "我";

  useEffect(() => {
    function close(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className={`flex w-full items-center rounded-md border border-[#d9d1c5] bg-[#fbfaf6] text-left transition hover:border-[#bfb5a7] ${compact ? "justify-center p-1.5" : "gap-2.5 px-2.5 py-2"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2f312c] text-xs font-semibold text-white">
          {initial || <UserRound className="size-4" />}
        </span>
        {!compact ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] text-[#8b8377]">创作者账号</span>
              <span className="block truncate text-xs font-medium">{email}</span>
            </span>
            <ChevronDown className="size-3.5 text-[#8b8377]" />
          </>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className={`absolute z-50 w-52 rounded-lg border border-[#d9d1c5] bg-[#fffefa] p-1.5 shadow-[0_12px_32px_rgb(36_29_22/16%)] ${compact ? "right-0 top-12" : "bottom-12 left-0"}`}
        >
          <Link
            role="menuitem"
            href="/settings"
            className="flex items-center gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-[#eee8df]"
            onClick={() => setOpen(false)}
          >
            <Settings className="size-4" /> 创作者设置
          </Link>
          <button
            role="menuitem"
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-[#9b4432] hover:bg-[#f8e9e4]"
            onClick={async () => {
              await createClient().auth.signOut();
              router.replace("/login");
              router.refresh();
            }}
          >
            <LogOut className="size-4" /> 退出登录
          </button>
        </div>
      ) : null}
    </div>
  );
}
