"use client";

import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AuthConfirmForm({
  configured,
  tokenHash,
  nextPath,
}: {
  configured: boolean;
  tokenHash: string | null;
  nextPath: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    tokenHash ? "" : "登录链接不完整或已损坏，请返回登录页重新发送。",
  );

  async function confirmLogin() {
    if (!configured || !tokenHash || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (error) {
        setMessage(
          error.code === "otp_expired"
            ? "这封邮件的登录链接已过期或已使用，请返回登录页重新发送。"
            : "登录验证失败，请返回登录页重新发送。",
        );
        return;
      }
      window.location.replace(nextPath);
    } catch {
      setMessage("登录服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper rounded-3xl p-6 sm:p-8">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#fff0eb] text-[#c95638]">
        <ShieldCheck aria-hidden="true" className="size-6" />
      </div>
      <h2 className="mt-4 text-center text-lg font-bold">确认是你本人操作</h2>
      <p className="mt-2 text-center text-sm leading-6 text-[#706b62]">
        为防止邮件安全扫描器提前使用登录链接，请主动点击下面的按钮完成登录。
      </p>
      {message ? (
        <p aria-live="polite" className="mt-4 break-words text-center text-sm leading-6 text-[#9b503c]">
          {message}
        </p>
      ) : null}
      <button
        type="button"
        className="btn-primary mt-6 w-full"
        disabled={!configured || !tokenHash || busy}
        onClick={confirmLogin}
      >
        {busy ? "验证中…" : "确认并登录"}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      <a href="/login" className="mt-4 block text-center text-xs leading-5 text-[#8a8278] underline-offset-4 hover:underline">
        返回登录页
      </a>
    </div>
  );
}
