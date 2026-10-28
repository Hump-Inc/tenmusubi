import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  MessageCircle,
  Search,
  CalendarDays,
  UserPlus,
  Store,
  Handshake,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import {
  LpShell,
  LpHero,
  LpSection,
  LpPains,
  LpFeatures,
  LpSteps,
  LpPricing,
  LpFaq,
  LpFinalCta,
  LpOtherRoles,
  type LpItem,
} from "@/components/lp/Landing";

export const metadata: Metadata = {
  title: "スペースを提供したい方へ | てんむすび",
  description:
    "駐車場・店先・商業施設の空き区画など、出店場所を提供したい方向け。スペースを掲載して、キッチンカーやハンドメイドの出店者から出店の相談を受けられます。掲載は無料です。",
};

// ヒーロー写真はトップと同じもの（マルシェの賑わい）。スペース用の素材ができたら差し替える
const HERO_IMAGE = "https://images.unsplash.com/photo-1567129937968-cdad8f07e2f8?w=1920&q=80";

export default async function SpaceLandingPage() {
  const session = await auth();
  const primary = session
    ? { href: "/spaces/new", label: "スペースを掲載する" }
    : { href: "/register?type=owner", label: "無料で登録してスペースを掲載" };

  // 出店相談への返事はメッセージで行う（承認ボタンなどの画面はまだ無い）。
  // できることだけを書く。
  const features: LpItem[] = [
    {
      icon: MapPin,
      title: "スペースを無料で掲載",
      desc: "場所・広さ（何台まで置けるか）・利用料金・営業時間・定休日、電源や水道・トイレの有無を写真付きで掲載できます。",
    },
    {
      icon: MessageCircle,
      title: "出店者から相談が届く",
      desc: "「出店場所を探す」から見つけた出店者が、出店したい日とメッセージを添えて相談を送ってきます。届くとお知らせとメールで分かります。",
    },
    {
      icon: Search,
      title: "来てほしいお店に声をかける",
      desc: "キッチンカーやハンドメイドのお店を、業種やエリアで探せます。気になるお店には、こちらから直接メッセージを送れます。",
    },
    {
      icon: CalendarDays,
      title: "自分の場所でイベントを開く",
      desc: "主催者の申請をすれば、そのスペースを会場にしたマルシェの出店募集を出せます。複数のお店を一度に集めたいときに。",
    },
  ];

  const steps: LpItem[] = [
    { icon: UserPlus, title: "無料で登録", desc: "「スペース・イベント主催者」として登録します" },
    { icon: Store, title: "スペースを掲載", desc: "写真・場所・広さ・料金・設備を入力して掲載します" },
    { icon: MessageCircle, title: "相談が届く", desc: "出店者から、出店したい日とメッセージが届きます" },
    { icon: Handshake, title: "条件を決めて出店", desc: "メッセージで日程や料金を相談して決めます" },
  ];

  return (
    <LpShell>
      <LpHero
        eyebrow="駐車場・店先・商業施設の空き区画をお持ちの方へ"
        title={
          <>
            空いている場所に、
            <br />
            キッチンカーを呼びませんか
          </>
        }
        lead="使っていない駐車場や店先、施設の空き区画。キッチンカーやハンドメイドのお店が来れば、利用料が入り、人が集まるきっかけにもなります。てんむすびなら、出店者との出会いから相談までをまとめて行えます。"
        image={HERO_IMAGE}
        imageAlt="キッチンカーが並ぶマルシェの賑わい"
        primary={primary}
        secondary={{ href: "/search?type=vendor", label: "登録している出店者を見る" }}
        checks={["掲載は無料", "利用料金は自分で決められる", "1台からでも"]}
      />

      <LpSection title="こんなこと、ありませんか" tone="gray">
        <LpPains
          items={[
            {
              pain: "平日や昼間、駐車場や空き区画が使われていない",
              answer: "スペースを掲載しておけば、その場所で出店したいお店から相談が届きます。",
            },
            {
              pain: "キッチンカーを呼びたいが、どこに頼めばいいか分からない",
              answer: "登録しているお店を業種・エリアで探して、直接声をかけられます。",
            },
            {
              pain: "知らないお店に場所を貸すのは不安",
              answer: "お店のページで、写真・メニュー・車両の大きさ・出店エリアを確かめてから決められます。",
            },
          ]}
        />
      </LpSection>

      <LpSection title="てんむすびでできること">
        <LpFeatures items={features} columns={2} />
      </LpSection>

      <LpSection title="掲載から出店まで" tone="gray">
        <LpSteps items={steps} />
      </LpSection>

      <LpSection title="料金">
        <LpPricing
          rows={[
            { label: "登録・スペースの掲載", value: "無料" },
            { label: "出店相談の受け取り・メッセージ", value: "無料" },
            { label: "出店者から受け取る利用料", value: "スペースごとに自由に設定" },
          ]}
          note="利用料金（例：1日5,000円、売上の10% など）はスペースの掲載時に自由に書けます。利用料の受け渡しは、出店者と直接行ってください。"
        />
      </LpSection>

      <LpSection title="よくある質問" tone="gray">
        <LpFaq
          items={[
            {
              q: "どんな場所なら掲載できますか？",
              a: "駐車場の一角、お店の前、商業施設やオフィスの空き区画、イベント会場など、キッチンカーやテントを出せる場所なら掲載できます。置ける台数や広さを書いておくと、相談がスムーズです。",
            },
            {
              q: "毎日貸す必要がありますか？",
              a: "ありません。営業時間や定休日を書いておけます。届いた相談ごとに、日程を相談して決めてください。",
            },
            {
              q: "複数のお店を集めてイベントにしたいです。",
              a: "主催者の申請をすると、出店募集を出せます。区画ごとの出店料や電源の有無を書いて募集でき、応募したお店を比べて選べます。",
            },
          ]}
        />
        <div className="mt-10 flex justify-center">
          <Link
            href="/for/organizers"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Sparkles className="h-4 w-4" />
            イベントを開きたい方はこちら
          </Link>
        </div>
      </LpSection>

      <LpFinalCta
        title="まずは、スペースを掲載するところから"
        lead="登録と掲載は無料です。スペース名と場所だけでも掲載でき、あとから詳しく書き足せます。"
        primary={primary}
        secondary={{ href: "/search?type=vendor", label: "出店者を探す" }}
      />

      <LpOtherRoles current="spaces" />
    </LpShell>
  );
}
