"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 募集の「気になる」。
 *
 * 迷っているうちに締切を過ぎてしまうのを防ぐためのものなので、
 * ボタンの下に「締切が近づいたら知らせる」ことを書いておく。
 */
export function EventFavoriteButton({
  eventId,
  initialFavorited,
  hasDeadline,
}: {
  eventId: string;
  initialFavorited: boolean;
  hasDeadline: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isWorking, setIsWorking] = useState(false);

  const toggle = async () => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsWorking(true);
    try {
      const res = await fetch(`/api/events/${eventId}/favorite`, {
        method: favorited ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setFavorited(data.favorited);
      }
    } catch {
      // 失敗したら状態は変えない
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="text-center">
      <Button
        type="button"
        size="lg"
        variant="outline"
        className="w-full rounded-full"
        onClick={toggle}
        disabled={isWorking}
      >
        {isWorking ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`mr-2 h-4 w-4 ${favorited ? "fill-current text-orange-500" : ""}`} />
        )}
        {favorited ? "気になるに登録済み" : "気になる"}
      </Button>
      {!favorited && (
        <p className="mt-2 text-xs text-gray-500">
          {hasDeadline
            ? "締切が近づいたらお知らせします"
            : "あとで見返せるようにマイページへ保存します"}
        </p>
      )}
    </div>
  );
}
