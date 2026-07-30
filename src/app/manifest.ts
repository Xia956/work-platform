import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "口播台｜抖音口播创作者工作台",
    short_name: "口播台",
    description: "记录灵感、管理选题、打磨口播文案并复盘发布数据。",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f2eee6",
    theme_color: "#25231f",
    lang: "zh-CN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
