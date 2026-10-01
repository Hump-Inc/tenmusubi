"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CANCELLATION_POLICY_IS_DRAFT } from "@/lib/cancellationPolicy";
import { weatherRefundLabel } from "@/lib/eventWeather";

/**
 * キャンセル規定の要点と同意欄。出店者は応募の前に、主催者は出店を決定する前に、
 * 同じ内容を読んで同意する（どちらも事前に確認できるようにする、2026-09-22）。
 * 規定の全文は別ページ。ここには判断に効く要点だけを出す。
 */
export function PolicyAgreement({
  role,
  weatherRefundPercent,
  agreed,
  onChange,
}: {
  role: "vendor" | "organizer";
  weatherRefundPercent: number | null | undefined;
  agreed: boolean;
  onChange: (agreed: boolean) => void;
}) {
  const weather = weatherRefundLabel(weatherRefundPercent);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-sm font-medium text-gray-900">
        出展料のキャンセル規定
        {CANCELLATION_POLICY_IS_DRAFT && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-normal text-amber-800">
            草案
          </span>
        )}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
        <li>出店者都合の取りやめは、開催15日前まで無料。14日前から30%、7日前から50%、前日・当日は100%</li>
        <li>主催者都合の取り消し・募集の中止は、出展料を全額返金</li>
        <li>
          天候などで中止になった場合、この募集では出展料を
          {weather ?? "（募集ページに記載の割合で）"}
          {weather ? "します" : "返金します"}
        </li>
        <li>連絡のない不出店は100%。あわせて一定期間、応募を停止します</li>
      </ul>
      <Link
        href="/cancel-policy"
        target="_blank"
        className="inline-flex items-center text-xs text-orange-600 hover:underline"
      >
        規定の全文を読む
        <ExternalLink className="ml-1 h-3 w-3" />
      </Link>
      <label className="flex items-start gap-2 text-sm text-gray-900 cursor-pointer">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-orange-500"
          checked={agreed}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {role === "vendor"
            ? "キャンセル規定を確認し、同意して応募します"
            : "キャンセル規定を確認し、同意して出店を決定します"}
        </span>
      </label>
    </div>
  );
}
