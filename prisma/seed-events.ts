/**
 * イベント出店募集と出店申込パックの動作確認用ダミーデータ。
 *
 *   npx tsx prisma/seed-events.ts
 *
 * 既存の seed.ts が作ったユーザー・店舗を使う。何度実行しても
 * 同じ状態になるよう、このスクリプトが作ったデータは先に消してから作り直す。
 * 本番では実行しないこと。
 */
import { randomBytes } from "crypto";
import { createSeedClient } from "./seed-target";

const prisma = createSeedClient();

const day = 24 * 60 * 60 * 1000;
const at = (offsetDays: number, hour = 10) => {
  const d = new Date(Date.now() + offsetDays * day);
  d.setHours(hour, 0, 0, 0);
  return d;
};

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("このスクリプトは本番では実行しないでください");
  }

  // seed.ts の割り当て（user1=管理者 / user2〜10=出店者 / user11〜20=オーナー）に合わせて
  // メールアドレスで選ぶ。作成順は保証されないため。
  const pick = async (email: string) =>
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  const adminUser = await pick("user1@example.com");
  const approvedUser = await pick("user11@example.com");
  const pendingUser = await pick("user12@example.com");
  const users = [adminUser, approvedUser, pendingUser].filter(Boolean);
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    take: 6,
  });
  if (users.length < 3 || !approvedUser || !pendingUser || stores.length < 3) {
    throw new Error("先に npx prisma db seed で基本データを作ってください");
  }

  // 作り直し（このスクリプトが作るものだけ消す）
  await prisma.organizerFollow.deleteMany({});
  await prisma.organizerProfile.deleteMany({});
  await prisma.storeApplicationProfile.deleteMany({});
  await prisma.applicationDocument.deleteMany({});
  await prisma.applicationMenuItem.deleteMany({});
  await prisma.shareLink.deleteMany({});
  console.log("既存のダミーデータを削除しました");

  // ---- 主催者 ----
  const approved = await prisma.organizerProfile.create({
    data: {
      userId: approvedUser.id,
      orgName: "世田谷マルシェ実行委員会",
      contactName: "山田 花子",
      phone: "03-1234-5678",
      website: "https://example.com/setagaya-marche",
      intro:
        "毎月第2日曜に世田谷公園でマルシェを開催しています。2023年から通算20回、平均来場者数は3,000人ほどです。キッチンカーは毎回8〜12台にご出店いただいています。",
      status: "approved",
      reviewedAt: new Date(),
    },
  });

  const pending = await prisma.organizerProfile.create({
    data: {
      userId: pendingUser.id,
      orgName: "商店会イベント部",
      contactName: "鈴木 一郎",
      phone: "045-000-0000",
      intro: "商店街の夏祭りでキッチンカーを募集したいと考えています。",
      status: "pending",
    },
  });
  console.log(`主催者: 承認済み「${approved.orgName}」/ 審査待ち「${pending.orgName}」`);

  // ---- イベント ----
  const events = [
    {
      title: "秋の世田谷マルシェ",
      description:
        "地域の農家さんとキッチンカーが集まる、月に一度のマルシェです。ファミリー層の来場が多く、テイクアウトのフードが人気です。\n\n搬入は8:00から可能です。前日の場所決めミーティングはありません。",
      venueName: "世田谷公園 中央広場",
      address: "東京都世田谷区池尻1-5-27",
      area: "東京都",
      startAt: at(45, 10),
      endAt: at(45, 16),
      applicationOpenAt: at(-15),
      applicationCloseAt: at(30),
      slots: 12,
      // 区画ごとの実額。exhibitFee / exhibitFeeMax はこの行の最安値・最高値と揃える。
      exhibitFee: 12000,
      exhibitFeeMax: 18000,
      feeNote: "+売上の10%",
      feeTiers: {
        create: [
          { label: "Aエリア（正面ゲート横）", fee: 18000, slots: 2, widthM: 4, depthM: 6, note: "角地・電源1500Wまで", order: 0 },
          { label: "Bエリア（芝生広場）", fee: 14000, slots: 6, widthM: 4, depthM: 6, order: 1 },
          { label: "Cエリア（並木沿い）", fee: 12000, slots: 4, widthM: 3, depthM: 5, note: "電源なし・発電機可", order: 2 },
        ],
      },
      spaceWidthM: 4,
      spaceDepthM: 6,
      powerAvailable: true,
      powerWatt: 1500,
      waterAvailable: false,
      fireAllowed: true,
      categories: JSON.stringify(["キッチンカー", "ハンドメイドショップ"]),
      requiredDocuments: JSON.stringify(["business_license", "food_hygiene", "pl_insurance"]),
      expectedVisitors: 3000,
      note: "ゴミは各自お持ち帰りください。発電機を使う場合は騒音値をお知らせください。",
      status: "published",
      publishedAt: new Date(),
    },
    {
      title: "冬のイルミネーションフェス 出店者募集",
      description:
        "駅前広場のイルミネーション点灯に合わせた夕方からのイベントです。温かい food の需要が高い回です。",
      venueName: "三軒茶屋駅前広場",
      address: "東京都世田谷区太子堂2-16",
      area: "東京都",
      startAt: at(80, 15),
      endAt: at(80, 21),
      applicationOpenAt: at(20),
      applicationCloseAt: at(70),
      slots: 8,
      exhibitFee: 20000,
      spaceWidthM: 3,
      spaceDepthM: 5,
      powerAvailable: true,
      powerWatt: 2000,
      waterAvailable: true,
      fireAllowed: true,
      categories: JSON.stringify(["キッチンカー"]),
      requiredDocuments: JSON.stringify(["business_license", "pl_insurance"]),
      expectedVisitors: 5000,
      status: "published",
      publishedAt: new Date(),
    },
    {
      title: "こどもフェスタ 2026",
      description: "小学校のグラウンドで行う地域のこども向けイベントです。",
      venueName: "〇〇小学校 グラウンド",
      area: "東京都",
      startAt: at(25, 9),
      endAt: at(25, 15),
      applicationOpenAt: at(-60),
      applicationCloseAt: at(-3),
      slots: 6,
      exhibitFee: 8000,
      powerAvailable: false,
      waterAvailable: false,
      fireAllowed: false,
      categories: JSON.stringify(["キッチンカー"]),
      expectedVisitors: 1200,
      status: "published",
      publishedAt: new Date(),
    },
    {
      // マイページの「過去に実施したイベント」を確認するための開催済み1件
      title: "夏の商店街ナイトマーケット",
      description: "商店街の歩行者天国で行った夜のマーケットです。",
      venueName: "〇〇商店街 歩行者天国",
      area: "東京都",
      startAt: at(-40, 17),
      endAt: at(-40, 21),
      applicationOpenAt: at(-100),
      applicationCloseAt: at(-55),
      slots: 10,
      exhibitFee: 10000,
      powerAvailable: true,
      powerWatt: 1000,
      waterAvailable: false,
      fireAllowed: true,
      categories: JSON.stringify(["キッチンカー"]),
      expectedVisitors: 3000,
      status: "closed",
      publishedAt: new Date(),
    },
    {
      // 開催月の「◯年◯月以降」と、募集開始前カードの表示を確かめるための遠い先の1件
      title: "さくらフェスティバル 2027",
      description: "桜の開花に合わせた春の大型イベントです。募集は開催の3ヶ月前から始めます。",
      venueName: "県立中央公園",
      area: "神奈川県",
      startAt: at(230, 10),
      endAt: at(231, 17),
      applicationOpenAt: at(140),
      applicationCloseAt: at(215),
      slots: 40,
      exhibitFee: 15000,
      exhibitFeeMax: 25000,
      feeNote: null,
      feeTiers: {
        create: [
          { label: "大区画（5m×4m）", fee: 25000, slots: 10, widthM: 5, depthM: 4, order: 0 },
          { label: "中区画（4m×3m）", fee: 20000, slots: 20, widthM: 4, depthM: 3, order: 1 },
          { label: "小区画（3m×3m）", fee: 15000, slots: 10, widthM: 3, depthM: 3, note: "テント出店向け", order: 2 },
        ],
      },
      spaceWidthM: 5,
      spaceDepthM: 4,
      powerAvailable: true,
      powerWatt: 1500,
      waterAvailable: true,
      fireAllowed: true,
      categories: JSON.stringify(["キッチンカー", "ハンドメイドショップ"]),
      expectedVisitors: 20000,
      status: "published",
      publishedAt: new Date(),
    },
    {
      title: "（下書き）春のさくらマルシェ",
      description: "まだ会場と日程を調整中です。",
      venueName: "調整中",
      area: "神奈川県",
      startAt: at(150, 10),
      endAt: at(150, 16),
      slots: 10,
      exhibitFee: 0,
      powerAvailable: true,
      waterAvailable: false,
      fireAllowed: true,
      status: "draft",
    },
  ];

  for (const e of events) {
    await prisma.event.create({ data: { ...e, organizerId: approved.id } });
  }
  console.log(
    `イベント: ${events.length}件（募集中1 / 募集開始前2 / 締切済み1 / 開催済み1 / 下書き1）`
  );

  // ---- 主催者のフォロー ----
  // 承認済みの主催者を、店舗を持っている出店者が何人かフォローしている状態にする。
  // 新着募集の通知と、スカウト画面の「フォロー中」表示を確かめるためのもの。
  const followerOwnerIds = Array.from(
    new Set(stores.map((s) => s.ownerId).filter((id): id is string => !!id))
  ).filter((id) => id !== approvedUser.id);

  for (const userId of followerOwnerIds.slice(0, 3)) {
    await prisma.organizerFollow.create({
      data: { userId, organizerId: approved.id },
    });
  }
  console.log(`主催者のフォロー: ${Math.min(followerOwnerIds.length, 3)}件`);

  // ---- 出店申込パック（応募時に主催者へ渡る情報） ----
  const profiles = [
    {
      store: stores[0],
      phone: "090-1111-2222",
      openedOn: "2020-04",
      appeal:
        "国産小麦のクレープを提供しています。オペレーションは2名体制で、ピーク時も1時間80食まで対応できます。搬入から撤収まで、周辺への配慮を徹底しています。",
      vehicleType: "kei_truck",
      vehicleWeightKg: 950,
      powerWatt: 1500,
      hasGenerator: true,
      generatorModel: "EU18i",
      generatorNoiseDb: 57,
      usesFire: true,
      fireType: "lpg",
      waterTankLiter: 80,
      minSpaceWidthM: 3.5,
      minSpaceDepthM: 5,
      maxServingsPerHour: 80,
      secondsPerServing: 45,
      size: [450, 190, 280],
      menu: [
        { name: "いちごクレープ", price: 700, description: "季節のいちごをたっぷり" },
        { name: "ツナマヨクレープ", price: 650 },
        { name: "ホットコーヒー", price: 400 },
      ],
    },
    {
      store: stores[1],
      phone: "090-3333-4444",
      openedOn: "2018-09",
      appeal: "スパイスカレーの専門店です。仕込みは自社の許可付き厨房で行っています。",
      vehicleType: "1t",
      vehicleWeightKg: 1800,
      powerWatt: 900,
      hasGenerator: false,
      usesFire: true,
      fireType: "cassette",
      waterTankLiter: 200,
      minSpaceWidthM: 4,
      minSpaceDepthM: 6,
      maxServingsPerHour: 60,
      secondsPerServing: 60,
      size: [520, 200, 300],
      menu: [
        { name: "スパイスカレー", price: 1000, description: "日替わり2種あいがけ" },
        { name: "ラッシー", price: 400 },
      ],
    },
  ];

  for (const p of profiles) {
    if (!p.store) continue;
    await prisma.storeApplicationProfile.create({
      data: {
        storeId: p.store.id,
        phone: p.phone,
        openedOn: p.openedOn,
        appeal: p.appeal,
        vehicleType: p.vehicleType,
        vehicleWeightKg: p.vehicleWeightKg,
        plateNumber: "品川 500 あ 12-34",
        plateNumberPublic: false,
        powerWatt: p.powerWatt,
        hasGenerator: p.hasGenerator,
        generatorModel: p.generatorModel ?? null,
        generatorNoiseDb: p.generatorNoiseDb ?? null,
        usesFire: p.usesFire,
        fireType: p.fireType,
        waterTankLiter: p.waterTankLiter,
        minSpaceWidthM: p.minSpaceWidthM,
        minSpaceDepthM: p.minSpaceDepthM,
        maxServingsPerHour: p.maxServingsPerHour,
        secondsPerServing: p.secondsPerServing,
        availableDays: JSON.stringify(["fri", "sat", "sun"]),
        hasPrepKitchen: true,
        prepKitchenNote: "自社の仕込み場（保健所許可あり）",
      },
    });
    await prisma.store.update({
      where: { id: p.store.id },
      data: {
        vehicleLength: p.size[0],
        vehicleWidth: p.size[1],
        vehicleHeight: p.size[2],
        availableAreas: JSON.stringify(["東京都", "神奈川県", "埼玉県"]),
      },
    });

    // 書類。R2 に実体は無いので、一覧やメタ情報の表示確認用。
    await prisma.applicationDocument.createMany({
      data: [
        {
          storeId: p.store.id, type: "business_license",
          fileKey: `application-documents/${p.store.id}/dummy-license`,
          mimeType: "image/jpeg", fileSize: 240000,
          expiresOn: at(400), visibility: "meta_only", order: 0,
        },
        {
          storeId: p.store.id, type: "food_hygiene",
          fileKey: `application-documents/${p.store.id}/dummy-hygiene`,
          mimeType: "image/jpeg", fileSize: 180000,
          visibility: "meta_only", order: 1,
        },
        {
          storeId: p.store.id, type: "pl_insurance",
          fileKey: `application-documents/${p.store.id}/dummy-pl`,
          mimeType: "application/pdf", fileSize: 320000,
          expiresOn: at(120), visibility: "public", order: 2,
        },
      ],
    });

    await prisma.applicationMenuItem.createMany({
      data: p.menu.map((m, i) => ({
        storeId: p.store!.id,
        name: m.name,
        price: m.price,
        description: m.description ?? null,
        order: i,
      })),
    });

    await prisma.shareLink.create({
      data: {
        storeId: p.store.id,
        token: randomBytes(24).toString("base64url"),
        label: "〇〇マルシェ様",
      },
    });
  }
  console.log(`出店申込情報: ${profiles.length}店舗（書類3種・メニュー・共有リンク付き）`);

  // ---- 確認用の入口 ----
  const links = await prisma.shareLink.findMany({ include: { store: { select: { name: true } } } });
  const publishedEvents = await prisma.event.findMany({
    where: { status: "published" }, select: { id: true, title: true },
  });

  console.log("\n=== 確認用の入口 ===");
  console.log("ログイン: password123");
  console.log(`  主催者（承認済み）: ${approvedUser.email}`);
  console.log(`  主催者（審査待ち）: ${pendingUser.email}`);
  console.log(`  管理者:            ${adminUser?.email ?? "(未設定)"}`);
  console.log("\n募集ページ:");
  publishedEvents.forEach((e) => console.log(`  http://localhost:3000/events/${e.id}  ${e.title}`));
  console.log("\n出店者の共有ページ:");
  links.forEach((l) => console.log(`  http://localhost:3000/s/${l.token}  ${l.store.name}`));
  console.log("\n主な画面:");
  console.log("  http://localhost:3000/events/my        マイイベント");
  console.log("  http://localhost:3000/organizer        主催者情報");
  console.log("  http://localhost:3000/admin/organizers 主催者の審査");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
