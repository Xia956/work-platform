import { OfflineCapture } from "@/components/offline-capture";

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-[#211f1b] text-xl text-white">播</span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">当前处于离线状态</h1>
          <p className="mt-2 text-sm leading-6 text-[#706b62]">其他数据需要联网，但灵感可以先安全地记在这台设备上。</p>
        </div>
        <OfflineCapture />
      </div>
    </main>
  );
}
