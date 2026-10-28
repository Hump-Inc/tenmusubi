"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarX2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateShort } from "@/lib/eventFormat";

export interface CancellationSummary {
  id: string;
  kind: "vendor" | "organizer" | "event";
  status: "requested" | "accepted" | "disputed" | "confirmed";
  requestedAt: string;
  paidAmount: number;
  policyFee: number;
  policyRefund: number;
  refundAmount: number | null;
  acceptedAt: string | null;
  disputedAt: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  autoConfirmAt: string | null;
}

export interface CancelPreview {
  paidAmount: number;
  feePercent: number;
  policyFee: number;
  policyRefund: number;
}

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

/**
 * 出店料を払ったあとのキャンセル（キャンセル規定 第3条・第7条）。
 * 出店者は申し出て承認する、主催者は受け付ける（または主催者都合で取り消す）、
 * 合意できなければ運営が決める。どの段階でも「いま何待ちで、いつ自動で決まるか」を出す。
 */
export function CancellationPanel({
  applicationId,
  role,
  cancellation,
  preview,
  onChanged,
}: {
  applicationId: string;
  role: "vendor" | "organizer" | "admin";
  cancellation: CancellationSummary | null;
  preview: CancelPreview | null;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [refund, setRefund] = useState(
    String(cancellation?.refundAmount ?? cancellation?.policyRefund ?? "")
  );
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  if (!cancellation && !preview) return null;

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/cancellation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "処理に失敗しました");
        return;
      }
      setConfirming(null);
      setReason("");
      onChanged();
    } catch {
      setError("処理に失敗しました");
    } finally {
      setWorking(false);
    }
  };

  const spinner = working && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />;
  // 理由は、やり取りの欄にその人のメッセージとして残る
  const reasonField = (label: string, placeholder: string) => (
    <div className="space-y-1.5">
      <Label htmlFor="cancel-reason" className="text-xs">
        {label}
      </Label>
      <Textarea
        id="cancel-reason"
        rows={3}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={placeholder}
        className="bg-white"
      />
    </div>
  );
  const closeConfirm = () => {
    setConfirming(null);
    setReason("");
  };
  const deadline = cancellation?.autoConfirmAt ? formatDateShort(cancellation.autoConfirmAt) : null;
  const disputeButton = (
    <Button
      variant="ghost"
      size="sm"
      className="rounded-full text-gray-500"
      onClick={() => setConfirming("dispute")}
      disabled={working}
    >
      合意できない
    </Button>
  );

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <CalendarX2 className="h-4 w-4 text-orange-500" />
        キャンセル
      </p>

      {/* まだ手続きが無い */}
      {!cancellation && preview && role === "vendor" && (
        <>
          <p className="text-sm text-gray-700">
            出店を取りやめる場合は、ここから申し出てください。主催者へのメッセージだけでは受け付けられません。
          </p>
          <p className="text-sm text-gray-900">
            今申し出ると、キャンセル料 {yen(preview.policyFee)}（{preview.feePercent}%）、返金額{" "}
            {yen(preview.policyRefund)} です。
          </p>
          {confirming === "request" ? (
            <div className="rounded-xl bg-red-50 p-4 space-y-2">
              <p className="text-sm text-red-900">
                キャンセルを申し出ます。申し出た時刻でキャンセル料が決まり、取り消すことはできません。
              </p>
              {reasonField("主催者へのひとこと（任意）", "理由やお詫びなど。書かなくても申し出られます")}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => act("request", { reason })} disabled={working}>
                  {spinner}キャンセルを申し出る
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={closeConfirm} disabled={working}>
                  やめる
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setConfirming("request")}>
              キャンセルを申し出る
            </Button>
          )}
        </>
      )}

      {!cancellation && preview && role === "organizer" && (
        <>
          <p className="text-sm text-gray-700">
            主催者の都合で出店を取り消す場合は、ここから行ってください。お支払い済みの{" "}
            {yen(preview.paidAmount)} は全額が出店者に返金されます。
          </p>
          {confirming === "organizer_cancel" ? (
            <div className="rounded-xl bg-red-50 p-4 space-y-2">
              <p className="text-sm text-red-900">
                出店を取り消し、{yen(preview.paidAmount)} を全額返金します。取り消すことはできません。
              </p>
              {reasonField("取り消す理由（必須・出店者に届きます）", "例: 会場の都合で区画数が減ったため")}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" className="rounded-full" onClick={() => act("organizer_cancel", { reason })} disabled={working || !reason.trim()}>
                  {spinner}主催者都合で取り消す
                </Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={closeConfirm} disabled={working}>
                  やめる
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="rounded-full text-gray-500 hover:text-red-600" onClick={() => setConfirming("organizer_cancel")}>
              主催者都合で取り消す
            </Button>
          )}
        </>
      )}

      {cancellation && (
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            {cancellation.kind === "organizer"
              ? "主催者都合の取り消し"
              : cancellation.kind === "event"
                ? "募集の中止による返金"
                : "出店者からのキャンセルの申し出"}
            （
            {formatDateShort(cancellation.requestedAt)}）
          </p>
          {cancellation.kind === "vendor" && (
            <p className="text-xs text-gray-500">
              お支払い済み {yen(cancellation.paidAmount)} ・ 規定のキャンセル料 {yen(cancellation.policyFee)} ・
              規定の返金額 {yen(cancellation.policyRefund)}
            </p>
          )}
        </div>
      )}

      {/* 主催者の受け付け待ち */}
      {cancellation?.status === "requested" && cancellation.kind === "vendor" && role === "organizer" && (
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm text-gray-900">
            内容を確認して受け付けてください。
            {deadline && <>{deadline}以降も受け付けがない場合、規定の金額で確定します。</>}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-refund" className="text-xs">
              返金額（{yen(cancellation.policyRefund)}〜{yen(cancellation.paidAmount)}）
            </Label>
            <Input
              id="cancel-refund"
              type="number"
              inputMode="numeric"
              min={cancellation.policyRefund}
              max={cancellation.paidAmount}
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
            />
            <p className="text-xs text-gray-500">規定より多く返金する場合だけ、金額を変えられます。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => act("accept", { refundAmount: Number(refund) })} disabled={working || !refund}>
              {spinner}この内容で受け付ける
            </Button>
            {disputeButton}
          </div>
        </div>
      )}
      {cancellation?.status === "requested" && cancellation.kind === "vendor" && role === "vendor" && (
        <div className="space-y-2">
          <p className="text-sm text-gray-900">
            主催者の受け付けを待っています。
            {deadline && <>{deadline}以降も受け付けがない場合、返金額 {yen(cancellation.policyRefund)} で確定します。</>}
          </p>
          {disputeButton}
        </div>
      )}

      {/* 募集の中止の返金が通らなかった。運営が確定する */}
      {cancellation?.status === "requested" && cancellation.kind === "event" && role !== "admin" && (
        <p className="text-sm text-gray-900">返金の処理を運営が確認しています。それまで主催者への入金は行いません。</p>
      )}

      {/* 出店者の承認待ち */}
      {cancellation?.status === "accepted" && cancellation.refundAmount !== null && role === "vendor" && (
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm text-gray-900">
            {cancellation.kind === "event"
              ? `天候などによる中止のため、返金額は ${yen(cancellation.refundAmount)} です。`
              : `主催者が返金額 ${yen(cancellation.refundAmount)} で受け付けました。`}
            承認すると返金します。
            {deadline && <>{deadline}以降も承認がない場合、この金額で確定します。</>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => act("approve")} disabled={working}>
              {spinner}承認して返金を受ける
            </Button>
            {disputeButton}
          </div>
        </div>
      )}
      {cancellation?.status === "accepted" && cancellation.refundAmount !== null && role === "organizer" && (
        <p className="text-sm text-gray-900">
          返金額 {yen(cancellation.refundAmount)}
          {cancellation.kind === "event" ? "の内容で" : "で受け付けました。"}出店者の承認を待っています。
          {deadline && <>{deadline}以降は自動で確定します。</>}
        </p>
      )}

      {/* 合意できない → 運営の判断 */}
      {confirming === "dispute" && (
        <div className="rounded-xl bg-amber-50 p-4 space-y-2">
          <p className="text-sm text-amber-900">
            運営がやり取りの記録をもとに返金額を決めます。決まった内容には、主催者・出店者とも従っていただきます。
          </p>
          {reasonField("合意できない理由（必須・相手と運営に届きます）", "例: 申し出の前日に電話で伝えていたので、その日で計算してほしい")}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => act("dispute", { reason })} disabled={working || !reason.trim()}>
              {spinner}運営に判断を求める
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full" onClick={closeConfirm} disabled={working}>
              やめる
            </Button>
          </div>
        </div>
      )}
      {cancellation?.status === "disputed" && role !== "admin" && (
        <p className="text-sm text-gray-900">
          運営が返金額を判断しています。それまで主催者への入金は行いません。補足があれば
          <Link href="/contact" className="mx-0.5 text-orange-600 hover:underline">
            お問い合わせ窓口
          </Link>
          へご連絡ください。
        </p>
      )}

      {/* 運営: いつでも額を決めて確定できる */}
      {cancellation && cancellation.status !== "confirmed" && role === "admin" && (
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-900">
            {cancellation.status === "disputed"
              ? `合意できないとして申し立てがあります（${formatDateShort(cancellation.disputedAt)}）`
              : cancellation.status === "accepted" && cancellation.refundAmount !== null
                ? cancellation.kind === "event"
                  ? `天候などによる中止で返金額 ${yen(cancellation.refundAmount)}、出店者の承認待ちです`
                  : `主催者が返金額 ${yen(cancellation.refundAmount)} で受け付け、出店者の承認待ちです`
                : "主催者の受け付け待ちです"}
            {deadline && cancellation.status !== "disputed" && <>（{deadline}以降に自動で確定）</>}
          </p>
          <p className="text-sm text-gray-900">運営として返金額を決めて確定します（0円〜{yen(cancellation.paidAmount)}）。</p>
          <Input type="number" inputMode="numeric" min={0} max={cancellation.paidAmount} value={refund} onChange={(e) => setRefund(e.target.value)} />
          <Button size="sm" className="rounded-full" onClick={() => act("resolve", { refundAmount: Number(refund) })} disabled={working || refund === ""}>
            {spinner}この金額で確定して返金する
          </Button>
        </div>
      )}

      {cancellation?.status === "confirmed" && cancellation.refundAmount !== null && (
        <p className="text-sm text-gray-900">
          {formatDateShort(cancellation.confirmedAt)} に確定しました。返金額 {yen(cancellation.refundAmount)}
          {cancellation.paidAmount - cancellation.refundAmount > 0 && (
            <>・キャンセル料 {yen(cancellation.paidAmount - cancellation.refundAmount)}</>
          )}
        </p>
      )}

      <p className="text-xs text-gray-500">
        <Link href="/cancel-policy" target="_blank" className="text-orange-600 hover:underline">
          出店料のキャンセル規定
        </Link>
        に沿って扱います。
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
