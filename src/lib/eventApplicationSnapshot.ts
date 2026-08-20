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
  // 参考情報（書類の中身ではなく、提出できる書類の種類と有効期限だけ）
  documentSummary: { type: string; expiresOn: string | null }[];
  capturedAt: string;
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
  storeId: string
): Promise<ApplicationSnapshot | null> {
  const [store, profile, menuItems, documents] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.storeApplicationProfile.findUnique({ where: { storeId } }),
    prisma.applicationMenuItem.findMany({
      where: { storeId },
      orderBy: { order: "asc" },
      select: { name: true, price: true, description: true },
    }),
    // 書類は「何を出せるか」だけ。ファイルへの経路は一切含めない。
    prisma.applicationDocument.findMany({
      where: { storeId, visibility: { not: "private" } },
      orderBy: { order: "asc" },
      select: { type: true, expiresOn: true },
    }),
  ]);

  if (!store) return null;

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

    powerWatt: profile?.powerWatt ?? null,
    hasGenerator: profile?.hasGenerator ?? false,
    generatorModel: profile?.generatorModel ?? null,
    generatorNoiseDb: profile?.generatorNoiseDb ?? null,
    usesFire: profile?.usesFire ?? false,
    fireType: profile?.fireType ?? null,
    waterTankLiter: profile?.waterTankLiter ?? null,
    minSpaceWidthM: profile?.minSpaceWidthM ?? null,
    minSpaceDepthM: profile?.minSpaceDepthM ?? null,

    maxServingsPerHour: profile?.maxServingsPerHour ?? null,
    secondsPerServing: profile?.secondsPerServing ?? null,
    availableDays: parseJsonArray(profile?.availableDays ?? null),
    hasPrepKitchen: profile?.hasPrepKitchen ?? false,
    prepKitchenNote: profile?.prepKitchenNote ?? null,

    menuItems,
    documentSummary: documents.map((d) => ({
      type: d.type,
      expiresOn: d.expiresOn ? d.expiresOn.toISOString() : null,
    })),
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
 * 募集の条件と、応募者の設備が噛み合っているか。
 * 主催者が可否を判断しやすくするために、応募一覧でも同じ判定を使う。
 */
export function checkFit(
  snapshot: ApplicationSnapshot,
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
