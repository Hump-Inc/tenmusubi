import { WEEKDAYS, vehicleTypeLabel, fireTypeLabel } from "./constants";

export function formatDateJa(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatMonthJa(value: string | null | undefined): string | null {
  if (!value) return null;
  const [year, month] = value.split("-");
  if (!year) return value;
  return month ? `${year}年${Number(month)}月` : `${year}年`;
}

export function isExpired(value: Date | string | null | undefined): boolean {
  if (!value) return false;
  const d = typeof value === "string" ? new Date(value) : value;
  return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
}

export function formatDays(days: string[]): string | null {
  if (days.length === 0) return null;
  if (days.length === 7) return "毎日";
  // 選択順ではなく曜日順に並べる
  return WEEKDAYS.filter((d) => days.includes(d.value))
    .map((d) => d.label)
    .join("・");
}

export function formatVehicleSize(
  length: number | null,
  width: number | null,
  height: number | null
): string | null {
  if (!length && !width && !height) return null;
  const part = (v: number | null) => (v ? `${v}` : "—");
  return `全長 ${part(length)} × 全幅 ${part(width)} × 全高 ${part(height)} cm`;
}

export function formatSpace(width: number | null, depth: number | null): string | null {
  if (!width && !depth) return null;
  const part = (v: number | null) => (v ? `${v}` : "—");
  return `間口 ${part(width)}m × 奥行 ${part(depth)}m`;
}

/**
 * 主催者が可否判断する項目を、聞かれる順に並べて返す。
 * 公開ページと印刷用ページで同じ内容・同じ順序にしておきたいのでここに集約する。
 */
export function buildSpecRows(profile: {
  powerWatt: number | null;
  hasGenerator: boolean;
  generatorModel: string | null;
  generatorNoiseDb: number | null;
  usesFire: boolean;
  fireType: string | null;
  waterTankLiter: number | null;
  minSpaceWidthM: number | null;
  minSpaceDepthM: number | null;
}): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  rows.push({
    label: "必要電源",
    value: profile.powerWatt ? `${profile.powerWatt.toLocaleString()} W` : "不要 / 未登録",
  });

  if (profile.hasGenerator) {
    const detail = [profile.generatorModel, profile.generatorNoiseDb ? `${profile.generatorNoiseDb}dB` : null]
      .filter(Boolean)
      .join(" / ");
    rows.push({ label: "発電機", value: detail ? `あり（${detail}）` : "あり" });
  } else {
    rows.push({ label: "発電機", value: "なし" });
  }

  rows.push({
    label: "火気使用",
    value: profile.usesFire
      ? `あり（${fireTypeLabel(profile.fireType) ?? "種類未登録"}）`
      : "なし",
  });

  if (profile.waterTankLiter) {
    rows.push({ label: "給排水タンク", value: `${profile.waterTankLiter} L` });
  }

  const space = formatSpace(profile.minSpaceWidthM, profile.minSpaceDepthM);
  if (space) rows.push({ label: "必要スペース", value: space });

  return rows;
}

export function buildVehicleRows(
  store: { vehicleLength: number | null; vehicleWidth: number | null; vehicleHeight: number | null },
  profile: {
    vehicleType: string | null;
    vehicleWeightKg: number | null;
    plateNumber: string | null;
  } | null
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];

  const type = vehicleTypeLabel(profile?.vehicleType);
  if (type) rows.push({ label: "車両種別", value: type });

  const size = formatVehicleSize(store.vehicleLength, store.vehicleWidth, store.vehicleHeight);
  if (size) rows.push({ label: "車両サイズ", value: size });

  if (profile?.vehicleWeightKg) {
    rows.push({ label: "車両重量", value: `${profile.vehicleWeightKg.toLocaleString()} kg` });
  }
  if (profile?.plateNumber) {
    rows.push({ label: "ナンバー", value: profile.plateNumber });
  }

  return rows;
}
