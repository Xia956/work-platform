import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
  title: {
    default: "口播台｜抖音口播创作者工作台",
    template: "%s｜口播台",
  },
  description: "记录灵感、管理选题、打磨口播文案、拆解对标内容并复盘发布数据。",
  applicationName: "口播台",
  appleWebApp: { capable: true, title: "口播台", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    title: "口播台｜抖音口播创作者工作台",
    description: "从灵感、粗稿和版本优化，到发布数据复盘的一站式创作工作台。",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
