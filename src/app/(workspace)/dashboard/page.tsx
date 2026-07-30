import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenText,
  Lightbulb,
  ListChecks,
  Plus,
  Radio,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { createClient } from "@/lib/supabase/server";

const cards = [
  { key: "inspirations", label: "待整理灵感", icon: Lightbulb, href: "/inspirations", color: "text-[#8b622f]" },
  { key: "topics", label: "推进中选题", icon: ListChecks, href: "/topics", color: "text-[#58705d]" },
  { key: "scripts", label: "打磨中文案", icon: BookOpenText, href: "/scripts", color: "text-[#a84f35]" },
  { key: "benchmarks", label: "待解析对标", icon: Radio, href: "/benchmarks", color: "text-[#665d77]" },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const counts: Record<string, number> = { inspirations: 0, topics: 0, scripts: 0, benchmarks: 0, publications: 0 };
  if (supabase) {
    const [inspirations, topics, scripts, benchmarks, publications] = await Promise.all([
      supabase.from("inspirations").select("*", { count: "exact", head: true }).neq("status", "archived"),
      supabase.from("topics").select("*", { count: "exact", head: true }).in("status", ["backlog", "ready", "drafting"]),
      supabase.from("scripts").select("*", { count: "exact", head: true }).eq("status", "drafting"),
      supabase.from("benchmark_sources").select("*", { count: "exact", head: true }).in("parse_status", ["pending", "needs_input"]),
      supabase.from("publications").select("*", { count: "exact", head: true }),
    ]);
    counts.inspirations = inspirations.count ?? 0;
    counts.topics = topics.count ?? 0;
    counts.scripts = scripts.count ?? 0;
    counts.benchmarks = benchmarks.count ?? 0;
    counts.publications = publications.count ?? 0;
  }

  const routeStages = [
    { label: "记录灵感", note: "先记下来，别急着判断", complete: counts.inspirations > 0 },
    { label: "确定选题", note: "找到值得讲的切口", complete: counts.topics > 0 },
    { label: "打磨文案", note: "从粗稿开始反复变好", complete: counts.scripts > 0 },
    { label: "发布复盘", note: "让数据回答下一步", complete: counts.publications > 0 },
  ];
  const completedStages = routeStages.filter((stage) => stage.complete).length;
  const routeProgress = Math.round((completedStages / routeStages.length) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="今天，从一个好开头开始"
        description="把零散想法收进来，沿着选题、文案、发布和复盘，一步一步做成下一条作品。"
        action={
          <Link href="/scripts" className="btn-primary">
            <Plus className="size-4" /> 写一篇口播
          </Link>
        }
      />
      <SetupBanner />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, label, icon: Icon, href, color }) => (
          <Link key={key} href={href} className="paper group rounded-lg p-5 transition-colors hover:border-[#bdb3a5] hover:bg-[#fffefa]">
            <div className="flex items-start justify-between">
              <span className={`grid size-9 place-items-center rounded-md border border-[#ded6ca] bg-[#f7f3ec] ${color}`}>
                <Icon className="size-[18px]" strokeWidth={1.7} />
              </span>
              <ArrowUpRight className="size-4 text-[#aaa196] transition group-hover:text-[#b9573a]" />
            </div>
            <p className="mt-6 font-serif text-[32px] leading-none font-semibold tracking-[-0.03em]">{counts[key]}</p>
            <p className="mt-2 text-[13px] text-[#6f6a61]">{label}</p>
          </Link>
        ))}
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="paper rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-semibold">本周创作路线</p>
              <p className="mt-1 text-[13px] text-[#6f6a61]">把创作推进到下一步，而不是让内容留在收藏夹。</p>
            </div>
            <span className="border border-[#d9d1c5] bg-[#f5f1ea] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[#746b60] uppercase">7 Days</span>
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-[11px] text-[#756f65]">
              <span>创作链路完整度</span>
              <span className="font-semibold text-[#a84f35]">{completedStages}/4 · {routeProgress}%</span>
            </div>
            <div className="progress-track" aria-label={`创作链路完整度 ${routeProgress}%`}>
              <div className="progress-value" style={{ width: `${routeProgress}%` }} />
            </div>
          </div>
          <div className="mt-6 grid border-y border-[#ded7cc] sm:grid-cols-4 sm:divide-x sm:divide-[#ded7cc]">
            {routeStages.map((step, index) => (
              <div key={step.label} className="border-b border-[#ded7cc] px-1 py-4 last:border-b-0 sm:border-b-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xs font-semibold text-[#a84f35]">0{index + 1}</span>
                  <span className={`size-1.5 rounded-full ${step.complete ? "bg-[#607465]" : "bg-[#cfc6b9]"}`} />
                </div>
                <p className="mt-4 text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-[#81796e]">{step.note}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#252822] bg-[#282a25] p-6 text-white">
          <p className="text-[10px] font-semibold tracking-[.2em] text-[#d98468] uppercase">Focus</p>
          <p className="editorial-title mt-4 text-[25px] leading-[1.35]">好文案不是一次生成，是保留粗稿后的持续迭代。</p>
          <p className="mt-4 text-[13px] leading-6 text-white/60">在文案工作室中输入你的真实想法，每次 AI 优化都会成为独立版本。</p>
          <Link href="/scripts" className="mt-7 inline-flex items-center gap-2 border-b border-[#d98468]/60 pb-1 text-[13px] font-medium text-[#e39277]">
            进入文案工作室 <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
