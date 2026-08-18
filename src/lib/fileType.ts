/**
 * ファイル種別をマジックナンバーで判定する。
 * 拡張子や FormData の file.type はクライアント申告なので信用しない。
 */

export type SniffedType = {
  mime: string;
  ext: string;
  isImage: boolean;
};

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function startsWith(buf: Buffer, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  return sig.every((byte, i) => buf[i] === byte);
}

export function sniffFileType(buf: Buffer): SniffedType | null {
  if (startsWith(buf, JPEG)) return { mime: "image/jpeg", ext: "jpg", isImage: true };
  if (startsWith(buf, PNG)) return { mime: "image/png", ext: "png", isImage: true };
  if (startsWith(buf, GIF87) || startsWith(buf, GIF89))
    return { mime: "image/gif", ext: "gif", isImage: true };

  // WebP: "RIFF" ....(4byte size).... "WEBP"
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp", isImage: true };
  }

  if (startsWith(buf, PDF)) return { mime: "application/pdf", ext: "pdf", isImage: false };

  return null;
}

/** 書類として受け付ける形式（画像 + PDF） */
export const DOCUMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

/** 画像のみを受け付ける箇所（メニュー写真など） */
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** 上限 10MB */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
