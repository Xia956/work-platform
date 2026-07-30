"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { safeNextPath } from "@/lib/validation";

export function UpdatePasswordForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const destination = safeNextPath(nextPath);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmPassword) {
      setMessage("两次输入的密码不一致。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        setMessage(result.error || "密码保存失败，请重新打开最新一封重置邮件后再试。");
        return;
      }
      router.replace(destination);
      router.refresh();
    } catch {
      setMessage("密码更新服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="paper rounded-3xl p-5 sm:p-8">
      <label className="mb-2 block text-sm font-bold" htmlFor="new-password">新密码</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]" />
        <input
          id="new-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          className="field field-with-icon pr-11"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="至少 8 位"
          minLength={8}
          required
        />
        <button
          type="button"
          aria-label={showPassword ? "隐藏密码" : "显示密码"}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center text-[#81796e]"
          onClick={() => setShowPassword((value) => !value)}
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <label className="mb-2 mt-4 block text-sm font-bold" htmlFor="confirm-new-password">确认新密码</label>
      <div className="relative">
        <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]" />
        <input
          id="confirm-new-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          className="field field-with-icon"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="再次输入密码"
          minLength={8}
          required
        />
      </div>
      {message ? (
        <p aria-live="polite" className="mt-4 text-sm leading-6 text-[#9b503c]">{message}</p>
      ) : null}
      <button className="btn-primary mt-5 w-full" disabled={busy}>
        {busy ? "保存中…" : "保存密码并继续"}
        <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
