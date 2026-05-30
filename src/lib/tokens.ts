import { randomUUID } from "crypto";
import { prisma } from "./prisma";

const EMAIL_VERIFY_PREFIX = "email-verify:";
const PASSWORD_RESET_PREFIX = "password-reset:";
const STORE_CLAIM_PREFIX = "store-claim:";

const EMAIL_VERIFY_EXPIRES_HOURS = 24;
const PASSWORD_RESET_EXPIRES_HOURS = 1;
const STORE_CLAIM_EXPIRES_HOURS = 24 * 60; // 60日（手渡し前提で長め）

export async function createEmailVerificationToken(email: string): Promise<string> {
  // 古いトークンを削除
  await prisma.verificationToken.deleteMany({
    where: { identifier: `${EMAIL_VERIFY_PREFIX}${email}` },
  });

  const token = randomUUID();
  const expires = new Date(Date.now() + EMAIL_VERIFY_EXPIRES_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: `${EMAIL_VERIFY_PREFIX}${email}`,
      token,
      expires,
    },
  });

  return token;
}

export async function createPasswordResetToken(email: string): Promise<string> {
  // 古いトークンを削除
  await prisma.verificationToken.deleteMany({
    where: { identifier: `${PASSWORD_RESET_PREFIX}${email}` },
  });

  const token = randomUUID();
  const expires = new Date(Date.now() + PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: `${PASSWORD_RESET_PREFIX}${email}`,
      token,
      expires,
    },
  });

  return token;
}

export async function createStoreClaimToken(storeId: string): Promise<string> {
  // 既存のクレームトークンを削除（1店舗1リンク）
  await prisma.verificationToken.deleteMany({
    where: { identifier: `${STORE_CLAIM_PREFIX}${storeId}` },
  });

  const token = randomUUID();
  const expires = new Date(Date.now() + STORE_CLAIM_EXPIRES_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: `${STORE_CLAIM_PREFIX}${storeId}`,
      token,
      expires,
    },
  });

  return token;
}

/**
 * クレームトークンを検証して storeId を返す。
 * consume=false の場合はトークンを消費しない（プレビュー用）。
 */
export async function verifyStoreClaimToken(
  token: string,
  { consume = false }: { consume?: boolean } = {}
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (!record.identifier.startsWith(STORE_CLAIM_PREFIX)) return null;
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  const storeId = record.identifier.slice(STORE_CLAIM_PREFIX.length);

  if (consume) {
    await prisma.verificationToken.delete({ where: { token } });
  }

  return storeId;
}

export async function deleteStoreClaimToken(storeId: string): Promise<void> {
  await prisma.verificationToken.deleteMany({
    where: { identifier: `${STORE_CLAIM_PREFIX}${storeId}` },
  });
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (!record.identifier.startsWith(EMAIL_VERIFY_PREFIX)) return null;
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  const email = record.identifier.slice(EMAIL_VERIFY_PREFIX.length);

  // 使用後に削除
  await prisma.verificationToken.delete({ where: { token } });

  return email;
}

export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (!record.identifier.startsWith(PASSWORD_RESET_PREFIX)) return null;
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  const email = record.identifier.slice(PASSWORD_RESET_PREFIX.length);

  // 使用後に削除
  await prisma.verificationToken.delete({ where: { token } });

  return email;
}
