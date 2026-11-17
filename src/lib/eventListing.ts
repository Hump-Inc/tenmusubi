/**
 * 運営が載せるイベント（EventListing）と、開催カレンダーの共通処理。
 *
 * カレンダーには、運営が載せたイベントと主催者の出店募集（Event）を
 * 日付順に混ぜて並べる。どちらも「いつ・どこで」を先に知りたいので、
 * 一覧ではなく時系列にしている。
 */
import { jst, parseJstInput } from "@/lib/eventFormat";

/** カレンダーの対象。まずは千葉県全体から始める（2026-11-17 決定）。 */
export const CALENDAR_AREA = "千葉県";

/** 千葉県の市町村（54）。入力欄の選択肢と、住所からの市町村の読み取りに使う。 */
export const CHIBA_CITIES = [
  "千葉市", "銚子市", "市川市", "船橋市", "館山市", "木更津市", "松戸市", "野田市",
  "茂原市", "成田市", "佐倉市", "東金市", "旭市", "習志野市", "柏市", "勝浦市",
  "市原市", "流山市", "八千代市", "我孫子市", "鴨川市", "鎌ケ谷市", "君津市", "富津市",
  "浦安市", "四街道市", "袖ケ浦市", "八街市", "印西市", "白井市", "富里市", "南房総市",
  "匝瑳市", "香取市", "山武市", "いすみ市", "大網白里市",
  "酒々井町", "栄町", "神崎町", "多古町", "東庄町", "九十九里町", "芝山町", "横芝光町",
  "一宮町", "睦沢町", "長生村", "白子町", "長柄町", "長南町", "大多喜町", "御宿町",
  "鋸南町",
] as const;

/**
 * 住所から市町村を読み取る。主催者の募集（Event）は市町村の列を持たないので、
 * カレンダーではこれで絞り込む。「鎌ヶ谷市」「袖ヶ浦市」の表記ゆれも拾う。
 * 住所の中でいちばん前に出てくるものを取る（「成田市栄町」の町名「栄町」を拾わないように）。
 */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const normalized = address.replace(/[ヶヵ]/g, "ケ");
  let best: { city: string; at: number } | null = null;
  for (const city of CHIBA_CITIES) {
    const at = normalized.indexOf(city);
    if (at < 0) continue;
    if (!best || at < best.at || (at === best.at && city.length > best.city.length)) {
      best = { city, at };
    }
  }
  return best?.city ?? null;
}

export type CalendarPeriod = "upcoming" | "weekend" | "nextweek" | "month";

export const CALENDAR_PERIOD_LABELS: Record<CalendarPeriod, string> = {
  upcoming: "これから",
  weekend: "今週末",
  nextweek: "来週",
  month: "今月",
};

export function parseCalendarPeriod(value: string | null | undefined): CalendarPeriod {
  return value === "weekend" || value === "nextweek" || value === "month" ? value : "upcoming";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 日本時間で now の日の 0時から days 日後の 0時 */
function jstDayStart(now: Date, days = 0): Date {
  const j = jst(now);
  return new Date(Date.UTC(j.year, j.month - 1, j.day + days) - JST_OFFSET_MS);
}

/**
 * 期間の範囲。開催中のイベントも出すため、from には「終了が from 以降」を当てる。
 * - 今週末: 次の土曜 0時〜月曜 0時（土日なら、その週末の残り）
 * - 来週: 次の月曜 0時〜その次の月曜 0時
 * - 今月: 今〜来月1日 0時
 * - これから: 今〜90日後
 */
export function calendarRange(period: CalendarPeriod, now = new Date()): { from: Date; to: Date } {
  const weekday = jst(now).weekday; // 0 = 日
  switch (period) {
    case "weekend": {
      if (weekday === 6) return { from: now, to: jstDayStart(now, 2) };
      if (weekday === 0) return { from: now, to: jstDayStart(now, 1) };
      return { from: jstDayStart(now, 6 - weekday), to: jstDayStart(now, 8 - weekday) };
    }
    case "nextweek": {
      const toMonday = weekday === 0 ? 1 : 8 - weekday;
      return { from: jstDayStart(now, toMonday), to: jstDayStart(now, toMonday + 7) };
    }
    case "month": {
      const j = jst(now);
      return { from: now, to: new Date(Date.UTC(j.year, j.month, 1) - JST_OFFSET_MS) };
    }
    default:
      return { from: now, to: new Date(now.getTime() + 90 * DAY_MS) };
  }
}

/** 日本時間の日付のキー（"2026-11-22"）。カレンダーで日ごとにまとめるのに使う。 */
export function jstDateKey(d: Date): string {
  const j = jst(d);
  return `${j.year}-${String(j.month).padStart(2, "0")}-${String(j.day).padStart(2, "0")}`;
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** 「11/22(土)」 */
export function formatMonthDay(d: Date): string {
  const j = jst(d);
  return `${j.month}/${j.day}(${WEEK[j.weekday]})`;
}

/** 「10:00〜15:00」。日をまたぐ場合は終わりの日付も付ける。 */
export function formatTimeRange(start: Date, end: Date): string {
  const s = jst(start);
  const e = jst(end);
  const t = (j: ReturnType<typeof jst>) => `${j.hour}:${String(j.minute).padStart(2, "0")}`;
  const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;
  return sameDay ? `${t(s)}〜${t(e)}` : `${t(s)}〜${e.month}/${e.day} ${t(e)}`;
}

/** 日本時間の ISO 文字列（"2026-11-22T10:00:00+09:00"）。構造化データ用。 */
export function jstIso(d: Date): string {
  const j = jst(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.year}-${p(j.month)}-${p(j.day)}T${p(j.hour)}:${p(j.minute)}:00+09:00`;
}

/** datetime-local の初期値（"2026-11-22T10:00"） */
export function jstInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return jstIso(date).slice(0, 16);
}

/**
 * Google のイベント検索に載せるための構造化データ（schema.org/Event）。
 * https://developers.google.com/search/docs/appearance/structured-data/event
 */
export function eventJsonLd(input: {
  name: string;
  description?: string | null;
  startAt: Date;
  endAt: Date;
  venueName: string;
  address?: string | null;
  area: string;
  city?: string | null;
  url: string;
  organizerName?: string | null;
  organizerUrl?: string | null;
  image?: string | null;
  cancelled?: boolean;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    startDate: jstIso(input.startAt),
    endDate: jstIso(input.endAt),
    eventStatus: input.cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: input.venueName,
      address: {
        "@type": "PostalAddress",
        addressCountry: "JP",
        addressRegion: input.area,
        ...(input.city ? { addressLocality: input.city } : {}),
        ...(input.address ? { streetAddress: input.address } : {}),
      },
    },
    ...(input.organizerName
      ? {
          organizer: {
            "@type": "Organization",
            name: input.organizerName,
            ...(input.organizerUrl ? { url: input.organizerUrl } : {}),
          },
        }
      : {}),
    ...(input.image ? { image: [input.image] } : {}),
    url: input.url,
  };
}

/**
 * JSON-LD を <script> に埋め込むときの文字列。
 * 本文に "</script>" が入っていてもタグが閉じないよう、< をエスケープする。
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export interface ListingInput {
  title: string;
  description: string | null;
  venueName: string;
  address: string | null;
  area: string;
  city: string;
  startAt: Date;
  endAt: Date;
  organizerName: string | null;
  sourceUrl: string;
  checkedAt: Date;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v ? v.slice(0, max) : null;
}

/**
 * 管理画面から送られた掲載内容を確かめる。日時は日本時間として読む。
 * 情報元の URL は必須（載せるのは事実だけで、詳細は情報元へ案内するため）。
 */
export function parseListingInput(
  body: Record<string, unknown>
): { ok: true; value: ListingInput } | { ok: false; error: string } {
  const title = text(body.title, 120);
  const venueName = text(body.venueName, 120);
  const city = text(body.city, 40);
  const sourceUrl = text(body.sourceUrl, 2000);
  const startAt = parseJstInput(body.startAt);
  const endAt = parseJstInput(body.endAt);

  if (!title) return { ok: false, error: "イベント名を入力してください" };
  if (!venueName) return { ok: false, error: "会場を入力してください" };
  if (!city || !(CHIBA_CITIES as readonly string[]).includes(city)) {
    return { ok: false, error: "市町村を選んでください" };
  }
  if (!startAt || !endAt) return { ok: false, error: "開始と終了の日時を入力してください" };
  if (endAt < startAt) return { ok: false, error: "終了は開始より後にしてください" };
  if (!sourceUrl) return { ok: false, error: "情報元のURLを入力してください" };
  try {
    const u = new URL(sourceUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return { ok: false, error: "情報元のURLが正しくありません" };
  }

  return {
    ok: true,
    value: {
      title,
      description: text(body.description, 400),
      venueName,
      address: text(body.address, 200),
      area: CALENDAR_AREA,
      city,
      startAt,
      endAt,
      organizerName: text(body.organizerName, 120),
      sourceUrl,
      checkedAt: parseJstInput(body.checkedAt) ?? new Date(),
    },
  };
}

/**
 * 掲載のサムネイルの URL。掲載を直したら画像も変わるよう、更新時刻を付けてキャッシュを分ける。
 * 画像は src/app/listings/[id]/thumbnail/route.tsx が作る。
 */
export function listingThumbnailPath(listing: { id: string; updatedAt: Date }): string {
  return `/listings/${listing.id}/thumbnail?v=${listing.updatedAt.getTime()}`;
}
