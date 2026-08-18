import { prisma } from "./prisma";

/**
 * 公開ページ・印刷ページに渡すデータを組み立てる。
 *
 * ここが「何を外に出すか」の唯一の判断場所。呼び出し側は受け取ったものを
 * そのまま描画してよい、という約束にしている。
 *
 * - visibility が private の書類は配列に入れない
 * - visibility が meta_only の書類は fileUrl を持たない（キーそのものを載せない）
 * - ナンバープレートは plateNumberPublic が true のときだけ入る
 */

export type PublicDocument = {
  id: string;
  type: string;
  label: string | null;
  expiresOn: Date | null;
  isImage: boolean;
  /** visibility が public のときだけ存在する */
  fileUrl?: string;
};

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function buildApplicationView(storeId: string, token: string) {
  const [store, profile, documents, menuItems] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      include: {
        images: { where: { isDraft: false }, orderBy: { order: "asc" } },
        owner: { select: { name: true, email: true } },
      },
    }),
    prisma.storeApplicationProfile.findUnique({ where: { storeId } }),
    prisma.applicationDocument.findMany({
      where: { storeId, visibility: { in: ["public", "meta_only"] } },
      orderBy: { order: "asc" },
      select: {
        id: true,
        type: true,
        label: true,
        expiresOn: true,
        visibility: true,
        mimeType: true,
      },
    }),
    prisma.applicationMenuItem.findMany({
      where: { storeId },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!store) return null;

  const publicDocuments: PublicDocument[] = documents.map((doc) => {
    const base = {
      id: doc.id,
      type: doc.type,
      label: doc.label,
      expiresOn: doc.expiresOn,
      isImage: doc.mimeType.startsWith("image/"),
    };
    // meta_only はここで fileUrl を付けない。実体への経路をレスポンスに一切残さないため。
    if (doc.visibility !== "public") return base;
    return { ...base, fileUrl: `/s/${token}/doc/${doc.id}` };
  });

  return {
    store: {
      id: store.id,
      name: store.name,
      description: store.description,
      category: store.category,
      area: store.area,
      motto: store.motto,
      commitment: store.commitment,
      ownerIntro: store.ownerIntro,
      messageToOwners: store.messageToOwners,
      website: store.website,
      instagram: store.instagram,
      twitter: store.twitter,
      vehicleLength: store.vehicleLength,
      vehicleWidth: store.vehicleWidth,
      vehicleHeight: store.vehicleHeight,
      availableAreas: parseJsonArray(store.availableAreas),
      images: store.images.map((img) => ({ id: img.id, url: img.url })),
      ownerName: store.owner?.name ?? null,
    },
    profile: profile
      ? {
          phone: profile.phone,
          contactEmail: profile.contactEmail ?? store.owner?.email ?? null,
          openedOn: profile.openedOn,
          appeal: profile.appeal,
          vehicleType: profile.vehicleType,
          vehicleWeightKg: profile.vehicleWeightKg,
          // 出店者が明示的に公開を選んだときだけ載せる
          plateNumber: profile.plateNumberPublic ? profile.plateNumber : null,
          powerWatt: profile.powerWatt,
          hasGenerator: profile.hasGenerator,
          generatorModel: profile.generatorModel,
          generatorNoiseDb: profile.generatorNoiseDb,
          usesFire: profile.usesFire,
          fireType: profile.fireType,
          waterTankLiter: profile.waterTankLiter,
          minSpaceWidthM: profile.minSpaceWidthM,
          minSpaceDepthM: profile.minSpaceDepthM,
          maxServingsPerHour: profile.maxServingsPerHour,
          secondsPerServing: profile.secondsPerServing,
          availableDays: parseJsonArray(profile.availableDays),
          hasPrepKitchen: profile.hasPrepKitchen,
          prepKitchenNote: profile.prepKitchenNote,
        }
      : null,
    documents: publicDocuments,
    menuItems: menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      description: m.description,
      imageUrl: m.imageUrl,
    })),
  };
}

export type ApplicationView = NonNullable<Awaited<ReturnType<typeof buildApplicationView>>>;
