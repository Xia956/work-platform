"use client";

import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export function PasswordSettings() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setSuccess(false);
      setMessage("两次输入的密码不一致。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.updateUser({ password });
      setSuccess(!error);
      setMessage(error ? getAuthErrorMessage(error, "update") : "密码已保存，下次可以直接使用邮箱和密码登录。");
      if (!error) {
        setPassword("");
        setConfirmPassword("");
      }
    } catch {
      setSuccess(false);
      setMessage("密码更新服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="paper mt-4 rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f4e9e3] text-[#a6533b]">
          <KeyRound className="size-4" />
        </span>
        <div>
          <h2 className="font-bold">登录密码</h2>
          <p className="mt-1 text-xs leading-5 text-[#756e64]">首次设置或修改密码。保存后日常登录不再需要收邮件。</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          新密码
          <input
            type="password"
            autoComplete="new-password"
            className="field mt-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            placeholder="至少 8 位"
            required
          />
        </label>
        <label className="block text-sm font-semibold">
          确认新密码
          <input
            type="password"
            autoComplete="new-password"
            className="field mt-2"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            placeholder="再次输入"
            required
          />
        </label>
      </div>
      {message ? (
        <p aria-live="polite" className={`mt-3 text-sm ${success ? "text-[#4f6c56]" : "text-[#9b503c]"}`}>{message}</p>
      ) : null}
      <button className="btn-secondary mt-4 w-full sm:w-auto" disabled={busy}>
        {busy ? "保存中…" : "保存密码"}
      </button>
    </form>
  );
}
