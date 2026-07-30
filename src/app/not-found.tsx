import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="paper max-w-md rounded-lg p-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#a84f35]">404</p>
        <h1 className="editorial-title mt-3 text-3xl">没有找到这个页面</h1>
        <p className="mt-3 text-sm text-[#6f6a61]">链接可能已经失效，返回工作台继续创作。</p>
        <Link href="/dashboard" className="btn-primary mt-6">返回工作台</Link>
      </div>
    </main>
  );
}
