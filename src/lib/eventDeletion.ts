import { prisma } from "./prisma";
import { deleteFile } from "./storage";

/**
 * 募集を消す。運営だけが呼ぶ（主催者は削除を申請する）。
 *
 * 応募・やり取り・支払いは募集に紐づいて一緒に消える。お金の記録を失わないよう、
 * 支払いの行が1件でもある募集は消さず、中止で扱ってもらう。
 */
export async function deleteEvent(
  eventId: string
): Promise<{ ok: true; title: string; organizerUserId: string } | { ok: false; error: string; status: number }> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      organizer: { select: { userId: true } },
      images: { select: { url: true } },
    },
  });
  if (!event) return { ok: false, error: "募集が見つかりません", status: 404 };

  const payments = await prisma.eventPayment.count({ where: { application: { eventId } } });
  if (payments > 0) {
    return {
      ok: false,
      error: "出店料の請求・支払いの記録があるため削除できません。募集の中止で対応してください",
      status: 409,
    };
  }

  await prisma.event.delete({ where: { id: eventId } });
  // 画像は公開バケットに残るので、行を消したあとに片付ける
  await Promise.all(
    event.images.map((img) =>
      deleteFile(img.url).catch((e) => console.error("Event image delete error:", e))
    )
  );
  return { ok: true, title: event.title, organizerUserId: event.organizer.userId };
}
