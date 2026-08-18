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
  "お役立ち情報",
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

// ============================================
// 出店申込パック（共有URL機能）
// ============================================

export const VEHICLE_TYPES = [
  { value: "kei_truck", label: "軽トラック" },
  { value: "kei_van", label: "軽バン" },
  { value: "1t", label: "1tトラック" },
  { value: "1.5t", label: "1.5tトラック" },
  { value: "other", label: "その他" },
] as const;

export const FIRE_TYPES = [
  { value: "lpg", label: "LPガス" },
  { value: "cassette", label: "カセットコンロ" },
  { value: "electric_only", label: "電気のみ" },
] as const;

// 給排水タンク容量は選択式＋自由入力
export const WATER_TANK_PRESETS = [40, 80, 200] as const;

export const WEEKDAYS = [
  { value: "mon", label: "月" },
  { value: "tue", label: "火" },
  { value: "wed", label: "水" },
  { value: "thu", label: "木" },
  { value: "fri", label: "金" },
  { value: "sat", label: "土" },
  { value: "sun", label: "日" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "business_license", label: "営業許可証" },
  { value: "food_hygiene", label: "食品衛生責任者証" },
  { value: "pl_insurance", label: "PL保険証券" },
  { value: "vehicle_inspection", label: "車検証" },
  { value: "other", label: "その他" },
] as const;

// 書類の公開範囲。既定は meta_only（個人情報はデフォルト非公開）
export const DOCUMENT_VISIBILITIES = [
  {
    value: "public",
    label: "画像を公開",
    description: "主催者が書類そのものを閲覧できます",
  },
  {
    value: "meta_only",
    label: "有無と有効期限のみ公開",
    description: "「提出可能」であることだけ伝わり、書類の中身は見えません",
  },
  {
    value: "private",
    label: "公開しない",
    description: "共有ページには一切表示されません",
  },
] as const;

export const SPACE_LEAD_STATUSES = [
  { value: "new", label: "新規" },
  { value: "contacted", label: "連絡済み" },
  { value: "qualified", label: "見込みあり" },
  { value: "registered", label: "登録済み" },
  { value: "rejected", label: "見送り" },
] as const;

function labelFrom(
  list: readonly { value: string; label: string }[],
  value: string | null | undefined
): string | null {
  if (!value) return null;
  return list.find((item) => item.value === value)?.label ?? value;
}

export const vehicleTypeLabel = (v: string | null | undefined) => labelFrom(VEHICLE_TYPES, v);
export const fireTypeLabel = (v: string | null | undefined) => labelFrom(FIRE_TYPES, v);
export const documentTypeLabel = (v: string | null | undefined) => labelFrom(DOCUMENT_TYPES, v);
export const spaceLeadStatusLabel = (v: string | null | undefined) =>
  labelFrom(SPACE_LEAD_STATUSES, v);
export const weekdayLabel = (v: string | null | undefined) => labelFrom(WEEKDAYS, v);
