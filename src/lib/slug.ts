// タイトル等から URL 用の slug を生成する。
// 日本語など ASCII 化できない文字はハイフンに畳み込まれるため、
// 結果が空になる場合は呼び出し側でフォールバック（ランダム付与）すること。
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9぀-ヿ一-龯]+/g, "-") // 英数・かな・漢字以外を区切りに
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80);
}

// ランダムなサフィックス（slug衝突回避・空slugのフォールバック用）
export function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
