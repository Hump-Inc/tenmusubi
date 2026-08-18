import sharp from "sharp";
import { sniffFileType, type SniffedType } from "./fileType";

export type SanitizedFile = {
  buffer: Buffer;
  mime: string;
  ext: string;
  isImage: boolean;
};

/**
 * アップロードされたファイルを検証し、画像であれば再エンコードする。
 *
 * sharp は明示的に withMetadata() を呼ばない限りメタデータを引き継がないため、
 * 再エンコードした時点で EXIF（GPS情報を含む）は除去される。
 * 回転情報だけは見た目が崩れるので rotate() で画素に焼き込んでから捨てる。
 */
export async function sanitizeUpload(
  buffer: Buffer,
  allowedMimes: string[]
): Promise<{ ok: true; file: SanitizedFile } | { ok: false; error: string }> {
  const sniffed: SniffedType | null = sniffFileType(buffer);

  if (!sniffed) {
    return { ok: false, error: "対応していないファイル形式です" };
  }
  if (!allowedMimes.includes(sniffed.mime)) {
    return { ok: false, error: "対応していないファイル形式です" };
  }

  if (!sniffed.isImage) {
    // PDF はそのまま保存する（EXIF の概念がない）
    return {
      ok: true,
      file: { buffer, mime: sniffed.mime, ext: sniffed.ext, isImage: false },
    };
  }

  try {
    const image = sharp(buffer, { failOn: "error" }).rotate();

    // GIF はアニメーションを壊さないよう GIF のまま、それ以外は JPEG に寄せる
    const output =
      sniffed.mime === "image/gif"
        ? { buffer: await image.gif().toBuffer(), mime: "image/gif", ext: "gif" }
        : sniffed.mime === "image/png"
          ? { buffer: await image.png().toBuffer(), mime: "image/png", ext: "png" }
          : {
              buffer: await image.jpeg({ quality: 88 }).toBuffer(),
              mime: "image/jpeg",
              ext: "jpg",
            };

    return { ok: true, file: { ...output, isImage: true } };
  } catch {
    return { ok: false, error: "画像を読み取れませんでした" };
  }
}
