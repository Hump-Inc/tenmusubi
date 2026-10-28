/**
 * 本人確認の書類を、公開バケットから非公開バケットへ移す（1回だけ実行する）。
 *
 * 以前は /api/upload 経由で公開バケット（R2_PUBLIC_URL）に置いていたため、
 * URL を知っていれば誰でも身分証などを取得できた。documentUrl を持つ申請について、
 * 中身を非公開バケットへ移して documentKey に付け替え、公開側のファイルを消す。
 *
 * 既定では対象を表示するだけ。--apply を付けると実際に移す。
 *   本番: NODE_ENV=production npx tsx --env-file=.env prisma/migrate-verification-docs.ts [--apply]
 */
import { randomBytes } from "crypto";
import { prisma } from "../src/lib/prisma";
import { deleteFile, uploadPrivateFile } from "../src/lib/storage";
import { sanitizeUpload } from "../src/lib/imageSanitize";
import { DOCUMENT_MIME_TYPES } from "../src/lib/fileType";

const apply = process.argv.includes("--apply");

async function main() {
  const targets = await prisma.verificationRequest.findMany({
    where: { documentUrl: { not: null }, documentKey: null },
    select: { id: true, userId: true, documentUrl: true, status: true },
  });
  console.log(`対象: ${targets.length}件${apply ? "" : "（--apply なしのため表示のみ）"}`);

  let moved = 0;
  for (const t of targets) {
    const url = t.documentUrl!;
    console.log(`- ${t.id} (${t.status}) ${url}`);
    if (!apply) continue;

    const res = await fetch(url);
    if (!res.ok) {
      // 公開側にもう無い。参照だけ外す
      console.log(`  取得できませんでした（${res.status}）。参照を外します`);
      await prisma.verificationRequest.update({ where: { id: t.id }, data: { documentUrl: null } });
      continue;
    }
    const sanitized = await sanitizeUpload(Buffer.from(await res.arrayBuffer()), DOCUMENT_MIME_TYPES);
    if (!sanitized.ok) {
      console.log(`  読み取れませんでした（${sanitized.error}）。公開側のファイルは残します`);
      continue;
    }
    const key = `verification/${t.userId}/${randomBytes(16).toString("hex")}.${sanitized.file.ext}`;
    await uploadPrivateFile(sanitized.file.buffer, key, sanitized.file.mime);
    await prisma.verificationRequest.update({
      where: { id: t.id },
      data: { documentKey: key, documentUrl: null },
    });
    await deleteFile(url);
    moved++;
    console.log(`  移しました → ${key}`);
  }
  if (apply) console.log(`移した件数: ${moved}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
