import type { VerificationRequest } from "@prisma/client";
import { deleteFile, deletePrivateFile } from "./storage";

/**
 * 本人確認の申請。書類（身分証など）は非公開バケットに置き、保存先のキーや
 * URL は申請者にも返さない。見られるのは管理者だけ（/api/admin/verification/[id]/file）。
 */

export const VERIFICATION_DOCUMENT_TYPES = [
  "business_license",
  "food_license",
  "id_card",
  "registration_cert",
  "other",
];

/** 申請者・管理画面に返す形。書類の保存先は出さず、有無だけ返す */
export function publicRequest(r: VerificationRequest) {
  const { documentUrl, documentKey, ...rest } = r;
  return { ...rest, hasDocument: !!(documentKey || documentUrl) };
}

/** 書類を消す。旧形式（公開バケットのURL）も消す。失敗しても申請の処理は止めない */
export async function removeVerificationFiles(r: Pick<VerificationRequest, "documentKey" | "documentUrl">) {
  try {
    if (r.documentKey) await deletePrivateFile(r.documentKey);
    if (r.documentUrl) await deleteFile(r.documentUrl);
  } catch (e) {
    console.error("Verification file delete error:", e);
  }
}
