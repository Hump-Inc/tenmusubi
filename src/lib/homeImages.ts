/**
 * トップページのカードで使う画像。
 *
 * /public/images/ に下記の名前でファイルを置くと、アイコンの代わりにその画像が出る。
 * 置いていない間はこれまでのアイコンを表示するので、素材が揃ったものから順に
 * 差し替えられる（2026-08-28 決定）。
 *
 * 拡張子を変えたいときは、ここの1行を直すだけでよい。
 * 画像は正方形・512px以上・背景透過（PNG または SVG）を想定している。
 */
export const HOME_CARD_IMAGES = {
  // 「てんむすびに登録するメリット」の4枚
  benefitOwners: "/images/benefit-owners.png", // スペースオーナーの目に留まる
  benefitAppeal: "/images/benefit-appeal.png", // あなたの魅力を最大限にアピール
  benefitFree: "/images/benefit-free.png", // 完全無料で利用可能
  benefitChances: "/images/benefit-chances.png", // 出店チャンスが広がる

  // 「てんむすびでできること」の2枚
  roleVendor: "/images/role-vendor.png", // 出店したい方
  roleOrganizer: "/images/role-organizer.png", // イベントを開きたい方
} as const;
