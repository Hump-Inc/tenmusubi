const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

export function formatEventDate(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  const sameDay =
    s.getFullYear() === e.getFullYear() &&
    s.getMonth() === e.getMonth() &&
    s.getDate() === e.getDate();

  const date = (d: Date) =>
    `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEK[d.getDay()]})`;
  const time = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

  return sameDay
    ? `${date(s)} ${time(s)}〜${time(e)}`
    : `${date(s)} ${time(s)} 〜 ${date(e)} ${time(e)}`;
}

export function formatDateShort(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
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
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

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
