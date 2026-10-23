"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * 主催者が募集を中止するボタン。書いた理由は、やり取り中・出店決定済みの
 * 出店者全員へ、やり取りの画面・通知・メールでそのまま届く。
 */
export function CancelEventButton({
  eventId,
  recipientCount,
  paidCount,
  weatherRefundPercent,
}: {
  eventId: string;
  recipientCount: number;
  paidCount: number;
  // 天候などで中止したときに返す割合（募集ページに記載したもの）。未設定の募集は全額
  weatherRefundPercent: number | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cause, setCause] = useState<"weather" | "organizer" | null>(null);
  const weatherPercent = weatherRefundPercent ?? 100;
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, cause }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "中止に失敗しました");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("中止に失敗しました");
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !isWorking && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          この募集を中止する
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>この募集を中止しますか？</DialogTitle>
          <DialogDescription>
            {recipientCount > 0
              ? `やり取り中・出店決定済みの出店者 ${recipientCount} 店に、中止のお知らせが一斉に届きます（やり取りの画面・通知・メール）。`
              : "まだ知らせる出店者はいません。募集は非公開になります。"}
            中止したあとは元に戻せません。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="cancel-reason" className="text-sm font-medium text-gray-900">
            出店者へのメッセージ（任意）
          </label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            rows={4}
            placeholder="例: 台風の接近により、安全を考えて中止とします。ご準備いただいていた皆さま、申し訳ありません。"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-900">中止の理由</legend>
          {[
            {
              value: "weather" as const,
              label: "天候・災害など（主催者・出店者の責めによらない）",
              refund: `出店料の${weatherPercent}%を返金`,
            },
            { value: "organizer" as const, label: "主催者の都合", refund: "出店料を全額返金" },
          ].map((o) => (
            <label
              key={o.value}
              className={`flex items-start gap-2 rounded-xl border p-3 text-sm cursor-pointer ${
                cause === o.value ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="cancel-cause"
                className="mt-0.5"
                checked={cause === o.value}
                onChange={() => setCause(o.value)}
              />
              <span>
                <span className="text-gray-900">{o.label}</span>
                {paidCount > 0 && <span className="block text-xs text-gray-500">{o.refund}</span>}
              </span>
            </label>
          ))}
          {paidCount > 0 && (
            <p className="text-xs text-gray-500">
              出店料を支払い済みの出店者が {paidCount} 店います。中止すると、選んだ理由に沿ってその場で自動で返金します。
              未払いの請求は自動で取り消されます。
            </p>
          )}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={isWorking}>
            やめる
          </Button>
          <Button className="rounded-full bg-red-600 hover:bg-red-700" onClick={submit} disabled={isWorking || !cause}>
            {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            中止して知らせる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
