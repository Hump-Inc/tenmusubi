import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { jst } from "@/lib/eventFormat";
import { nextListingDate } from "@/lib/eventListing";

/**
 * 運営が載せたイベントのサムネイル（1200×630）。
 *
 * 情報元の写真は転載しない（著作権が撮影者・主催者にあるため）ので、
 * イベント名・開催日・市町村から画像を作る。カレンダーの各行・掲載ページ・
 * SNS で共有したときのプレビューに使う。
 */

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const md = (d: Date) => {
  const j = jst(d);
  return `${j.month}/${j.day}(${WEEK[j.weekday]})`;
};

/**
 * サイトと同じ Zen Maru Gothic を、画像に使う文字だけ取り寄せる。
 * 日本語の全字形を持つと数MBになるので、Google Fonts の text= で必要な字だけにする。
 * 取れなかったときは null（既定の字体で描く）。
 */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700&text=${encodeURIComponent(text)}`
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.eventListing.findUnique({
    where: { id },
    select: {
      title: true,
      startAt: true,
      endAt: true,
      city: true,
      venueName: true,
      status: true,
      dates: { orderBy: { startAt: "asc" }, select: { startAt: true, endAt: true } },
    },
  });
  if (!listing || listing.status !== "published") {
    return new Response("Not found", { status: 404 });
  }

  // 出す回: ?at=（その回の開始）があればその回、無ければ次回。
  // 開催日の行が無い古い掲載は、掲載の開始・終了を1回分として扱う。
  const dates = listing.dates.length > 0 ? listing.dates : [{ startAt: listing.startAt, endAt: listing.endAt }];
  const at = Number(new URL(request.url).searchParams.get("at"));
  const chosen =
    (at && dates.find((d) => d.startAt.getTime() === at)) || nextListingDate(dates) || dates[0];
  const sameDay = md(chosen.startAt) === md(chosen.endAt);
  const span = sameDay ? md(chosen.startAt) : `${md(chosen.startAt)}〜${md(chosen.endAt)}`;
  // 何回も開かれるイベントは、その回の日付に「ほか◯回」を添える
  const date = dates.length > 1 ? `${span}　ほか${dates.length - 1}回` : span;
  const place = `${listing.city}・${listing.venueName}`;
  const brand = "てんむすび 千葉のイベントカレンダー";
  const titleSize = listing.title.length > 22 ? 60 : 72;

  const font = await loadFont(`${listing.title}${date}${place}${brand}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#fdf6ee",
          borderLeft: "24px solid #d35f2d",
          fontFamily: font ? "Zen Maru Gothic" : undefined,
          color: "#2b2118",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: "#d35f2d" }} />
            <div style={{ width: 22, height: 22, borderRadius: 11, background: "#e8a86b" }} />
          </div>
          <div style={{ fontSize: 30, color: "#8a6a52" }}>{brand}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 54, color: "#d35f2d" }}>{date}</div>
          <div
            style={{
              display: "block",
              fontSize: titleSize,
              lineHeight: 1.3,
              lineClamp: 2,
            }}
          >
            {listing.title}
          </div>
        </div>

        <div style={{ display: "block", fontSize: 34, color: "#5c4a3d", lineClamp: 1 }}>{place}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: "Zen Maru Gothic", data: font, weight: 700, style: "normal" }] : undefined,
      headers: {
        // 掲載を直すと URL の v= が変わるので、長めに持たせてよい
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}
