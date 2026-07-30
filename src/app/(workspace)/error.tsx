"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace page error", error);
  }, [error]);

  return (
    <div className="paper mx-auto mt-12 max-w-xl rounded-lg p-7 text-center">
      <AlertCircle className="mx-auto size-8 text-[#a84f35]" />
      <h1 className="editorial-title mt-4 text-2xl">页面暂时没有加载成功</h1>
      <p className="mt-2 text-sm leading-6 text-[#6f6a61]">
        数据连接可能短暂中断。你的已保存内容不会因此丢失。
      </p>
      <button type="button" className="btn-primary mt-5" onClick={reset}>
        <RefreshCw className="size-4" /> 重新加载
      </button>
    </div>
  );
}
