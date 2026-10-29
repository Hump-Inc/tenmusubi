"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/**
 * Vercel Web Analytics（ページの閲覧数・訪問者数）。Cookie は使わない。
 *
 * URL に鍵の役割をする文字列が入るページがあるので、送る前に伏せる。
 * - /s/[token]（出店申込の共有リンク）、/stores/claim/[token]（店舗の引き継ぎ）
 * - ?token=（メール確認・パスワード再設定）など。クエリは下の許可した項目だけ残す
 */
const TOKEN_PATHS = [/^\/s\/[^/]+/, /^\/stores\/claim\/[^/]+/];
// 検索の種類（出店者・出店場所・募集）とカテゴリは、どの探し方が使われているかを見るのに残す
const KEPT_PARAMS = ["type", "category"];

function redact(event: BeforeSendEvent): BeforeSendEvent {
  const url = new URL(event.url);
  const kept = new URLSearchParams();
  for (const key of KEPT_PARAMS) {
    const value = url.searchParams.get(key);
    if (value) kept.set(key, value);
  }
  url.search = kept.toString();
  url.hash = "";
  for (const pattern of TOKEN_PATHS) {
    url.pathname = url.pathname.replace(pattern, (m) => m.replace(/[^/]+$/, "[token]"));
  }
  return { ...event, url: url.toString() };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={redact} />;
}
