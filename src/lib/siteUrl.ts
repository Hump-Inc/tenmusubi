/**
 * サイトの絶対URL（末尾スラッシュなし）。メールのリンクや Stripe の戻り先に使う。
 *
 * 環境変数は文字列のまま連結せず、URL として読み直してから使う。Vercel に
 * 末尾の改行ごと登録されていると、連結したURLが壊れて Stripe に
 * 「Not a valid URL」で断られる（2026-10-16、受け取り口座の設定で発生）。
 * next-auth は URL として読むので、ログインでは表に出なかった。
 *
 * ミドルウェア（Edge）からも使うので、Node.js 専用のモジュールは import しない。
 */
export function siteUrl(fallback = "http://localhost:3000"): string {
  const raw = process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (raw) {
    try {
      return new URL(raw.trim()).origin;
    } catch {
      // 壊れた値なら既定値に倒す
    }
  }
  return fallback;
}
