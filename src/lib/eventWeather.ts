/**
 * 雨天時の扱いと中止判断の期限。
 *
 * 屋外イベントでは雨天中止が日常的に起き、判断の期限が募集ごとにバラバラだと
 * 出店者は仕入れの判断ができない（キャンセル規定の叩き台 2026-08-28 第4条）。
 * 規定より先に、募集の入力項目として必須にしている。
 *
 * 中止時の出展料の扱いは、悪天候で中止でも主催者は場所を借りているため半額を
 * 払う慣行が多い（2026-09-03 MTG）。主催者が選べる形にしてあるが、選択制にするか
 * 一律にするかは法的な位置づけの確認待ち（2026-09-10 MTG で継続審議）。
 */

export const RAIN_POLICIES = [
  { value: "go", label: "雨天決行", description: "雨でも開催します。台風などの荒天時のみ中止を判断します" },
  { value: "storm_cancel", label: "荒天中止", description: "小雨なら開催し、荒天の場合に中止します" },
  { value: "rain_cancel", label: "雨天中止", description: "雨の予報なら中止します" },
] as const;

export type RainPolicy = (typeof RAIN_POLICIES)[number]["value"];

export const WEATHER_REFUND_OPTIONS = [
  { value: 100, label: "全額返金" },
  { value: 50, label: "半額返金" },
] as const;

// 判断期限の「何日前」。当日〜3日前まで。それより前に天気は読めない。
export const DECISION_DAY_OPTIONS = [
  { value: 0, label: "開催当日" },
  { value: 1, label: "開催前日" },
  { value: 2, label: "開催2日前" },
  { value: 3, label: "開催3日前" },
] as const;

export interface WeatherPolicyInput {
  rainPolicy: RainPolicy;
  weatherDecisionDaysBefore: number;
  weatherDecisionHour: number;
  weatherRefundPercent: number;
}

export function rainPolicyLabel(value: string | null | undefined): string | null {
  return RAIN_POLICIES.find((p) => p.value === value)?.label ?? null;
}

export function weatherRefundLabel(value: number | null | undefined): string | null {
  return WEATHER_REFUND_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

/** 「開催前日 18時まで」 */
export function decisionDeadlineLabel(
  daysBefore: number | null | undefined,
  hour: number | null | undefined
): string | null {
  if (daysBefore === null || daysBefore === undefined || hour === null || hour === undefined) {
    return null;
  }
  const day = DECISION_DAY_OPTIONS.find((d) => d.value === daysBefore)?.label;
  return day ? `${day} ${hour}時まで` : null;
}

// 日本時間のずれ。日本に夏時間は無いので固定でよい。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 判断期限の日時。開催日の0時から数えるので、複数日開催でも初日が基準になる。
 * 「前日18時」は日本時間で数える。サーバー（Vercel は UTC）の時刻で数えると9時間ずれる。
 */
export function decisionDeadlineAt(startAt: Date, daysBefore: number, hour: number): Date {
  const d = new Date(startAt.getTime() + JST_OFFSET_MS);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  d.setUTCHours(hour);
  return new Date(d.getTime() - JST_OFFSET_MS);
}

/** 受け取った値を検証する。足りなければ利用者向けのエラーを返す。 */
export function parseWeatherPolicy(
  body: Record<string, unknown>,
  startAt: Date
): { value: WeatherPolicyInput } | { error: string } {
  const rainPolicy = RAIN_POLICIES.find((p) => p.value === body.rainPolicy)?.value;
  if (!rainPolicy) {
    return { error: "雨天時の扱いを選んでください" };
  }

  const daysBefore = Number(body.weatherDecisionDaysBefore);
  const hour = Number(body.weatherDecisionHour);
  if (
    !DECISION_DAY_OPTIONS.some((d) => d.value === daysBefore) ||
    !Number.isInteger(hour) ||
    hour < 0 ||
    hour > 23
  ) {
    return { error: "中止を判断する期限を選んでください" };
  }
  // 当日判断で、開始時刻より後が期限だと、始まってから中止を決めることになる
  if (decisionDeadlineAt(startAt, daysBefore, hour) > startAt) {
    return { error: "中止を判断する期限は、開始時刻より前にしてください" };
  }

  const refund = Number(body.weatherRefundPercent);
  if (!WEATHER_REFUND_OPTIONS.some((o) => o.value === refund)) {
    return { error: "中止になった場合の出展料の扱いを選んでください" };
  }

  return {
    value: {
      rainPolicy,
      weatherDecisionDaysBefore: daysBefore,
      weatherDecisionHour: hour,
      weatherRefundPercent: refund,
    },
  };
}
