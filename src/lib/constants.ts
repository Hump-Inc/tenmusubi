export const VENDOR_CATEGORIES = [
  { id: "kitchen-car", label: "キッチンカー", icon: "Truck", description: "キッチンカー・フードトラック" },
  { id: "handmade", label: "ハンドメイドショップ", icon: "Palette", description: "ハンドメイド・クラフト作品" },
  { id: "other", label: "その他", icon: "Package", description: "その他の出店者" },
] as const;

export const VENDOR_CATEGORY_LABELS = VENDOR_CATEGORIES.map(c => c.label);

export const SEARCH_CATEGORIES = ["すべて", ...VENDOR_CATEGORY_LABELS];

export const MOTTO_OPTIONS = [
  "ゴミは必ず持ち帰ります",
  "音量配慮します",
  "近隣へのご挨拶をします",
  "笑顔を絶やしません",
  "安心安全なものを提供します",
  "お腹も心も満たします",
] as const;

export const AREAS = [
  "すべて",
  "東京都",
  "神奈川県",
  "埼玉県",
  "千葉県",
  "大阪府",
  "京都府",
  "兵庫県",
  "愛知県",
  "福岡県",
  "北海道",
  "その他",
];

// 運営ブログのカテゴリ
export const BLOG_CATEGORIES = [
  "お知らせ",
  "イベント",
  "コラム",
  "出店者紹介",
  "スペース紹介",
] as const;

export const POINTS = {
  CHECKIN: 10,
  REVIEW: 50,
} as const;

export const CHECKIN_COOLDOWN_HOURS = 3;

export const ALL_PREFECTURES = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
  "沖縄県",
] as const;
