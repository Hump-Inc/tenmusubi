import { prisma } from "./prisma";
import { isAdmin } from "./auth";

/**
 * 応募スレッドを見られるのは、応募した店舗の所有者と、募集を出した主催者だけ。
 * 書類の開示もこの判定の上に乗るので、判定はここ1か所に集約する。
 */
export type ViewerRole = "vendor" | "organizer" | "admin";

export async function loadApplicationForViewer(applicationId: string, userId: string) {
  const application = await prisma.eventApplication.findUnique({
    where: { id: applicationId },
    include: {
      store: { select: { id: true, name: true, ownerId: true, category: true } },
      event: {
        select: {
          id: true,
          title: true,
          venueName: true,
          area: true,
          startAt: true,
          endAt: true,
          exhibitFee: true,
          exhibitFeeMax: true,
          feeNote: true,
          slots: true,
          powerAvailable: true,
          powerWatt: true,
          waterAvailable: true,
          fireAllowed: true,
          spaceWidthM: true,
          spaceDepthM: true,
          requiredDocuments: true,
          status: true,
          organizer: { select: { id: true, userId: true, orgName: true } },
        },
      },
    },
  });

  if (!application) {
    return { error: "応募が見つかりません", status: 404 as const };
  }

  let role: ViewerRole | null = null;
  if (application.store.ownerId === userId) role = "vendor";
  else if (application.event.organizer.userId === userId) role = "organizer";
  else if (await isAdmin(userId)) role = "admin";

  if (!role) {
    return { error: "この応募を見る権限がありません", status: 403 as const };
  }

  return { application, role };
}

/** 未読の起点。相手の投稿だけを未読として数えたいので、役割ごとに持つ。 */
export function readFieldFor(role: ViewerRole): "vendorLastReadAt" | "organizerLastReadAt" | null {
  if (role === "vendor") return "vendorLastReadAt";
  if (role === "organizer") return "organizerLastReadAt";
  return null; // 管理者が見ても既読にしない
}
