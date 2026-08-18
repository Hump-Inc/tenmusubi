import { prisma } from "./prisma";
import { hashIp, hashUserAgent, getClientIp } from "./shareToken";

export type ShareLinkStatus = "ok" | "expired" | "revoked" | "notfound";

export type ResolvedShareLink = Awaited<ReturnType<typeof findShareLink>>;

async function findShareLink(token: string) {
  return prisma.shareLink.findUnique({
    where: { token },
    include: { store: { select: { id: true, name: true } } },
  });
}

/**
 * トークンから共有リンクを引く。
 * 失効・期限切れは 404 ではなく状態として返す。主催者に「壊れたリンクを送ってくる業者」
 * という印象を持たせないよう、呼び出し側で専用画面を出すため。
 */
export async function resolveShareLink(token: string): Promise<{
  status: ShareLinkStatus;
  link: ResolvedShareLink;
}> {
  const link = await findShareLink(token);
  if (!link) return { status: "notfound", link: null };
  if (link.revokedAt) return { status: "revoked", link };
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return { status: "expired", link };
  }
  return { status: "ok", link };
}

/** 同一IP・同一UAからの再訪をまとめる窓（5分） */
const VIEW_DEDUPE_MS = 5 * 60 * 1000;

/**
 * 閲覧を記録する。同一IP・同一UAからの5分以内の再訪は数えない。
 * 出店者に見せる閲覧回数がリロードで水増しされると、営業判断の材料にならないため。
 */
export async function recordShareLinkView(
  linkId: string,
  kind: "page" | "print",
  headers: Headers
): Promise<void> {
  const ipHash = hashIp(getClientIp(headers));
  const uaHash = hashUserAgent(headers.get("user-agent") || "");

  const recent = await prisma.shareLinkView.findFirst({
    where: {
      shareLinkId: linkId,
      kind,
      ipHash,
      uaHash,
      createdAt: { gt: new Date(Date.now() - VIEW_DEDUPE_MS) },
    },
    select: { id: true },
  });
  if (recent) return;

  const referer = headers.get("referer");

  await prisma.$transaction([
    prisma.shareLinkView.create({
      data: {
        shareLinkId: linkId,
        kind,
        ipHash,
        uaHash,
        referer: referer ? referer.slice(0, 500) : null,
      },
    }),
    prisma.shareLink.update({
      where: { id: linkId },
      data:
        kind === "print"
          ? { printCount: { increment: 1 } }
          : { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    }),
  ]);
}
