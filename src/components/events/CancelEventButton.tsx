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
}: {
  eventId: string;
  recipientCount: number;
  paidCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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
          {paidCount > 0 && (
            <p className="text-xs text-gray-500">
              出展料を支払い済みの出店者が {paidCount} 店います。返金は運営から各出店者へご連絡します。
              未払いの請求は自動で取り消されます。
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)} disabled={isWorking}>
            やめる
          </Button>
          <Button className="rounded-full bg-red-600 hover:bg-red-700" onClick={submit} disabled={isWorking}>
            {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            中止して知らせる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
