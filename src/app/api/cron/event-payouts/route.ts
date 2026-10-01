import { NextResponse } from "next/server";
import { runEventPayouts } from "@/lib/eventPayments";

/**
 * 開催が終わった募集の出展料を、主催者の口座へ入金する。1日1回、Vercel Cron から叩かれる。
 *
 * 他の cron と違い、本番では CRON_SECRET が無ければ動かさない。お金を動かす処理を
 * 誰でも叩ける状態にはしない（入金先は正しい主催者でも、タイミングは運営が握る）。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "CRON_SECRET が設定されていません" }, { status: 503 });
  }
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "権限がありません" }, { status: 401 });
  }

  try {
    const results = await runEventPayouts();
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Event payouts cron error:", error);
    return NextResponse.json({ error: "入金処理に失敗しました" }, { status: 500 });
  }
}
