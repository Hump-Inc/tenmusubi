import { hash } from "bcryptjs";
import { createSeedClient } from "./seed-target";

const prisma = createSeedClient();

// --- helpers ---
const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const prefectures = [
  "東京都", "大阪府", "愛知県", "福岡県", "北海道",
  "神奈川県", "埼玉県", "千葉県", "京都府", "兵庫県",
];
const areas = [
  "渋谷区", "新宿区", "中央区", "港区", "品川区",
  "梅田", "天王寺", "難波", "栄", "天神",
];
const storeCategories = [
  "キッチンカー", "移動販売", "ハンドメイド", "飲食",
  "スイーツ・カフェ", "物販", "サービス",
];
const storeTags = [
  "週末出店可", "平日出店可", "イベント出店可", "長期出店可",
  "土日祝のみ", "短期出店OK", "初出店歓迎",
];
const spaceTags = [
  "イベント会場", "商業施設", "オフィス街", "駅近",
  "住宅街", "公園・広場", "駐車場", "マルシェ向け",
];
const facilities = [
  "駐車場あり", "電源あり", "水道あり", "トイレあり",
  "屋根あり", "Wi-Fiあり", "テーブル・椅子貸出", "看板設置可",
];

const storeNames = [
  "太陽キッチン", "海風バーガー", "森のクレープ", "星空カフェ",
  "虹色タコス", "月見うどん号", "花畑ジェラート", "風車パン工房",
  "山びこピザ", "川辺の焼き鳥", "雲の上ドーナツ", "雷神ラーメン",
  "桜もちの店", "夕凪カレー", "朝露スムージー", "波乗りホットドッグ",
  "木漏れ日ワッフル", "青空おにぎり", "夢見屋台", "風鈴かき氷",
];

const spaceNames = [
  "サンシャインパーキング", "グリーンプラザ前", "リバーサイドスペース",
  "ハーバービュー広場", "セントラルガーデン", "サニーコート",
  "シーサイドテラス", "ヒルズパーキング", "スカイライン前広場",
  "フォレストエリア", "メインストリート角", "パークアベニュー",
  "ステーションフロント", "マーケットスクエア", "ブリーズガーデン",
  "レイクサイド駐車場", "タワー前スペース", "プロムナード広場",
  "モール裏駐車場", "アクアテラス前",
];

const descriptions = {
  stores: [
    "こだわりの食材を使った自慢の一品をお届けします。",
    "手作りの温かみを大切に、毎日心を込めて作っています。",
    "地元の新鮮な素材を活かしたメニューが自慢です。",
    "お子様からお年寄りまで楽しめるメニューを取り揃えています。",
    "SNSで話題の人気メニューをぜひお試しください。",
  ],
  spaces: [
    "駅から徒歩5分、人通りの多い好立地です。",
    "広々としたスペースで、キッチンカー2台まで設置可能。",
    "イベント時は1日500人以上の来場実績があります。",
    "周辺にオフィスが多く、ランチタイムの集客が見込めます。",
    "週末はファミリー層が多く訪れるエリアです。",
  ],
};

const reviewContents = [
  "とても良いスペースでした。また利用したいです。",
  "立地が良く、集客も期待通りでした！",
  "オーナーさんの対応が丁寧で安心して出店できました。",
  "設備が充実していて使いやすかったです。",
  "人通りが多く、売上も好調でした。",
  "少し狭かったですが、雰囲気は良かったです。",
  "初めての出店でしたが、サポートが手厚くて助かりました。",
  "リピート確定です。ありがとうございました！",
  "天候に左右されやすい場所ですが、晴れの日は最高です。",
  "価格も手頃で、コスパが良いスペースだと思います。",
];

const messageContents = [
  "はじめまして。スペースの利用を検討しています。",
  "来週の土曜日に出店したいのですが、空いていますか？",
  "ありがとうございます！ぜひよろしくお願いします。",
  "電源の使用は可能でしょうか？",
  "何時から設営を始められますか？",
  "写真を拝見しました。素敵なスペースですね。",
  "料金について詳しく教えていただけますか？",
  "先日はありがとうございました。また出店させてください。",
  "イベント時の集客数はどのくらいですか？",
  "長期契約の割引はありますか？",
];

const firstNames = [
  "太郎", "花子", "健太", "美咲", "大輔",
  "さくら", "翔太", "結衣", "拓也", "あおい",
  "陸", "凛", "蓮", "陽菜", "湊",
  "芽依", "悠人", "紬", "颯真", "杏",
];
const lastNames = [
  "田中", "佐藤", "鈴木", "高橋", "伊藤",
  "渡辺", "山本", "中村", "小林", "加藤",
  "吉田", "山田", "松本", "井上", "木村",
  "林", "清水", "山崎", "森", "池田",
];

async function main() {
  console.log("Seeding database...");

  const passwordHash = await hash("password123", 10);

  // --- 1. Users (20) ---
  // 10 vendors, 10 owners
  const users = [];
  for (let i = 0; i < 20; i++) {
    const lastName = lastNames[i];
    const firstName = firstNames[i];
    const name = `${lastName} ${firstName}`;
    const email = `user${i + 1}@example.com`;
    const isVendor = i < 10;
    const userType = isVendor ? '["vendor"]' : '["owner"]';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: new Date(),
        password: passwordHash,
        userType,
        isAdmin: i === 0,
        createdAt: new Date(Date.now() - randInt(1, 90) * 86400000),
      },
    });
    users.push(user);
  }
  console.log(`  Created ${users.length} users`);

  // --- 2. Profiles (20) ---
  const profiles = [];
  for (let i = 0; i < 20; i++) {
    const user = users[i];
    const isVendor = i < 10;
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        displayName: user.name!,
        description: isVendor
          ? `${pick(storeCategories)}の移動販売をしています。${pick(descriptions.stores)}`
          : `${pick(prefectures)}でスペースを提供しています。お気軽にお問い合わせください。`,
        category: isVendor ? pick(storeCategories) : undefined,
        area: `${pick(prefectures)}${pick(areas)}`,
        website: i % 3 === 0 ? `https://example-${i}.com` : undefined,
        instagram: i % 2 === 0 ? `@${user.name!.replace(" ", "").toLowerCase()}` : undefined,
      },
    });
    profiles.push(profile);
  }
  console.log(`  Created ${profiles.length} profiles`);

  // --- 2b. Profile Images (20) ---
  for (let i = 0; i < 20; i++) {
    await prisma.profileImage.create({
      data: {
        profileId: profiles[i].id,
        url: `https://picsum.photos/seed/profile${i}/400/400`,
        order: 0,
      },
    });
  }
  console.log("  Created 20 profile images");

  // --- 3. Stores (20) - owned by vendors (users 0-9) ---
  const stores = [];
  for (let i = 0; i < 20; i++) {
    const owner = users[i % 10]; // vendors
    const store = await prisma.store.create({
      data: {
        ownerId: owner.id,
        name: storeNames[i],
        description: pick(descriptions.stores),
        category: pick(storeCategories),
        area: `${pick(prefectures)}${pick(areas)}`,
        tags: JSON.stringify(storeTags.sort(() => Math.random() - 0.5).slice(0, randInt(2, 4))),
        website: i % 4 === 0 ? `https://store-${i}.example.com` : undefined,
        instagram: i % 3 === 0 ? `@store${i}` : undefined,
        isActive: true,
        createdAt: new Date(Date.now() - randInt(1, 60) * 86400000),
      },
    });
    stores.push(store);
  }
  console.log(`  Created ${stores.length} stores`);

  // --- 3b. Store Images (1~3 per store) ---
  let storeImageCount = 0;
  for (let i = 0; i < stores.length; i++) {
    const numImages = randInt(1, 3);
    for (let j = 0; j < numImages; j++) {
      await prisma.storeImage.create({
        data: {
          storeId: stores[i].id,
          url: `https://picsum.photos/seed/store${i}-${j}/600/400`,
          order: j,
        },
      });
      storeImageCount++;
    }
  }
  console.log(`  Created ${storeImageCount} store images`);

  // --- 4. Spaces (20) - owned by owners (users 10-19) ---
  const spaces = [];
  for (let i = 0; i < 20; i++) {
    const owner = users[10 + (i % 10)]; // owners
    const pref = pick(prefectures);
    const area = pick(areas);
    const space = await prisma.space.create({
      data: {
        ownerId: owner.id,
        name: spaceNames[i],
        description: pick(descriptions.spaces),
        location: `${pref}${area}`,
        address: `${area}${randInt(1, 9)}-${randInt(1, 30)}-${randInt(1, 15)}`,
        capacity: `キッチンカー${randInt(1, 4)}台`,
        price: `${randInt(3, 15) * 1000}円/日`,
        tags: JSON.stringify(spaceTags.sort(() => Math.random() - 0.5).slice(0, randInt(2, 4))),
        facilities: JSON.stringify(facilities.sort(() => Math.random() - 0.5).slice(0, randInt(2, 5))),
        openingHours: `${randInt(8, 10)}:00〜${randInt(17, 21)}:00`,
        closedDays: pick(["なし", "日曜", "月曜", "不定休", "土日祝"]),
        isActive: true,
        createdAt: new Date(Date.now() - randInt(1, 60) * 86400000),
      },
    });
    spaces.push(space);
  }
  console.log(`  Created ${spaces.length} spaces`);

  // --- 4b. Space Images (1~3 per space) ---
  let spaceImageCount = 0;
  for (let i = 0; i < spaces.length; i++) {
    const numImages = randInt(1, 3);
    for (let j = 0; j < numImages; j++) {
      await prisma.spaceImage.create({
        data: {
          spaceId: spaces[i].id,
          url: `https://picsum.photos/seed/space${i}-${j}/600/400`,
          order: j,
        },
      });
      spaceImageCount++;
    }
  }
  console.log(`  Created ${spaceImageCount} space images`);

  // --- 5. Messages (20) - between vendors and owners ---
  for (let i = 0; i < 20; i++) {
    const vendor = users[i % 10];
    const owner = users[10 + (i % 10)];
    const isSenderVendor = i % 2 === 0;
    await prisma.message.create({
      data: {
        senderId: isSenderVendor ? vendor.id : owner.id,
        receiverId: isSenderVendor ? owner.id : vendor.id,
        content: messageContents[i % messageContents.length],
        isRead: i % 3 !== 0,
        createdAt: new Date(Date.now() - randInt(0, 30) * 86400000 - randInt(0, 86400) * 1000),
      },
    });
  }
  console.log("  Created 20 messages");

  // --- 6. Reviews (20) ---
  for (let i = 0; i < 20; i++) {
    const author = users[i % 10]; // vendors write reviews
    const target = users[10 + (i % 10)]; // about owners
    const space = spaces[i % spaces.length];
    await prisma.review.create({
      data: {
        authorId: author.id,
        targetId: target.id,
        spaceId: space.id,
        rating: randInt(3, 5),
        content: reviewContents[i % reviewContents.length],
        createdAt: new Date(Date.now() - randInt(1, 45) * 86400000),
      },
    });
  }
  console.log("  Created 20 reviews");

  // --- 7. Favorites (20) ---
  const favoriteSet = new Set<string>();
  let favCount = 0;
  for (let i = 0; favCount < 20 && i < 100; i++) {
    const user = users[i % 10]; // vendors favorite spaces
    const space = spaces[randInt(0, spaces.length - 1)];
    const key = `${user.id}-${space.id}`;
    if (favoriteSet.has(key)) continue;
    favoriteSet.add(key);
    await prisma.favorite.create({
      data: {
        userId: user.id,
        spaceId: space.id,
      },
    });
    favCount++;
  }
  console.log(`  Created ${favCount} favorites`);

  // --- 8. Bookings (20) ---
  const statuses = ["pending", "confirmed", "completed", "cancelled"];
  for (let i = 0; i < 20; i++) {
    const vendor = users[i % 10];
    const space = spaces[i % spaces.length];
    await prisma.booking.create({
      data: {
        vendorId: vendor.id,
        spaceId: space.id,
        date: new Date(Date.now() + randInt(-15, 30) * 86400000),
        status: statuses[i % statuses.length],
        message: i % 2 === 0 ? `${storeNames[i % storeNames.length]}で出店希望です。` : undefined,
        createdAt: new Date(Date.now() - randInt(1, 20) * 86400000),
      },
    });
  }
  console.log("  Created 20 bookings");

  // --- 9. Notifications (20) ---
  const notifTypes = ["message", "booking", "review"];
  for (let i = 0; i < 20; i++) {
    const user = users[i % 20];
    const type = notifTypes[i % notifTypes.length];
    let title: string, body: string, link: string;
    if (type === "message") {
      title = "新しいメッセージ";
      body = `${users[(i + 5) % 20].name}さんからメッセージが届きました`;
      link = "/messages";
    } else if (type === "booking") {
      title = "予約リクエスト";
      body = `${spaceNames[i % spaceNames.length]}への予約リクエストがあります`;
      link = "/mypage";
    } else {
      title = "新しいレビュー";
      body = `${users[(i + 3) % 20].name}さんからレビューが投稿されました`;
      link = "/mypage";
    }
    await prisma.notification.create({
      data: {
        userId: user.id,
        type,
        title,
        body,
        link,
        isRead: i % 2 === 0,
        createdAt: new Date(Date.now() - randInt(0, 14) * 86400000),
      },
    });
  }
  console.log("  Created 20 notifications");

  // --- 10. FAQ Items (20) ---
  const faqCategories = ["general", "account", "matching", "payment", "other"];
  const faqData = [
    { q: "サービスの利用料金はいくらですか？", a: "基本利用は無料です。プレミアムプランは月額2,980円でご利用いただけます。", c: "payment" },
    { q: "アカウントの登録方法を教えてください", a: "トップページの「新規登録」ボタンからメールアドレスまたはSNSアカウントで登録できます。", c: "account" },
    { q: "出店者として登録するには？", a: "アカウント登録時に「出店者」を選択してください。後からマイページで変更することもできます。", c: "account" },
    { q: "スペースオーナーとして登録するには？", a: "アカウント登録時に「スペースオーナー」を選択してください。", c: "account" },
    { q: "予約の仕方を教えてください", a: "気になるスペースの詳細ページから「予約リクエスト」ボタンを押して、希望日を選択してください。", c: "matching" },
    { q: "予約をキャンセルしたい場合は？", a: "マイページの予約一覧から該当の予約を選び、「キャンセル」ボタンを押してください。", c: "matching" },
    { q: "メッセージ機能の使い方は？", a: "相手のプロフィールまたはスペース詳細ページから「メッセージを送る」ボタンでやり取りを開始できます。", c: "general" },
    { q: "本人確認はどのように行いますか？", a: "マイページの「本人確認」セクションから、身分証明書の写真をアップロードしてください。", c: "account" },
    { q: "支払い方法は何がありますか？", a: "クレジットカード（Visa, Mastercard, JCB）に対応しています。", c: "payment" },
    { q: "領収書は発行できますか？", a: "マイページの「お支払い履歴」から領収書をダウンロードできます。", c: "payment" },
    { q: "レビューの投稿方法は？", a: "予約完了後、マイページまたはスペース詳細ページからレビューを投稿できます。", c: "general" },
    { q: "スペースの検索方法は？", a: "トップページの検索バーからエリア、キーワード、条件で絞り込み検索ができます。", c: "general" },
    { q: "プレミアムプランの特典は？", a: "優先表示、詳細な分析機能、無制限のメッセージなどの特典があります。", c: "payment" },
    { q: "退会するにはどうすればいいですか？", a: "設定ページの「アカウント」セクションから退会手続きを行えます。", c: "account" },
    { q: "パスワードを忘れた場合は？", a: "ログインページの「パスワードをお忘れの方」から再設定メールを送信できます。", c: "account" },
    { q: "お気に入り機能の使い方は？", a: "スペース詳細ページのハートマークをクリックするとお気に入りに追加できます。", c: "general" },
    { q: "出店可能なエリアに制限はありますか？", a: "日本国内であれば、どのエリアでも出店・スペース登録が可能です。", c: "matching" },
    { q: "複数のスペースを登録できますか？", a: "はい、スペースオーナーは複数のスペースを登録できます。", c: "matching" },
    { q: "トラブルが起きた場合の対応は？", a: "お問い合わせフォームからご連絡ください。運営チームが対応いたします。", c: "other" },
    { q: "アプリはありますか？", a: "現在はWebブラウザでのご利用となります。モバイルアプリは今後対応予定です。", c: "other" },
  ];
  for (let i = 0; i < faqData.length; i++) {
    await prisma.faqItem.create({
      data: {
        question: faqData[i].q,
        answer: faqData[i].a,
        category: faqData[i].c,
        order: i,
        isPublished: true,
      },
    });
  }
  console.log("  Created 20 FAQ items");

  console.log("\nSeed completed!");
  console.log("\nLogin credentials:");
  console.log("  Admin:  user1@example.com / password123");
  console.log("  Vendor: user2@example.com ~ user10@example.com / password123");
  console.log("  Owner:  user11@example.com ~ user20@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
