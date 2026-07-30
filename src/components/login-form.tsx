"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/validation";

type Mode = "login" | "register";

export function LoginForm({
  configured,
  nextPath,
  initialMessage,
}: {
  configured: boolean;
  nextPath?: string;
  initialMessage?: string;
}) {
  const router = useRouter();
  const destination = safeNextPath(nextPath);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setMessage("");
    setSuccess(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured || busy) return;
    if (mode === "register" && password !== confirmPassword) {
      setMessage("两次输入的密码不一致。");
      return;
    }

    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (error) {
          setMessage(getAuthErrorMessage(error, "password"));
          return;
        }
        router.replace(destination);
        router.refresh();
        return;
      }

      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", destination);
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (error) {
        setMessage(getAuthErrorMessage(error, "register"));
        return;
      }
      if (data.session) {
        router.replace(destination);
        router.refresh();
        return;
      }
      setSuccess(true);
      setMessage("注册确认邮件已发送。请完成一次邮箱验证，之后即可直接使用密码登录。");
    } catch {
      setMessage("登录服务暂时不可用，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper rounded-3xl p-5 sm:p-8">
      <div className="grid grid-cols-2 rounded-xl bg-[#eee9e0] p-1" role="tablist" aria-label="登录方式">
        {([
          ["login", "密码登录"],
          ["register", "注册账号"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === value
                ? "bg-[#fffefa] text-[#292621] shadow-sm"
                : "text-[#777065]"
            }`}
            onClick={() => switchMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5">
        <label className="mb-2 block text-sm font-bold" htmlFor="email">邮箱</label>
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
            disabled={success}
          />
        </div>

        <label className="mb-2 mt-4 block text-sm font-bold" htmlFor="password">密码</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]" />
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="field field-with-icon pr-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === "login" ? "输入密码" : "至少 8 位"}
            minLength={8}
            required
            disabled={success}
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

        {mode === "register" ? (
          <>
            <label className="mb-2 mt-4 block text-sm font-bold" htmlFor="confirm-password">确认密码</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#968d81]" />
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="field field-with-icon"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
                minLength={8}
                required
                disabled={success}
              />
            </div>
          </>
        ) : null}

        {message ? (
          <p
            aria-live="polite"
            className={`mt-4 break-words text-sm leading-6 ${success ? "text-[#4f6c56]" : "text-[#9b503c]"}`}
          >
            {message}
          </p>
        ) : null}

        {!success ? (
          <button className="btn-primary mt-5 w-full" disabled={!configured || busy}>
            {configured
              ? busy
                ? mode === "login" ? "登录中…" : "注册中…"
                : mode === "login" ? "登录" : "注册并验证邮箱"
              : "请先配置 Supabase"}
            <ArrowRight className="size-4" />
          </button>
        ) : null}
      </form>

      {mode === "login" ? (
        <Link
          href={`/forgot-password?next=${encodeURIComponent(destination)}`}
          className="mt-4 block text-center text-sm text-[#9b503c] underline-offset-4 hover:underline"
        >
          首次设置密码或忘记密码？
        </Link>
      ) : (
        <p className="mt-4 text-center text-xs leading-5 text-[#8a8278]">
          只有注册和找回密码需要查收邮件。
        </p>
      )}
      <Link href={destination} className="btn-ghost mt-2 w-full text-xs">
        暂不登录，先体验
      </Link>
    </div>
  );
}
