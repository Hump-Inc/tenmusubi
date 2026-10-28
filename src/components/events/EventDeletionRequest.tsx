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
 * 主催者が募集の削除を運営に申請する欄。募集を消せるのは運営だけ。
 * 申請中は、申請した日と理由を見せて取り下げられるようにする。
 */
export function EventDeletionRequest({
  eventId,
  requestedAt,
  reason: savedReason,
}: {
  eventId: string;
  requestedAt: string | null;
  reason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const call = async (method: "POST" | "DELETE") => {
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/deletion-request`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ reason }) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsWorking(false);
    }
  };

  if (requestedAt) {
    const d = new Date(requestedAt);
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">
          {d.getFullYear()}/{d.getMonth() + 1}/{d.getDate()} に削除を申請しました。運営が確認しています。
        </p>
        {savedReason && (
          <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            {savedReason}
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button variant="outline" size="sm" disabled={isWorking} onClick={() => call("DELETE")}>
          {isWorking && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          申請を取り下げる
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          削除を申請する
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>募集の削除を申請する</DialogTitle>
          <DialogDescription>
            募集の削除は運営が行います。削除すると、応募とそのやり取りも含めて元に戻せません。
            出店者に知らせて取りやめる場合は、削除ではなく「募集の中止」を使ってください。
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="削除したい理由（例：テストで作った募集のため）"
          rows={4}
          maxLength={1000}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isWorking}>
            閉じる
          </Button>
          <Button onClick={() => call("POST")} disabled={isWorking || !reason.trim()}>
            {isWorking && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            申請する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
