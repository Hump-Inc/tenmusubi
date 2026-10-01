import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * seed スクリプトの接続先。
 *
 * 既定はローカルの dev.db。SEED_TARGET=turso を指定したときだけ、
 * 環境変数の TURSO_DATABASE_URL に接続する。
 * 事故を防ぐため、本番のデータベース名が含まれる場合は止める。
 */
export function createSeedClient(): PrismaClient {
  const target = process.env.SEED_TARGET;

  if (target !== "turso") {
    return new PrismaClient({ adapter: new PrismaLibSql({ url: "file:prisma/dev.db" }) });
  }

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error("SEED_TARGET=turso には TURSO_DATABASE_URL と TURSO_AUTH_TOKEN が必要です");
  }
  // 本番に流し込む事故を防ぐ。確認用DBは名前に preview を含める運用にする。
  if (!url.includes("preview")) {
    throw new Error(
      `本番の可能性がある接続先には流せません: ${url}\n` +
        "確認用データベース（名前に preview を含むもの）を指定してください。"
    );
  }

  console.log(`接続先: ${url}`);
  return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
}
