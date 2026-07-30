"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenText,
  Home,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "工作台", icon: Home },
  { href: "/content", label: "内容", icon: BookOpenText },
  { href: "/benchmarks", label: "对标", icon: Radio },
  { href: "/publications", label: "复盘", icon: BarChart3 },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <>
      <nav className="hidden space-y-1 md:block">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-[#ebe4da] text-[#25231f] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-[#b9573a]"
                  : "text-[#716b62] hover:bg-[#f0ebe3] hover:text-[#25231f]",
              )}
            >
              <Icon className={cn("size-[18px]", active ? "text-[#a84f35]" : "")} strokeWidth={1.7} />
              {label}
            </Link>
          );
        })}
      </nav>
      <nav className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-around rounded-lg border border-[#d9d1c5] bg-[#fbfaf6]/95 px-1 py-1.5 shadow-[0_8px_24px_rgb(36_29_22/12%)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-12 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium",
                active ? "bg-[#ebe4da] text-[#a84f35]" : "text-[#716b62]",
              )}
            >
              <Icon className="size-4" strokeWidth={1.7} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
