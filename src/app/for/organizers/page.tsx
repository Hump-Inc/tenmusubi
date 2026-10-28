import type { Metadata } from "next";
import {
  CalendarDays,
  Users,
  Send,
  CreditCard,
  CloudRain,
  Bell,
  UserPlus,
  ShieldCheck,
  Megaphone,
  Handshake,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { platformFeePercent } from "@/lib/eventPayments";
import { HOME_ROLE_PHOTOS } from "@/lib/homeImages";
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
  title: "イベント主催者の方へ | てんむすび",
  description:
    "マルシェ・お祭り・地域イベントの主催者向け。出店募集の作成から応募の比較、スカウト、出店料の集金まで。募集の掲載は無料です。",
};

export default async function OrganizerLandingPage() {
  const session = await auth();
  // 主催者の申請はログインが必要。未ログインなら、登録してから申請に進んでもらう
  const primary = session
    ? { href: "/organizer", label: "主催者の申請へ進む" }
    : { href: "/register?type=owner", label: "無料で登録して主催をはじめる" };

  const features: LpItem[] = [
    {
      icon: CalendarDays,
      title: "出店募集をつくって公開",
      desc: "開催日・会場・区画ごとの出店料・オプション料金・電源や火気の条件を登録して公開。募集ページがそのまま告知になります。",
    },
    {
      icon: Users,
      title: "応募を並べて比べる",
      desc: "応募したお店の車両・電源・火気・必要スペースを、会場の条件と照らし合わせて表示します。メニューや書類もまとめて確認できます。",
    },
    {
      icon: Send,
      title: "こちらからスカウト",
      desc: "応募を待つだけでなく、登録しているお店を探して、出店してほしいお店に直接お誘いを送れます。",
    },
    EVENT_PAYMENTS_ENABLED
      ? {
          icon: CreditCard,
          title: "出店料をオンラインで集金",
          desc: "出店が決まったお店に、やり取りの画面から請求できます。カード払いで、当日の現金のやり取りや未払いの追いかけがなくなります。入金は開催後にまとめて。",
        }
      : {
          icon: Handshake,
          title: "やり取りはひとつの画面で",
          desc: "応募ごとにやり取りの画面があり、条件の相談から当日の連絡まで、そのまま続けられます。",
        },
    {
      icon: CloudRain,
      title: "雨天時のルールを先に決めておける",
      desc: "雨天決行・荒天中止・雨天中止と、中止を判断する期限、中止時の返金の割合を募集に載せられます。中止の連絡も出店者全員に一斉に届きます。",
    },
    {
      icon: Bell,
      title: "フォローしてくれたお店に新着が届く",
      desc: "あなたをフォローした出店者には、新しい募集を公開したときにお知らせが届きます。続けて開くほど集まりやすくなります。",
    },
  ];

  const steps: LpItem[] = [
    { icon: UserPlus, title: "無料で登録", desc: "メールアドレス、Google、LINE のどれかで登録します" },
    { icon: ShieldCheck, title: "主催者の申請", desc: "団体名や実績を入力。運営が確認して承認します" },
    { icon: Megaphone, title: "募集を公開", desc: "開催内容と区画・出店料を登録して公開します" },
    { icon: Handshake, title: "出店者を決める", desc: "応募やスカウトしたお店とやり取りして、出店を決めます" },
  ];

  const pricingRows = [
    { label: "登録・主催者の申請", value: "無料" },
    { label: "募集の掲載・応募の受け付け・スカウト", value: "無料" },
    ...(EVENT_PAYMENTS_ENABLED
      ? [{ label: "出店料をオンラインで集金した場合", value: `出店料の${platformFeePercent()}%（税込・決済手数料込み）` }]
      : []),
  ];

  return (
    <LpShell>
      <LpHero
        eyebrow="マルシェ・お祭り・地域イベントの主催者の方へ"
        title={
          <>
            出店者集めから集金まで、
            <br />
            ひとつの画面で
          </>
        }
        lead="募集を出して、応募を比べて、声をかけて、出店料を受け取る。出店者とのやり取りに追われる時間を減らして、イベントづくりに集中できます。"
        image={HOME_ROLE_PHOTOS.organizer}
        imageAlt="夜のマルシェに並ぶキッチンカー"
        primary={primary}
        secondary={{ href: "/search?type=vendor", label: "登録している出店者を見る" }}
        checks={["募集の掲載は無料", "スカウトもできる", "運営が確認した主催者だけが掲載"]}
      />

      <LpSection title="こんなこと、ありませんか" tone="gray">
        <LpPains
          items={[
            {
              pain: "出店者が集まらず、毎回知り合いに声をかけている",
              answer: "募集を公開すれば出店者が探して応募してきます。こちらからスカウトもできます。",
            },
            {
              pain: "申込書の回収や、条件の確認に手間がかかる",
              answer: "車両・電源・火気などの情報がそろった状態で応募が届き、会場の条件と照らし合わせて見られます。",
            },
            {
              pain: "出店料の集金や、キャンセル時の返金でもめる",
              answer: EVENT_PAYMENTS_ENABLED
                ? "出店料はオンラインで集金。キャンセルの返金も規定に沿って画面で手続きします。"
                : "雨天時の扱いや返金の割合を、募集の段階で出店者に示しておけます。",
            },
          ]}
        />
      </LpSection>

      <LpSection title="てんむすびでできること">
        <LpFeatures items={features} />
      </LpSection>

      <LpSection title="主催をはじめるまで" tone="gray">
        <LpSteps items={steps} />
      </LpSection>

      <LpSection title="料金">
        <LpPricing
          rows={pricingRows}
          note={
            EVENT_PAYMENTS_ENABLED
              ? "手数料は、オンラインで集金した出店料から差し引いて入金します。現地で現金を受け取るなど、てんむすびで集金しない場合はかかりません。入金は開催が終わった日の2日後以降です。"
              : undefined
          }
        />
      </LpSection>

      <LpSection title="よくある質問" tone="gray">
        <LpFaq
          items={[
            {
              q: "誰でも募集を出せますか？",
              a: "主催者の申請をして、運営が内容を確認したあとに公開できるようになります。出店者に安心して応募してもらうための仕組みです。",
            },
            {
              q: "出店者としても登録しています。主催もできますか？",
              a: "できます。同じアカウントのまま、主催者の申請をしてください。",
            },
            ...(EVENT_PAYMENTS_ENABLED
              ? [
                  {
                    q: "出店料はいつ入金されますか？",
                    a: "イベントが終わった日の2日後以降に、まとめて入金します。キャンセルの手続き中の出店者がいる場合、その分は手続きが確定してから入金します。",
                  },
                  {
                    q: "出店者がキャンセルしたら、どうなりますか？",
                    a: "出店者が画面から申し出て、主催者が受け付け、出店者が承認すると、キャンセル規定に沿った額が自動で返金されます。返金額は規定より増やすことだけできます。",
                  },
                ]
              : []),
            {
              q: "雨で中止にするときは？",
              a: "募集ページの「募集の中止」から理由を選んで中止すると、出店者全員にお知らせが届きます。返金は、募集に載せた割合（全額または半額）に沿って行います。",
            },
          ]}
        />
      </LpSection>

      <LpFinalCta
        title="次のイベントの出店者、ここで集めませんか"
        lead="登録と募集の掲載は無料です。まずは主催者の申請からはじめましょう。"
        primary={primary}
        secondary={{ href: "/search?type=event", label: "公開中の募集を見る" }}
      />

      <LpOtherRoles current="organizers" />
    </LpShell>
  );
}
