"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * カードの見出しに出す絵。
 *
 * /public/images/ に画像を置けばそれを出し、まだ置いていなければアイコンを出す。
 * 素材が揃ったものから順に差し替えられるようにするため、コード側では「ファイルが
 * あるかどうか」を判定しない（2026-08-28 決定）。
 *
 * 先に裏で読み込んでみて、成功したときだけ img を置く。img を先に置いてから失敗を
 * 待つ作りだと、画像が無い間はブラウザの「壊れた画像」の絵が一瞬出てしまう。
 *
 * next/image を使わないのは、まだ置いていない画像を最適化サーバー経由で取りに行くと
 * 失敗の扱いが分かりにくくなるため。48px前後の表示なので最適化の利点も小さい。
 */
export function CardIcon({
  src,
  icon: Icon,
  className = "h-12 w-12 rounded-xl",
  iconClassName = "h-6 w-6",
}: {
  src?: string;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    probe.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-primary/10 text-primary ${className}`}
    >
      {loaded && src ? (
        // 見出しがすぐ隣にあるので、画像そのものは飾り扱いにする
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-contain p-1.5" />
      ) : (
        <Icon className={iconClassName} />
      )}
    </div>
  );
}
