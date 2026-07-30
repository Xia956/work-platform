"use client";

import Link from "next/link";
import { Cloud, LogIn, X } from "lucide-react";

export function LoginRequiredDialog({
  open,
  reason,
  nextPath,
  onClose,
}: {
  open: boolean;
  reason: string;
  nextPath: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-black/30 p-3 backdrop-blur-[2px] sm:place-items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-required-title"
    >
      <div className="w-full max-w-sm rounded-[22px] border border-[#d9d1c5] bg-[#fffdf8] p-5 shadow-[0_24px_70px_rgb(30_24_18/24%)]">
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-full bg-[#efe2dc] text-[#a34e37]">
            <Cloud className="size-5" />
          </span>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-[#81796e] hover:bg-[#eee8df]"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>
        <h2 id="login-required-title" className="mt-4 text-lg font-semibold">登录后继续</h2>
        <p className="mt-2 text-sm leading-6 text-[#716a61]">{reason}</p>
        <p className="mt-2 text-xs leading-5 text-[#8a8278]">
          当前设备里的灵感和草稿不会丢失，登录后可以一键导入账号。
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="btn-primary mt-5 w-full"
        >
          <LogIn className="size-4" /> 登录并同步
        </Link>
        <button type="button" className="btn-ghost mt-2 w-full text-xs" onClick={onClose}>
          暂时不登录
        </button>
      </div>
    </div>
  );
}
