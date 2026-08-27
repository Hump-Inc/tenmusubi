import { prisma } from "./prisma";

/**
 * 応募時に主催者へ渡る内容を組み立てる。
 *
 * ここに書類は入らない。営業許可証やPL保険証券は個人情報を含むので、
 * 応募の段階では経路そのものを作らず、やり取りの中で出店者が開示を決める。
 *
 * 応募時点の内容を固定して残すのは、出店者があとから申込情報を書き換えても、
 * 主催者が見て判断した内容が変わらないようにするため。
 */

export interface ApplicationSnapshot {
  storeName: string;
  category: string | null;
  area: string | null;
  description: string | null;
  motto: string | null;
  appeal: string | null;
  openedOn: string | null;
  // 車両
  vehicleType: string | null;
  vehicleLength: number | null;
  vehicleWidth: number | null;
  vehicleHeight: number | null;
  vehicleWeightKg: number | null;
  // 設備
  powerWatt: number | null;
  hasGenerator: boolean;
  generatorModel: string | null;
  generatorNoiseDb: number | null;
  usesFire: boolean;
  fireType: string | null;
  fireApplianceCount: number | null;
  waterTankLiter: number | null;
  minSpaceWidthM: number | null;
  minSpaceDepthM: number | null;
  // 営業条件
  maxServingsPerHour: number | null;
  secondsPerServing: number | null;
  availableDays: string[];
  hasPrepKitchen: boolean;
  prepKitchenNote: string | null;
  // メニュー
  menuItems: { name: string; price: number | null; description: string | null }[];
  // 希望する区画。区画ごとに金額が違う募集で、どれを見て応募したのかを残す。
  desiredFeeTier: { label: string | null; fee: number } | null;
  // 参考情報（書類の中身ではなく、提出できる書類の種類と有効期限だけ）
  documentSummary: { type: string; expiresOn: string | null }[];
  // 登録内容から今回だけ変えた項目のラベル。主催者が「この募集向けに直したもの」と
  // 分かるようにするため。
  adjustedFields: string[];
  capturedAt: string;
}

/**
 * 応募のたびに変わる項目。イベントごとにメニューも火気の台数も変わるので、
 * 登録内容を初期値にして応募時に上書きできるようにする（2026-08-27 MTG）。
 *
 * ここに無い項目（車両サイズ・書類・自己PRなど）はイベントで変わらないため、
 * 登録内容をそのまま使う。上書きしても登録内容そのものは書き換えない。
 */
export interface ApplicationOverrides {
  usesFire?: boolean;
  fireType?: string | null;
  fireApplianceCount?: number | null;
  hasGenerator?: boolean;
  powerWatt?: number | null;
  maxServingsPerHour?: number | null;
  minSpaceWidthM?: number | null;
  minSpaceDepthM?: number | null;
  /** 今回持って行くメニュー。未指定なら登録済みのすべて。 */
  menuItemIds?: string[];
  /** 希望する区画。募集側の行と突き合わせた結果をAPIが入れる。 */
  desiredFeeTier?: { label: string | null; fee: number } | null;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function buildApplicationSnapshot(
  storeId: string,
  overrides?: ApplicationOverrides
): Promise<ApplicationSnapshot | null> {
  const [store, profile, menuItems, documents] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.storeApplicationProfile.findUnique({ where: { storeId } }),
    prisma.applicationMenuItem.findMany({
      where: { storeId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, price: true, description: true },
    }),
    // 書類は「何を出せるか」だけ。ファイルへの経路は一切含めない。
    prisma.applicationDocument.findMany({
      where: { storeId, visibility: { not: "private" } },
      orderBy: { order: "asc" },
      select: { type: true, expiresOn: true },
    }),
  ]);

  if (!store) return null;

  // まず登録内容で組み立てる。上書きはこの後で当てる。
  const base = {
    usesFire: profile?.usesFire ?? false,
    fireType: profile?.fireType ?? null,
    fireApplianceCount: profile?.fireApplianceCount ?? null,
    hasGenerator: profile?.hasGenerator ?? false,
    powerWatt: profile?.powerWatt ?? null,
    maxServingsPerHour: profile?.maxServingsPerHour ?? null,
    minSpaceWidthM: profile?.minSpaceWidthM ?? null,
    minSpaceDepthM: profile?.minSpaceDepthM ?? null,
  };

  const adjustedFields: string[] = [];
  const adjusted = { ...base };

  const apply = <K extends keyof typeof base>(key: K, label: string) => {
    const value = overrides?.[key as keyof ApplicationOverrides];
    if (value === undefined) return;
    if (value === base[key]) return;
    adjusted[key] = value as (typeof base)[K];
    if (!adjustedFields.includes(label)) adjustedFields.push(label);
  };

  apply("usesFire", "火気");
  apply("fireType", "火気");
  apply("fireApplianceCount", "火気");
  apply("hasGenerator", "発電機");
  apply("powerWatt", "必要電源");
  apply("maxServingsPerHour", "提供食数");
  apply("minSpaceWidthM", "必要スペース");
  apply("minSpaceDepthM", "必要スペース");

  // 火気を使わないなら、種類と台数は残さない。判断材料として矛盾するため。
  if (!adjusted.usesFire) {
    adjusted.fireType = null;
    adjusted.fireApplianceCount = null;
  }

  // 今回持って行くメニュー。未指定なら登録済みのすべて。
  const selectedMenu = overrides?.menuItemIds
    ? menuItems.filter((m) => overrides.menuItemIds!.includes(m.id))
    : menuItems;
  if (overrides?.menuItemIds && selectedMenu.length !== menuItems.length) {
    adjustedFields.push("メニュー");
  }

  return {
    storeName: store.name,
    category: store.category,
    area: store.area,
    description: store.description,
    motto: store.motto,
    appeal: profile?.appeal ?? null,
    openedOn: profile?.openedOn ?? null,

    vehicleType: profile?.vehicleType ?? null,
    vehicleLength: store.vehicleLength,
    vehicleWidth: store.vehicleWidth,
    vehicleHeight: store.vehicleHeight,
    vehicleWeightKg: profile?.vehicleWeightKg ?? null,

    powerWatt: adjusted.powerWatt,
    hasGenerator: adjusted.hasGenerator,
    generatorModel: profile?.generatorModel ?? null,
    generatorNoiseDb: profile?.generatorNoiseDb ?? null,
    usesFire: adjusted.usesFire,
    fireType: adjusted.fireType,
    fireApplianceCount: adjusted.fireApplianceCount,
    waterTankLiter: profile?.waterTankLiter ?? null,
    minSpaceWidthM: adjusted.minSpaceWidthM,
    minSpaceDepthM: adjusted.minSpaceDepthM,

    maxServingsPerHour: adjusted.maxServingsPerHour,
    secondsPerServing: profile?.secondsPerServing ?? null,
    availableDays: parseJsonArray(profile?.availableDays ?? null),
    hasPrepKitchen: profile?.hasPrepKitchen ?? false,
    prepKitchenNote: profile?.prepKitchenNote ?? null,

    desiredFeeTier: overrides?.desiredFeeTier ?? null,
    menuItems: selectedMenu.map((m) => ({
      name: m.name,
      price: m.price,
      description: m.description,
    })),
    documentSummary: documents.map((d) => ({
      type: d.type,
      expiresOn: d.expiresOn ? d.expiresOn.toISOString() : null,
    })),
    adjustedFields,
    capturedAt: new Date().toISOString(),
  };
}

export function parseSnapshot(value: string | null): ApplicationSnapshot | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as ApplicationSnapshot;
  } catch {
    return null;
  }
}

/**
 * 照合に使う設備の値だけを取り出した型。応募のスナップショットのほかに、
 * まだ応募していない店舗の登録内容（スカウト候補）も同じ判定にかけられるようにする。
 */
export interface FitSpec {
  powerWatt: number | null;
  hasGenerator: boolean;
  usesFire: boolean;
  minSpaceWidthM: number | null;
  minSpaceDepthM: number | null;
}

/**
 * 募集の条件と、応募者の設備が噛み合っているか。
 * 主催者が可否を判断しやすくするために、応募一覧でも同じ判定を使う。
 */
export function checkFit(
  snapshot: FitSpec,
  event: {
    powerAvailable: boolean;
    powerWatt: number | null;
    fireAllowed: boolean;
    spaceWidthM: number | null;
    spaceDepthM: number | null;
  }
): { label: string; ok: boolean; detail: string }[] {
  const checks: { label: string; ok: boolean; detail: string }[] = [];

  if (snapshot.powerWatt) {
    if (!event.powerAvailable) {
      checks.push({
        label: "電源",
        ok: snapshot.hasGenerator,
        detail: snapshot.hasGenerator
          ? `会場に電源なし・発電機あり（${snapshot.powerWatt.toLocaleString()}W必要）`
          : `会場に電源がなく、発電機もありません（${snapshot.powerWatt.toLocaleString()}W必要）`,
      });
    } else if (event.powerWatt && snapshot.powerWatt > event.powerWatt) {
      checks.push({
        label: "電源",
        ok: snapshot.hasGenerator,
        detail: `会場の上限 ${event.powerWatt.toLocaleString()}W に対して ${snapshot.powerWatt.toLocaleString()}W 必要`,
      });
    } else {
      checks.push({
        label: "電源",
        ok: true,
        detail: `${snapshot.powerWatt.toLocaleString()}W（会場の範囲内）`,
      });
    }
  }

  if (snapshot.usesFire) {
    checks.push({
      label: "火気",
      ok: event.fireAllowed,
      detail: event.fireAllowed ? "使用可の会場" : "この会場では火気を使えません",
    });
  }

  if (snapshot.minSpaceWidthM && event.spaceWidthM) {
    const fits =
      snapshot.minSpaceWidthM <= event.spaceWidthM &&
      (!snapshot.minSpaceDepthM || !event.spaceDepthM || snapshot.minSpaceDepthM <= event.spaceDepthM);
    checks.push({
      label: "スペース",
      ok: fits,
      detail: `必要 ${snapshot.minSpaceWidthM}m × ${snapshot.minSpaceDepthM ?? "—"}m / 会場 ${event.spaceWidthM}m × ${event.spaceDepthM ?? "—"}m`,
    });
  }

  return checks;
}
