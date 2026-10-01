const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 日付はすべて日本時間で扱う。
 *
 * サーバーのタイムゾーンに任せると、Vercel（UTC）で描画したページだけ9時間ずれる
 * （10:00〜16:00 の募集が 1:00〜7:00 と出る）。Vercel では TZ を変えられないので、
 * 日本時間の値を UTC の getter で読む形にしている。日本に夏時間は無いので固定でよい。
 */
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jst(d: Date) {
  const t = new Date(d.getTime() + JST_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    weekday: t.getUTCDay(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
  };
}

/**
 * フォームの datetime-local / date の値（タイムゾーンなし）を日本時間として読む。
 * new Date("2026-10-11T10:00") はサーバーの時刻として解釈されるので使わない。
 * すでにタイムゾーンが付いている値（ISO 文字列）はそのまま読む。
 */
export function parseJstInput(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  let iso = v;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) iso = `${v}T00:00:00+09:00`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) iso = `${v}:00+09:00`;
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) iso = `${v}+09:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 日本時間の y年m月1日 0時。m は 1〜12（13 を渡すと翌年1月になる）。 */
export function jstMonthStart(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1) - JST_OFFSET_MS);
}

export function formatEventDate(start: Date | string, end: Date | string): string {
  const s = jst(typeof start === "string" ? new Date(start) : start);
  const e = jst(typeof end === "string" ? new Date(end) : end);
  const sameDay = s.year === e.year && s.month === e.month && s.day === e.day;

  const date = (d: ReturnType<typeof jst>) =>
    `${d.year}年${d.month}月${d.day}日(${WEEK[d.weekday]})`;
  const time = (d: ReturnType<typeof jst>) =>
    `${d.hour}:${String(d.minute).padStart(2, "0")}`;

  return sameDay
    ? `${date(s)} ${time(s)}〜${time(e)}`
    : `${date(s)} ${time(s)} 〜 ${date(e)} ${time(e)}`;
}

export function formatDateShort(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const j = jst(d);
  return `${j.year}年${j.month}月${j.day}日`;
}

/**
 * 出展料の表示。区画で金額が変わる募集は max を持つので「8,000円〜15,000円」と幅で出す。
 * 幅がある場合に「無料」と言い切ってしまうと誤解を招くので、下限0円は「0円〜」にする。
 */
export function formatFee(
  fee: number,
  note?: string | null,
  max?: number | null
): string {
  const hasRange = typeof max === "number" && max > fee;
  const yen = (v: number) => `${v.toLocaleString()}円`;
  const base = hasRange
    ? `${yen(fee)}〜${yen(max)}`
    : fee === 0
      ? "無料"
      : yen(fee);
  return note ? `${base}（${note}）` : base;
}

/**
 * 一覧カードに出す募集期間。区画やエリアで出展料が変わる募集が多く、一律の金額を
 * 大きく出すより「いつからいつまで応募できるか」の方が判断に使える（2026-08-27 MTG）。
 * 募集開始前のものも一覧に載せるので、開始前は「9/14〜11/3」と期間そのものを出す。
 */
export function formatApplicationPeriod(
  openAt: Date | string | null,
  closeAt: Date | string | null
): { text: string; beforeOpen: boolean } {
  const toDate = (v: Date | string | null) => {
    if (!v) return null;
    const d = typeof v === "string" ? new Date(v) : v;
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const md = (d: Date) => `${jst(d).month}/${jst(d).day}`;

  const open = toDate(openAt);
  const close = toDate(closeAt);
  const beforeOpen = !!open && open.getTime() > Date.now();

  if (open && close) {
    return { text: beforeOpen ? `募集 ${md(open)}〜${md(close)}` : `募集 〜${md(close)}`, beforeOpen };
  }
  if (open) return { text: beforeOpen ? `募集 ${md(open)}〜` : "募集受付中", beforeOpen };
  if (close) return { text: `募集 〜${md(close)}`, beforeOpen: false };
  return { text: "募集受付中", beforeOpen: false };
}

/** 募集を受け付けている状態かどうか */
export function isAcceptingApplications(event: {
  status: string;
  applicationOpenAt: Date | string | null;
  applicationCloseAt: Date | string | null;
  startAt: Date | string;
}): { accepting: boolean; reason: string | null } {
  if (event.status !== "published") return { accepting: false, reason: "この募集は公開されていません" };

  const now = Date.now();
  const toTime = (v: Date | string | null) =>
    v ? (typeof v === "string" ? new Date(v) : v).getTime() : null;

  const open = toTime(event.applicationOpenAt);
  if (open && now < open) return { accepting: false, reason: "募集開始前です" };

  const close = toTime(event.applicationCloseAt);
  if (close) {
    // 締切日は当日いっぱいまで受け付ける
    if (now > close + 24 * 60 * 60 * 1000 - 1) {
      return { accepting: false, reason: "募集は締め切られました" };
    }
  }

  const start = toTime(event.startAt);
  if (start && now > start) return { accepting: false, reason: "開催日を過ぎています" };

  return { accepting: true, reason: null };
}

export function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** 有効期限が切れているか。書類の表示で使う。 */
export function isExpiredDate(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const d = typeof value === "string" ? new Date(value) : value;
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}
