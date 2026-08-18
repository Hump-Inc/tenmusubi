import Link from "next/link";
import { Clock, Ban, SearchX } from "lucide-react";
import type { ShareLinkStatus } from "@/lib/shareLink";

/**
 * 失効・期限切れ・不明なリンクの画面。
 * 404 を返さないのは、主催者に「壊れたリンクを送ってくる業者」という印象を
 * 持たせないため。次の行動（出店者に最新URLを聞く）まで書く。
 */
export function ShareLinkNotice({ status }: { status: Exclude<ShareLinkStatus, "ok"> }) {
  const content = {
    expired: {
      icon: <Clock className="h-7 w-7 text-amber-600" />,
      bg: "bg-amber-100",
      title: "このリンクは有効期限が切れています",
      body: "お手数ですが、出店者へ最新のURLをご確認ください。",
    },
    revoked: {
      icon: <Ban className="h-7 w-7 text-gray-600" />,
      bg: "bg-gray-100",
      title: "このリンクは公開が終了しています",
      body: "お手数ですが、出店者へ最新のURLをご確認ください。",
    },
    notfound: {
      icon: <SearchX className="h-7 w-7 text-gray-600" />,
      bg: "bg-gray-100",
      title: "このリンクは見つかりませんでした",
      body: "URLが途中で切れている可能性があります。出店者へご確認ください。",
    },
  }[status];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${content.bg}`}
        >
          {content.icon}
        </div>
        <h1 className="mb-3 text-lg font-bold text-gray-900">{content.title}</h1>
        <p className="text-sm leading-relaxed text-gray-600">{content.body}</p>
        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-500">
            この画面は{" "}
            <Link href="/" className="text-orange-600 hover:underline">
              てんむすび
            </Link>{" "}
            が提供しています
          </p>
        </div>
      </div>
    </div>
  );
}
