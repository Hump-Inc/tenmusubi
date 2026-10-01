import { FlaskConical } from "lucide-react";
import { EVENTS_IN_TESTING } from "@/lib/constants";

const MESSAGE =
  "出店募集の機能は現在テスト運用中です。掲載中の募集にはテスト用のものが含まれる場合があり、機能や表示は予告なく変わることがあります。";
// ヘッダーと一緒に画面上部に残り続けるので、スマホで場所を取らないよう短くする
const SHORT_MESSAGE = "出店募集はテスト運用中です。テスト用の募集が含まれる場合があります。";

/**
 * 出店募集がテスト運用中であることの案内（EVENTS_IN_TESTING が立っている間だけ出す）。
 * - strip: ヘッダーの下に全幅で出す。募集まわりのページ用
 * - inline: 一覧の上などに角丸の枠で出す
 */
export function EventsTestingNotice({ variant = "inline" }: { variant?: "strip" | "inline" }) {
  if (!EVENTS_IN_TESTING) return null;

  if (variant === "strip") {
    return (
      <div className="border-t border-amber-100 bg-amber-50">
        <p className="container mx-auto flex items-start gap-2 px-4 py-1.5 text-xs leading-relaxed text-amber-900 sm:items-center sm:text-sm">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" />
          {SHORT_MESSAGE}
        </p>
      </div>
    );
  }

  return (
    <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      {MESSAGE}
    </p>
  );
}
