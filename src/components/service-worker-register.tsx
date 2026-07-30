"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/lib/use-online-status";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function ServiceWorkerRegister() {
  const online = useOnlineStatus();
  const [updateReady, setUpdateReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").then((value) => {
        setRegistration(value);
        if (value.waiting) setUpdateReady(true);
        value.addEventListener("updatefound", () => {
          const worker = value.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      }).catch(() => undefined);
    }
    let reloading = false;
    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker?.addEventListener("controllerchange", reload);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstall);
      navigator.serviceWorker?.removeEventListener("controllerchange", reload);
    };
  }, []);

  if (online && !updateReady && !installPrompt) return null;

  return (
    <div
      className="fixed right-4 bottom-24 z-[60] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-lg border border-[#d9d1c5] bg-[#fbfaf6] px-4 py-3 text-xs text-[#4f4a43] shadow-lg md:bottom-4"
      role="status"
    >
      <span>
        {!online ? "当前离线，新灵感仍可保存在本机" : updateReady ? "口播台有新版本可用" : "可将口播台安装到设备"}
      </span>
      {updateReady ? (
        <button
          type="button"
          className="font-semibold text-[#a84f35]"
          onClick={() => registration?.waiting?.postMessage({ type: "SKIP_WAITING" })}
        >
          更新
        </button>
      ) : installPrompt ? (
        <button
          type="button"
          className="font-semibold text-[#a84f35]"
          onClick={async () => {
            await installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
          }}
        >
          安装
        </button>
      ) : null}
    </div>
  );
}
