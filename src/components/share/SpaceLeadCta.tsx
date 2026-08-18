import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * スペースオーナー向けの導線。
 *
 * ページ最下部の1ブロックに留める。バナーやモーダルにはしない。
 * このページの主役は出店者であって、てんむすびの集客ではないため。
 */
export function SpaceLeadCta({ token, storeName }: { token: string; storeName: string }) {
  return (
    <aside className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <p className="text-sm font-medium text-gray-900">
        出店できる場所をお持ちですか？
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        駐車場や空きスペースに{storeName}のようなキッチンカーを呼びたい場合、
        てんむすびがご相談を承ります。
      </p>
      <Link
        href={`/s/${token}/space`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700"
      >
        スペースを登録する
        <ArrowRight className="h-4 w-4" />
      </Link>
    </aside>
  );
}
