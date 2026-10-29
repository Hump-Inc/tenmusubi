import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

/**
 * 立場ごとの LP（/for/vendors・/for/spaces・/for/organizers）で使う部品。
 * 3ページの見た目を揃えるため、並びと余白はここで決めて、ページ側は文言だけ持つ。
 * 書く内容は、いま実際に動いている機能だけにする（準備中のものを売り文句にしない）。
 */

export type LpLink = { href: string; label: string };
export type LpItem = { icon: LucideIcon; title: string; desc: string };

export function LpShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function LpHero({
  eyebrow,
  title,
  lead,
  image,
  imageAlt,
  primary,
  secondary,
  checks,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
  image: string;
  imageAlt: string;
  primary: LpLink;
  secondary?: LpLink;
  checks: string[];
}) {
  return (
    <section className="relative min-h-[64vh] flex items-center">
      <div className="absolute inset-0 z-0">
        <Image src={image} alt={imageAlt} fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
      </div>
      <div className="container mx-auto px-4 relative z-10 text-white py-20">
        <div className="max-w-2xl">
          <p className="inline-block rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur-sm mb-6">
            {eyebrow}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">{title}</h1>
          <p className="mt-6 text-lg text-white/90 leading-relaxed max-w-xl">{lead}</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="rounded-full px-8 h-14 text-base shadow-lg" asChild>
              <Link href={primary.href}>
                {primary.label}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            {secondary && (
              <Button
                size="lg"
                variant="outline-white"
                className="rounded-full px-8 h-14 text-base"
                asChild
              >
                <Link href={secondary.href}>{secondary.label}</Link>
              </Button>
            )}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/75">
            {checks.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LpSection({
  title,
  lead,
  tone = "white",
  children,
}: {
  title: string;
  lead?: string;
  tone?: "white" | "gray";
  children: React.ReactNode;
}) {
  return (
    <section className={`py-16 md:py-24 ${tone === "gray" ? "bg-gray-50" : "bg-white"}`}>
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 md:mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{title}</h2>
          {lead && <p className="mt-4 text-gray-600 max-w-2xl mx-auto leading-relaxed">{lead}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

// 「こんな悩みはありませんか」。悩みと、それにてんむすびがどう応えるかを対で見せる
export function LpPains({ items }: { items: { pain: string; answer: string }[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {items.map((it) => (
        <div key={it.pain} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="font-bold text-gray-900">「{it.pain}」</p>
          <p className="mt-3 flex gap-2 text-sm leading-relaxed text-gray-600">
            <ArrowRight className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            {it.answer}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LpFeatures({ items, columns = 3 }: { items: LpItem[]; columns?: 2 | 3 }) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 gap-6 mx-auto ${
        columns === 3 ? "lg:grid-cols-3 max-w-5xl" : "max-w-4xl"
      }`}
    >
      {items.map((f) => {
        const Icon = f.icon;
        return (
          <div key={f.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-sm leading-relaxed text-gray-600">{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}

export function LpSteps({ items }: { items: LpItem[] }) {
  return (
    <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
      {items.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.title} className="relative text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white mx-auto mb-4">
              <Icon className="h-8 w-8" />
            </div>
            <p className="text-sm font-bold text-primary mb-2">STEP {i + 1}</p>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            {i < items.length - 1 && (
              <ArrowRight className="hidden lg:block absolute top-6 -right-4 h-6 w-6 text-gray-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// 料金。かかるもの・かからないものを表で見せる
export function LpPricing({ rows, note }: { rows: { label: string; value: string }[]; note?: string }) {
  return (
    <div className="max-w-2xl mx-auto">
      <dl className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-sm text-gray-600">{r.label}</dt>
            <dd className="font-bold text-gray-900">{r.value}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-4 text-xs leading-relaxed text-gray-500">{note}</p>}
    </div>
  );
}

export function LpFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {items.map((it) => (
        <details key={it.q} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer list-none font-bold text-gray-900 flex items-start justify-between gap-4">
            <span>Q. {it.q}</span>
            <span className="text-primary transition-transform group-open:rotate-45">＋</span>
          </summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600">{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function LpFinalCta({
  title,
  lead,
  primary,
  secondary,
}: {
  title: string;
  lead: string;
  primary: LpLink;
  secondary?: LpLink;
}) {
  return (
    <section className="py-16 md:py-24 bg-primary text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
        <p className="mt-4 text-white/90 max-w-xl mx-auto leading-relaxed">{lead}</p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            variant="white-primary"
            className="rounded-full px-10 h-14 text-base shadow-lg"
            asChild
          >
            <Link href={primary.href}>
              {primary.label}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          {secondary && (
            <Button
              size="lg"
              variant="outline-white"
              className="rounded-full px-10 h-14 text-base"
              asChild
            >
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

// 他の立場の LP への案内。自分に合うページへ移れるようにする
const ROLES = [
  { key: "vendors", href: "/for/vendors", title: "出店したい方へ", desc: "キッチンカー・ハンドメイド・物販" },
  { key: "spaces", href: "/for/spaces", title: "場所を貸したい方へ", desc: "駐車場・店先・商業施設の空き区画" },
  { key: "organizers", href: "/for/organizers", title: "イベントを開きたい方へ", desc: "マルシェ・お祭り・地域イベント" },
] as const;

export function LpOtherRoles({ current }: { current: (typeof ROLES)[number]["key"] }) {
  return (
    <section className="py-12 bg-gray-50 border-t border-gray-100">
      <div className="container mx-auto px-4">
        <p className="text-center text-sm text-gray-500 mb-6">ほかの立場の方へ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {ROLES.filter((r) => r.key !== current).map((r) => (
            <Link
              key={r.key}
              href={r.href}
              className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <p className="font-bold text-gray-900">{r.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{r.desc}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
