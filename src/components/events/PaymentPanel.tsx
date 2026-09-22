"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateShort } from "@/lib/eventFormat";

export interface PaymentSummary {
  id: string;
  description: string;
  amount: number;
  platformFee?: number;
  payout?: number;
  status: string;
  refundedAmount: number;
  paidAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  paidOutAt?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  requested: "未払い",
  paid: "支払い済み",
  canceled: "取り消し",
  refunded: "返金済み",
};
const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  paid: "bg-green-100 text-green-700 hover:bg-green-100",
  canceled: "bg-gray-100 text-gray-500 hover:bg-gray-100",
  refunded: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

/**
 * 出展料の請求と支払い。出店が決まった応募にだけ出す。
 * 主催者は金額を決めて請求し、出店者はここから Stripe の支払い画面へ進む。
 */
export function PaymentPanel({
  applicationId,
  role,
  payments,
  payouts,
  defaultAmount,
  defaultDescription,
  returnedFromCheckout,
  onChanged,
}: {
  applicationId: string;
  role: "vendor" | "organizer" | "admin";
  payments: PaymentSummary[];
  payouts: { ready: boolean; feePercent: number; payoutDueAt: string } | null;
  defaultAmount: number | null;
  defaultDescription: string;
  returnedFromCheckout: boolean;
  onChanged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [description, setDescription] = useState(defaultDescription);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOrganizer = role === "organizer";
  const amountNum = Number(amount);
  const feePreview =
    payouts && Number.isInteger(amountNum) && amountNum > 0
      ? Math.floor((amountNum * payouts.feePercent) / 100)
      : null;
  const awaitingWebhook =
    returnedFromCheckout && role === "vendor" && payments.some((p) => p.status === "requested");

  const request = async () => {
    setWorkingId("new");
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, description }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "請求に失敗しました");
        return;
      }
      setShowForm(false);
      onChanged();
    } finally {
      setWorkingId(null);
    }
  };

  const cancel = async (paymentId: string) => {
    setWorkingId(paymentId);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "取り消しに失敗しました");
        return;
      }
      onChanged();
    } finally {
      setWorkingId(null);
    }
  };

  const pay = async (paymentId: string) => {
    setWorkingId(paymentId);
    setError("");
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/payments/${paymentId}/checkout`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "支払い画面を開けませんでした");
        setWorkingId(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("支払い画面を開けませんでした");
      setWorkingId(null);
    }
  };

  // 出店者側は請求が来るまで何も出さない。現金払いの主催者もいるので、空の枠は混乱のもと。
  if (!isOrganizer && payments.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <CreditCard className="h-4 w-4 text-orange-500" />
        出展料のお支払い
      </p>

      {awaitingWebhook && (
        <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800 flex items-start gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
          <div>
            お支払いを確認しています。反映まで少し時間がかかることがあります。
            <button type="button" className="ml-1 underline" onClick={onChanged}>
              再読み込み
            </button>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <p className="text-sm text-gray-500">
          まだ請求していません。出展料をオンラインで受け取る場合は、ここから請求できます。
          現金や振込で受け取る場合は、請求しなくてかまいません。
        </p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{p.description}</p>
                  <Badge className={STATUS_STYLE[p.status] ?? ""}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </Badge>
                </div>
                <p className="text-sm text-gray-900 mt-0.5">{yen(p.amount)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {p.status === "paid" && p.paidAt
                    ? `${formatDateShort(p.paidAt)} 支払い`
                    : `${formatDateShort(p.createdAt)} 請求`}
                  {isOrganizer && p.payout !== undefined && p.status !== "canceled" && (
                    <> ・ 手数料 {yen(p.platformFee ?? 0)} を差し引いた {yen(p.payout)} が入金されます</>
                  )}
                  {p.refundedAmount > 0 && p.status !== "refunded" && (
                    <> ・ {yen(p.refundedAmount)} 返金済み</>
                  )}
                </p>
                {isOrganizer && p.status === "paid" && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.paidOutAt
                      ? `${formatDateShort(p.paidOutAt)} 口座へ入金手続き済み`
                      : payouts?.payoutDueAt
                        ? `開催後、${formatDateShort(payouts.payoutDueAt)}ごろ口座へ入金します`
                        : "開催後に口座へ入金します"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {p.status === "requested" && role === "vendor" && (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => pay(p.id)}
                    disabled={workingId !== null}
                  >
                    {workingId === p.id ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="mr-1.5 h-4 w-4" />
                    )}
                    支払う
                  </Button>
                )}
                {p.status === "requested" && isOrganizer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-gray-500 hover:text-red-600"
                    onClick={() => cancel(p.id)}
                    disabled={workingId !== null}
                  >
                    {workingId === p.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    取り消す
                  </Button>
                )}
                {p.status === "paid" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
              </div>
            </li>
          ))}
        </ul>
      )}

      {isOrganizer && payouts && !payouts.ready && (
        <div className="rounded-xl bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              オンラインで受け取るには、受け取り口座の設定が必要です
            </p>
            <Button size="sm" variant="outline" className="rounded-full mt-2 bg-white" asChild>
              <Link href="/organizer">受け取り口座を設定する</Link>
            </Button>
          </div>
        </div>
      )}

      {isOrganizer && payouts?.ready && !showForm && (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          出展料を請求する
        </Button>
      )}

      {isOrganizer && payouts?.ready && showForm && (
        <div className="rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pay-desc" className="text-xs">品目</Label>
            <Input
              id="pay-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 60))}
              placeholder="出展料"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-amount" className="text-xs">金額（税込・円）</Label>
            <Input
              id="pay-amount"
              type="number"
              inputMode="numeric"
              min={50}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="8000"
            />
            {feePreview !== null && (
              <p className="text-xs text-gray-500">
                手数料 {payouts.feePercent}%（{yen(feePreview)}）を差し引いた{" "}
                {yen(amountNum - feePreview)} が入金されます
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-full"
              onClick={request}
              disabled={workingId !== null || !amount}
            >
              {workingId === "new" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              この内容で請求する
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setShowForm(false)}
              disabled={workingId !== null}
            >
              やめる
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        キャンセルと返金は
        <Link href="/cancel-policy" target="_blank" className="mx-0.5 text-orange-600 hover:underline">
          出展料のキャンセル規定
        </Link>
        に沿って扱います。
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
