"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 主催者のフォロー。次の募集が公開されたときに知らせるためのもの。
 * 誰がフォローしているかは主催者に見えるので、そのことをここに書いておく。
 */
export function OrganizerFollowButton({
  organizerId,
  initialFollowing,
  initialCount,
  isSelf,
}: {
  organizerId: string;
  initialFollowing: boolean;
  initialCount: number;
  isSelf: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [isWorking, setIsWorking] = useState(false);

  // 自分の募集では出さない。フォロワー数だけ出す。
  if (isSelf) {
    return (
      <span className="text-xs text-gray-500">フォロワー {count}人</span>
    );
  }

  const toggle = async () => {
    if (status !== "authenticated") {
      // ログイン後は見ていた募集に戻す
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setIsWorking(true);
    try {
      const res = await fetch(`/api/organizers/${organizerId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setCount(data.count);
      }
    } catch {
      // 失敗したら状態は変えない
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={following ? "outline" : "default"}
        className="rounded-full"
        onClick={toggle}
        disabled={isWorking}
      >
        {isWorking ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : following ? (
          <BellOff className="mr-1.5 h-4 w-4" />
        ) : (
          <Bell className="mr-1.5 h-4 w-4" />
        )}
        {following ? "フォロー中" : "フォローする"}
      </Button>
      <span className="text-xs text-gray-500">
        フォロワー {count}人
        {!following && " ・ 次の募集が公開されたら通知します"}
      </span>
    </div>
  );
}
