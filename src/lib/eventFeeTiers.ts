/**
 * 区画・エリアごとの出展料。
 *
 * 一律の金額ではなく「Aエリア 8,000円 / 角地 15,000円」と実額を並べたい、という
 * 出店者側の要望から入れたもの（2026-08-27 MTG）。行は何本でも持てる。
 *
 * 一覧カード・検索・OGP は Event.exhibitFee / exhibitFeeMax だけを見る。区画の行を
 * すべて読ませると絞り込みが重くなるため、保存時にこの2列へ最安値と最高値を書き戻す。
 */

export interface FeeTierInput {
  label: string | null;
  fee: number;
  note: string | null;
  slots: number | null;
  widthM: number | null;
  depthM: number | null;
  order: number;
}

const toInt = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const toFloat = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toStr = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

/**
 * 受け取った区画の行を整える。金額が無い行は捨てる（入力途中の空行が混ざるため）。
 * 上限は 30 行。これ以上は掲載として読めないので、増やす前に見せ方を考えること。
 */
export function parseFeeTiers(value: unknown): FeeTierInput[] | null {
  if (!Array.isArray(value)) return null;

  const tiers: FeeTierInput[] = [];
  for (const raw of value.slice(0, 30)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const fee = toInt(row.fee);
    if (fee === null || fee < 0) continue;
    tiers.push({
      label: toStr(row.label, 60),
      fee,
      note: toStr(row.note, 120),
      slots: toInt(row.slots),
      widthM: toFloat(row.widthM),
      depthM: toFloat(row.depthM),
      order: tiers.length,
    });
  }
  return tiers;
}

/** 区画の行から、検索と一覧が使う最安値・最高値を出す。 */
export function deriveFeeRange(tiers: FeeTierInput[]): { fee: number; feeMax: number | null } {
  const fees = tiers.map((t) => t.fee);
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  return { fee: min, feeMax: max > min ? max : null };
}

/** 表示用のラベル。単一料金なら区画名を付けずに書けるようにしてある。 */
export function feeTierLabel(label: string | null | undefined): string {
  return label && label.trim() ? label : "出展料";
}

/**
 * 区画に足せるオプション料金（電源 +500円 など）。2026-09-10 MTG。
 * 名前の無い行・金額の無い行は捨てる。上限は 10 行。
 */
export interface FeeOptionInput {
  label: string;
  fee: number;
  note: string | null;
  order: number;
}

export function parseFeeOptions(value: unknown): FeeOptionInput[] | null {
  if (!Array.isArray(value)) return null;

  const options: FeeOptionInput[] = [];
  for (const raw of value.slice(0, 10)) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const label = toStr(row.label, 60);
    const fee = toInt(row.fee);
    if (!label || fee === null || fee < 0) continue;
    options.push({ label, fee, note: toStr(row.note, 120), order: options.length });
  }
  return options;
}

/** 請求額の初期値や明細に使う。区画の金額にオプションを足す。 */
export function sumSelectedFees(
  tierFee: number | null | undefined,
  options: { fee: number }[] | null | undefined
): number {
  return (tierFee ?? 0) + (options ?? []).reduce((sum, o) => sum + o.fee, 0);
}
