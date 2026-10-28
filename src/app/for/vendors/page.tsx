import type { Metadata } from "next";
import {
  Search,
  Send,
  FileCheck2,
  Link2,
  ShieldCheck,
  CreditCard,
  Bell,
  CalendarDays,
  UserPlus,
  Truck,
  Handshake,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
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
  title: "出店者の方へ | てんむすび",
  description:
    "キッチンカー・ハンドメイド・物販の出店者向け。出店募集を探して応募、主催者からのスカウト、申込情報の使い回しまで、登録無料で使えます。",
};

export default async function VendorLandingPage() {
  const session = await auth();
  const primary = session
    ? { href: "/mypage", label: "マイページへ" }
    : { href: "/register?type=vendor", label: "無料で出店者登録" };

  const features: LpItem[] = [
    {
      icon: Search,
      title: "出店募集を探して応募",
      desc: "エリア・開催月・業種・出店料で絞り込み。区画ごとの出店料、電源・給排水・火気の条件、雨天時の扱いまで確かめてから応募できます。",
    },
    {
      icon: Send,
      title: "主催者からスカウトが届く",
      desc: "お店を公開しておくと、出店者を探している主催者から直接お誘いが届きます。",
    },
    {
      icon: FileCheck2,
      title: "申込情報は一度の登録で使い回す",
      desc: "車両・電源・火気・メニュー・営業許可証などを登録しておけば、応募のたびに書き直す必要はありません。その回だけ違う内容は応募画面で直せます。",
    },
    {
      icon: Link2,
      title: "てんむすび以外の主催者にも URL で渡せる",
      desc: "共有リンクを発行すれば、申込情報をそのまま主催者に渡せます。主催者は申込書として印刷・PDF保存もできます。有効期限・パスワード付き。",
    },
    {
      icon: ShieldCheck,
      title: "書類は出す相手を選べる",
      desc: "営業許可証や保険の書類は、応募しただけでは相手に渡りません。必要になったら、主催者ごと・書類ごとに開示を決め、いつでも取り消せます。",
    },
    EVENT_PAYMENTS_ENABLED
      ? {
          icon: CreditCard,
          title: "出店料はカードで払える",
          desc: "出店が決まると、やり取りの画面に請求が届きます。カードで払え、領収書はメールで届きます。キャンセルの返金も規定に沿って画面で手続きできます。",
        }
      : {
          icon: Bell,
          title: "締切前に知らせが届く",
          desc: "「気になる」に入れた募集は、締切の3日前にお知らせします。フォローした主催者が新しい募集を出したときも届きます。",
        },
  ];

  const steps: LpItem[] = [
    { icon: UserPlus, title: "無料で登録", desc: "メールアドレス、Google、LINE のどれかで登録できます" },
    { icon: Truck, title: "お店を登録", desc: "写真・業種・車両サイズ・出店エリアを登録して公開します" },
    { icon: Send, title: "応募する・声がかかる", desc: "募集に応募するか、主催者からのスカウトを受けます" },
    { icon: Handshake, title: "やり取りして出店決定", desc: "条件を相談し、決まったら当日の詳細もそのまま相談できます" },
  ];

  return (
    <LpShell>
      <LpHero
        eyebrow="キッチンカー・ハンドメイド・物販の方へ"
        title={
          <>
            次の出店先を、
            <br />
            探すところから決めるまで
          </>
        }
        lead="出店募集を探して応募する。主催者から声がかかる。決まった後のやり取りも、出店料の支払いも。出店にまつわることが、ひとつの場所で完結します。"
        image={HOME_ROLE_PHOTOS.vendor}
        imageAlt="キッチンカーで料理を手渡す出店者"
        primary={primary}
        secondary={{ href: "/search?type=event", label: "出店募集を見る" }}
        checks={["登録・応募は無料", "最短1分で登録", "スマホで完結"]}
      />

      <LpSection title="こんなこと、ありませんか" tone="gray">
        <LpPains
          items={[
            {
              pain: "出店先を探すのに、SNS や知り合いづてで時間がかかる",
              answer: "条件で絞り込める募集一覧から、自分で選んで応募できます。",
            },
            {
              pain: "主催者ごとに申込書を書き直すのが面倒",
              answer: "申込情報を一度登録すれば、応募にも共有リンクにも使い回せます。",
            },
            {
              pain: "営業許可証の写しを、誰にでも送るのは不安",
              answer: "書類は開示する相手を自分で選び、いつでも取り消せます。",
            },
          ]}
        />
      </LpSection>

      <LpSection title="てんむすびでできること" lead="出店者は、登録から出店決定まですべて無料で使えます。">
        <LpFeatures items={features} />
      </LpSection>

      <LpSection title="出店までの流れ" tone="gray">
        <LpSteps items={steps} />
      </LpSection>

      <LpSection title="料金">
        <LpPricing
          rows={[
            { label: "登録・お店の掲載", value: "無料" },
            { label: "応募・スカウトの受け取り・やり取り", value: "無料" },
            { label: "共有リンク・申込書の発行", value: "無料" },
            {
              label: "出店料",
              value: EVENT_PAYMENTS_ENABLED ? "主催者が決めた額（手数料の上乗せなし）" : "主催者が決めた額",
            },
          ]}
          note="出店料は募集ごとに主催者が決めます。てんむすびの手数料は主催者が負担するため、出店者の支払額には上乗せされません。"
        />
      </LpSection>

      <LpSection title="主催する側にも回れます" tone="gray">
        <div className="max-w-3xl mx-auto rounded-2xl bg-cream p-6 sm:p-8 flex flex-col sm:flex-row gap-5 sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
            <CalendarDays className="h-7 w-7" />
          </div>
          <p className="text-sm leading-relaxed text-gray-700">
            同じアカウントのまま、主催者の申請をすれば自分でイベントを開けます。
            仲間のキッチンカーに声をかけてマルシェを開けば、出店の売上とは別に出店料という収入が生まれます。
            出店する側の勝手が分かっているからこそ、集まりやすい募集がつくれます。
          </p>
        </div>
      </LpSection>

      <LpSection title="よくある質問">
        <LpFaq
          items={[
            {
              q: "スマホだけで使えますか？",
              a: "使えます。スマホ・パソコンのブラウザで動きます。アプリのインストールは不要です。",
            },
            {
              q: "お店を登録しただけで、主催者に見つけてもらえますか？",
              a: "お店を「公開」にすると、主催者が出店者を探すときの候補に出て、スカウトが届くようになります。登録直後は下書きなので、プレビューで確かめてから公開してください。",
            },
            {
              q: "応募すると、営業許可証なども主催者に送られますか？",
              a: "送られません。やり取りの中で必要になったら、「書類を開示する」から主催者ごと・書類ごとに見せられます。開示はいつでも取り消せます。",
            },
            {
              q: "お店を複数持っています。",
              a: "お店ごとに登録でき、出店情報や申込情報もお店ごとに持てます。",
            },
          ]}
        />
      </LpSection>

      <LpFinalCta
        title="まずは、お店を登録するところから"
        lead="登録は無料、1分ほどで終わります。お店の情報は、あとから少しずつ足せます。"
        primary={primary}
        secondary={{ href: "/search?type=event", label: "出店募集を見る" }}
      />

      <LpOtherRoles current="vendors" />
    </LpShell>
  );
}
