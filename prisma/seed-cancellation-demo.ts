/**
 * キャンセルの手続き（EventCancellation）を画面で確かめるためのデモデータ。ローカル専用。
 *
 *   RESEND_API_KEY=re_dummy npx tsx prisma/seed-cancellation-demo.ts
 *
 * 主催者・出店者・運営のデモアカウント（下の DEMO_ACCOUNTS）と、申し出前 / 主催者の
 * 受け付け待ち / 出店者の承認待ち / 合意できない / 確定済み の5つの応募を作る。
 * 実行するたびに作り直す。決済は本物ではないので、返金を伴う確定は Stripe でエラーになる
 * （「出店者の承認待ち」は返金0円なので、承認まで押せる）。
 * 確認するときは ENABLE_EVENT_PAYMENTS=true で dev サーバーを起動すること。
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { policyFeeFor } from "../src/lib/eventCancellation";

const DAY = 86400000;
// ローカルのデモ専用（example.invalid のアカウントにだけ使う）
export const DEMO_ACCOUNTS = {
  organizer: "demo-organizer@example.invalid",
  vendor: "demo-vendor@example.invalid",
  admin: "demo-admin@example.invalid",
  password: "cancel-demo-2026",
};
const PASS = DEMO_ACCOUNTS.password;

async function user(email: string, name: string, isAdmin = false) {
  const password = await bcrypt.hash(PASS, 10);
  return prisma.user.upsert({
    where: { email },
    update: { password, isAdmin, emailVerified: new Date() },
    create: { email, name, password, isAdmin, emailVerified: new Date() },
  });
}

async function main() {
  const org = await user(DEMO_ACCOUNTS.organizer, "デモ主催者");
  const ven = await user(DEMO_ACCOUNTS.vendor, "デモ出店者");
  await user(DEMO_ACCOUNTS.admin, "デモ運営", true);

  // 前回のデモを消して作り直す
  await prisma.event.deleteMany({ where: { title: { startsWith: "【キャンセルデモ】" } } });
  await prisma.store.deleteMany({ where: { name: { startsWith: "デモ店" }, ownerId: ven.id } });

  const op = await prisma.organizerProfile.upsert({
    where: { userId: org.id },
    update: { status: "approved", stripeChargesEnabled: true, stripePayoutsEnabled: true },
    create: { userId: org.id, orgName: "デモ主催", status: "approved", stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeAccountId: "acct_demo_cancel" },
  });

  const now = Date.now();
  const scenarios = [
    { key: "1_申し出前", days: 10, fee: 10000 },
    { key: "2_主催者の受け付け待ち", days: 10, fee: 10000, c: "requested" },
    { key: "3_出店者の承認待ち", days: 0.6, fee: 3000, c: "accepted" },
    { key: "4_合意できない", days: 5, fee: 8000, c: "disputed" },
    { key: "5_確定済み", days: 9, fee: 6000, c: "confirmed" },
  ] as const;

  const out: string[] = [];
  for (const s of scenarios) {
    const startAt = new Date(now + s.days * DAY);
    const ev = await prisma.event.create({
      data: {
        organizerId: op.id, title: `【キャンセルデモ】${s.key}`, venueName: "デモ会場", area: "東京都",
        startAt, endAt: new Date(startAt.getTime() + 6 * 3600000), exhibitFee: s.fee, status: "published",
        rainPolicy: "go", weatherDecisionDaysBefore: 1, weatherDecisionHour: 18, weatherRefundPercent: 100,
      },
    });
    const store = await prisma.store.create({ data: { name: `デモ店（${s.key}）`, ownerId: ven.id } });
    const app = await prisma.eventApplication.create({
      data: { eventId: ev.id, storeId: store.id, status: s.key.startsWith("5") ? "withdrawn" : "confirmed", confirmedAt: new Date(now - 20 * DAY), policyVersion: "2026-10-16.2", vendorPolicyAgreedAt: new Date(now - 21 * DAY), organizerPolicyAgreedAt: new Date(now - 20 * DAY) },
    });
    await prisma.eventPayment.create({
      data: { applicationId: app.id, description: "出店料", amount: s.fee, platformFee: s.fee / 10, status: "paid", paidAt: new Date(now - 19 * DAY), requestedById: org.id, stripePaymentIntentId: `pi_demo_${app.id}`, refundedAmount: s.key.startsWith("5") ? s.fee * 0.7 : 0 },
    });
    if ("c" in s) {
      const requestedAt = new Date(now - 1 * DAY);
      const p = policyFeeFor(s.fee, { requestedAt, startAt, confirmedAt: new Date(now - 20 * DAY) });
      await prisma.eventCancellation.create({
        data: {
          applicationId: app.id, kind: "vendor", status: s.c, requestedAt, requestedById: ven.id, paidAmount: s.fee, policyFee: p.fee,
          ...(s.c === "accepted" ? { refundAmount: p.refund, acceptedAt: new Date(now - 0.5 * DAY) } : {}),
          ...(s.c === "disputed" ? { disputedAt: new Date(now - 0.2 * DAY), disputedById: ven.id } : {}),
          ...(s.c === "confirmed" ? { refundAmount: s.fee * 0.7, confirmedAt: new Date(now - 0.3 * DAY), confirmedBy: "vendor", acceptedAt: new Date(now - 0.5 * DAY) } : {}),
        },
      });
    }
    out.push(`${s.key}: /events/applications/${app.id}`);
  }
  console.log(out.join("\n"));
  await prisma.$disconnect();
}
main();
