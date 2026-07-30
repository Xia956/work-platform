"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { createEmailRequestClient } from "@/lib/supabase/email-flow-client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/validation";

export function ForgotPasswordForm({
  configured,
  nextPath,
}: {
  configured: boolean;
  nextPath?: string;
}) {
  const destination = safeNextPath(nextPath);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const callback = new URL("/auth/complete", window.location.origin);
      callback.searchParams.set("next", destination);
      const { error } = await createEmailRequestClient().auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: callback.toString() },
      );
      if (error) {
        setMessage(getAuthErrorMessage(error, "recovery"));
        return;
      }
      setSent(true);
      setMessage("重置邮件已发送，请打开最新一封邮件设置新密码。");
    } catch {
      setMessage("密码重置服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="paper rounded-3xl p-5 sm:p-8">
      <label className="mb-2 block text-sm font-bold" htmlFor="email">注册邮箱</label>
      <div className="relative">
        <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]" />
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          className="field field-with-icon"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          disabled={sent}
        />
      </div>
      {message ? (
        <p aria-live="polite" className={`mt-4 text-sm leading-6 ${sent ? "text-[#4f6c56]" : "text-[#9b503c]"}`}>
          {message}
        </p>
      ) : null}
      {!sent ? (
        <button className="btn-primary mt-5 w-full" disabled={!configured || busy}>
          {busy ? "发送中…" : "发送重置邮件"}
          <ArrowRight className="size-4" />
        </button>
      ) : null}
      <Link href={`/login?next=${encodeURIComponent(destination)}`} className="btn-ghost mt-3 w-full text-sm">
        返回密码登录
      </Link>
    </form>
  );
}
