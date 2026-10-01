"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ThreadMessage {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string | null; image: string | null } | null;
  isMine: boolean;
}

function formatTime(value: string): string {
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return sameDay ? time : `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

export function ApplicationThread({
  applicationId,
  messages,
  canPost,
  closedReason,
  onPosted,
}: {
  applicationId: string;
  messages: ThreadMessage[];
  canPost: boolean;
  closedReason?: string;
  onPosted: (message: ThreadMessage) => void;
}) {
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async () => {
    if (!body.trim()) return;
    setIsSending(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      onPosted({ ...data.message, isMine: true });
      setBody("");
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="max-h-[60vh] overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-8">
            まだやり取りがありません
          </p>
        )}

        {messages.map((m) =>
          m.kind === "system" ? (
            <div key={m.id} className="flex justify-center">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                <Info className="h-3 w-3" />
                {m.body}
                <span className="text-gray-400">{formatTime(m.createdAt)}</span>
              </p>
            </div>
          ) : (
            <div
              key={m.id}
              className={`flex gap-2 ${m.isMine ? "flex-row-reverse" : "flex-row"}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={m.sender?.image ?? undefined} alt="" />
                <AvatarFallback className="text-xs">
                  {m.sender?.name?.slice(0, 1) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className={`min-w-0 max-w-[80%] ${m.isMine ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                    m.isMine
                      ? "bg-orange-500 text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-900 rounded-tl-sm"
                  }`}
                >
                  {m.body}
                </div>
                <p
                  className={`mt-1 text-[11px] text-gray-400 ${
                    m.isMine ? "text-right" : "text-left"
                  }`}
                >
                  {!m.isMine && m.sender?.name ? `${m.sender.name} ・ ` : ""}
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-gray-100 p-4">
        {canPost ? (
          <>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="条件の確認や質問をどうぞ"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
              }}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">⌘/Ctrl + Enter で送信</p>
              <Button
                size="sm"
                className="rounded-full"
                onClick={send}
                disabled={isSending || !body.trim()}
              >
                {isSending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                送信
              </Button>
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-gray-500 py-2">
            {closedReason ?? "このやり取りは終了しています"}
          </p>
        )}
      </div>
    </div>
  );
}
