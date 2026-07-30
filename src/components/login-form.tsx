"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/validation";

export function LoginForm({
  configured,
  nextPath,
  initialMessage,
}: {
  configured: boolean;
  nextPath?: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(initialMessage ?? "");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return;
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", safeNextPath(nextPath));
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: callback.toString(),
        },
      });
      setMessage(
        error
          ? getAuthErrorMessage(error)
          : "登录链接已发送，请打开最新一封邮件完成登录。",
      );
      setSent(!error);
    } catch {
      setMessage("登录服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="paper rounded-3xl p-6 sm:p-8">
      <label className="mb-2 block text-sm font-bold" htmlFor="email">邮箱</label>
      <div className="relative">
        <Mail
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]"
        />
        <input
          id="email"
          type="email"
          className="field field-with-icon"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          disabled={sent}
        />
      </div>
      {message ? (
        <p aria-live="polite" className="mt-4 break-words text-sm leading-6 text-[#9b503c]">
          {message}
        </p>
      ) : null}
      {sent ? (
        <button
          type="button"
          className="btn-secondary mt-6 w-full"
          onClick={() => {
            setSent(false);
            setMessage("");
          }}
        >
          更换邮箱
        </button>
      ) : (
        <button className="btn-primary mt-6 w-full" disabled={!configured || busy}>
          {configured ? (busy ? "发送中…" : "发送登录链接") : "请先配置 Supabase"}
          <ArrowRight className="size-4" />
        </button>
      )}
      <p className="mt-4 text-center text-xs leading-5 text-[#8a8278]">
        无需密码；登录链接只能使用一次，请打开最新邮件。
      </p>
    </form>
  );
}
