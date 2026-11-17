import { prisma } from "@/lib/prisma";
import { ALL_PREFECTURES } from "@/lib/constants";
import { isAcceptingApplications } from "@/lib/eventFormat";
import type { EventCardData } from "@/components/events/EventCard";

/**
 * 出店募集の一覧ページ（/boshu, /boshu/[pref]）の共通処理。
 *
 * 「キッチンカー 出店募集」「千葉 マルシェ 出店者募集」のような検索から出店者を呼ぶための入口。
 * 絞り込みのできる検索画面（/search?type=event）とは別に、検索エンジンに載せる固定の URL を持つ。
 */

/** 都道府県と URL の対応。URL は英字にする（共有されたときに崩れないように） */
export const PREFECTURE_SLUGS: Record<(typeof ALL_PREFECTURES)[number], string> = {
  北海道: "hokkaido",
  青森県: "aomori", 岩手県: "iwate", 宮城県: "miyagi", 秋田県: "akita", 山形県: "yamagata", 福島県: "fukushima",
  茨城県: "ibaraki", 栃木県: "tochigi", 群馬県: "gunma", 埼玉県: "saitama", 千葉県: "chiba", 東京都: "tokyo", 神奈川県: "kanagawa",
  新潟県: "niigata", 富山県: "toyama", 石川県: "ishikawa", 福井県: "fukui", 山梨県: "yamanashi", 長野県: "nagano",
  岐阜県: "gifu", 静岡県: "shizuoka", 愛知県: "aichi", 三重県: "mie",
  滋賀県: "shiga", 京都府: "kyoto", 大阪府: "osaka", 兵庫県: "hyogo", 奈良県: "nara", 和歌山県: "wakayama",
  鳥取県: "tottori", 島根県: "shimane", 岡山県: "okayama", 広島県: "hiroshima", 山口県: "yamaguchi",
  徳島県: "tokushima", 香川県: "kagawa", 愛媛県: "ehime", 高知県: "kochi",
  福岡県: "fukuoka", 佐賀県: "saga", 長崎県: "nagasaki", 熊本県: "kumamoto", 大分県: "oita", 宮崎県: "miyazaki", 鹿児島県: "kagoshima",
  沖縄県: "okinawa",
};

export function prefectureFromSlug(slug: string): string | null {
  const hit = Object.entries(PREFECTURE_SLUGS).find(([, s]) => s === slug);
  return hit ? hit[0] : null;
}

export function boshuPath(prefecture?: string | null): string {
  if (!prefecture) return "/boshu";
  const slug = PREFECTURE_SLUGS[prefecture as keyof typeof PREFECTURE_SLUGS];
  return slug ? `/boshu/${slug}` : "/boshu";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 応募を受け付けている（または募集開始前の）公開中の募集。開催日の近い順。
 * 締切の判定は募集ページと同じ isAcceptingApplications に合わせる（締切日は当日いっぱい）。
 */
export async function getOpenRecruitments(prefecture?: string | null): Promise<EventCardData[]> {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: "published",
      startAt: { gte: now },
      ...(prefecture ? { area: prefecture } : {}),
      OR: [{ applicationCloseAt: null }, { applicationCloseAt: { gte: new Date(now.getTime() - DAY_MS) } }],
    },
    orderBy: { startAt: "asc" },
    take: 200,
    select: {
      id: true,
      title: true,
      venueName: true,
      area: true,
      status: true,
      startAt: true,
      endAt: true,
      exhibitFee: true,
      exhibitFeeMax: true,
      feeNote: true,
      slots: true,
      applicationOpenAt: true,
      applicationCloseAt: true,
      powerAvailable: true,
      images: { orderBy: { order: "asc" }, take: 1, select: { id: true, url: true } },
      organizer: { select: { orgName: true } },
      _count: { select: { applications: true } },
    },
  });

  return events
    .filter((e) => {
      const r = isAcceptingApplications(e);
      return r.accepting || r.reason === "募集開始前です";
    })
    .map((e) => ({
      id: e.id,
      title: e.title,
      venueName: e.venueName,
      area: e.area,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      exhibitFee: e.exhibitFee,
      exhibitFeeMax: e.exhibitFeeMax,
      feeNote: e.feeNote,
      slots: e.slots,
      applicationOpenAt: e.applicationOpenAt?.toISOString() ?? null,
      applicationCloseAt: e.applicationCloseAt?.toISOString() ?? null,
      powerAvailable: e.powerAvailable,
      images: e.images,
      organizer: e.organizer,
      _count: e._count,
    }));
}

/** 都道府県ごとの件数（募集のある都道府県だけ、多い順） */
export function countByPrefecture(events: EventCardData[]): { prefecture: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (!(e.area in PREFECTURE_SLUGS)) continue;
    counts.set(e.area, (counts.get(e.area) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([prefecture, count]) => ({ prefecture, count }))
    .sort((a, b) => b.count - a.count);
}
