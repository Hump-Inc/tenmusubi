import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";

/**
 * 主催者向けの使い方（出店募集の作り方）。
 * 画面の写真は public/images/guide/organizer/ にある。画面を変えたら撮り直すこと
 * （ローカルのデモ主催者アカウントで撮影。prisma/seed-cancellation-demo.ts）。
 */

export const metadata: Metadata = {
  title: "出店募集の作り方｜主催者向けガイド｜てんむすび",
  description:
    "てんむすびで出店者（キッチンカー・ハンドメイドなど）を募集する手順。主催者の登録から、募集の作成・公開、応募への対応、出店料の請求と入金、キャンセルの扱いまで画面つきで説明します。",
};

const SECTIONS = [
  { id: "before", title: "1. 始める前に" },
  { id: "create", title: "2. 募集を作る" },
  { id: "publish", title: "3. 公開して確かめる" },
  { id: "applications", title: "4. 応募が来たら" },
  { id: "payment", title: "5. 出店料の請求と入金" },
  { id: "cancel", title: "6. 中止・キャンセルのとき" },
];

const FLOW = [
  { title: "主催者を登録", note: "初回だけ" },
  { title: "運営が承認", note: "口座の設定もここで" },
  { title: "募集を作って公開", note: "下書き保存もできる" },
  { title: "応募・やり取り", note: "書類もここで確認" },
  { title: "出店を決定", note: "キャンセル規定に同意" },
  { title: "出店料を請求", note: "出店者がカードで支払う" },
  { title: "開催", note: "雨天時は約束どおり" },
  { title: "口座へ入金", note: "開催の2日後以降" },
];

function Shot({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return (
    <figure className="my-5">
      <Image
        src={`/images/guide/organizer/${src}`}
        alt={alt}
        width={width}
        height={height}
        sizes="(max-width: 768px) 100vw, 720px"
        // 撮った大きさより広げるとぼやけるので、元の幅までにする
        style={{ maxWidth: width }}
        className="w-full h-auto rounded-xl border border-gray-200 bg-white"
      />
      <figcaption className="mt-1.5 text-xs text-gray-500">{alt}</figcaption>
    </figure>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 mt-14 mb-4 text-xl sm:text-2xl font-bold text-gray-900">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-8 mb-2 text-lg font-bold text-gray-900">{children}</h3>;
}

export default function OrganizerGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-10">
        <article className="container mx-auto px-4 max-w-3xl text-gray-700 leading-relaxed">
          <p className="text-sm font-medium text-orange-600">主催者向けガイド</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900">出店募集の作り方</h1>
          <p className="mt-4">
            てんむすびでは、マルシェやイベントの出店者（キッチンカー・ハンドメイドなど）を募集し、
            応募の受付から出店料の受け取りまでを一つの画面で進められます。
            はじめて募集を出す主催者の方に向けて、手順を画面つきで説明します。
          </p>
          <p className="mt-3">
            募集を出すまでに必要なのは、主催者の登録（運営の承認）と、出店料を受け取る口座の設定の2つです。
            そのあとは募集を作って公開し、応募を待つだけです。
          </p>

          {/* 流れ */}
          <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FLOW.map((step, i) => (
              <li
                key={step.title}
                className={`rounded-xl border p-3 text-center ${
                  i === FLOW.length - 1 ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-white"
                }`}
              >
                <span className="block text-xs text-gray-400">{i + 1}</span>
                <span className="block text-sm font-bold text-gray-900">{step.title}</span>
                <span className="block text-xs text-gray-500">{step.note}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-sm text-gray-500">
            現金や振込で出店料を受け取る場合は、口座の設定と「出店料を請求」は飛ばせます。
          </p>

          {/* 目次 */}
          <nav className="mt-8 rounded-2xl bg-white p-5 shadow-sm" aria-label="目次">
            <p className="text-sm font-bold text-gray-900">目次</p>
            <ul className="mt-2 space-y-1 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-orange-700 hover:underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <H2 id="before">1. 始める前に</H2>
          <H3>主催者の登録（初回だけ）</H3>
          <ol className="list-decimal pl-5 space-y-1">
            <li>てんむすびに会員登録してログインします。</li>
            <li>
              マイページから「主催者情報」を開き、団体名・主催者名、ご担当者名、電話番号、ウェブサイト・SNS、主催実績を入れて保存します。
            </li>
            <li>
              「審査中です」と出たら、運営の確認を待ちます。承認されると「承認済みです」に変わり、「出店募集をつくる」ボタンが使えるようになります。
            </li>
          </ol>
          <Shot src="profile.png" alt="主催者情報の登録内容" width={515} height={380} />
          <p>
            過去のイベントが分かるページ（Instagram など）を入れておくと、審査が早く進みます。
            ここで入れた団体名と紹介は、募集ページに「主催」として表示されます。
          </p>
          <Shot src="approved.png" alt="承認されると「出店募集をつくる」が使える" width={1364} height={706} />

          <H3>出店料の受け取り口座（カードで受け取る場合）</H3>
          <p>
            「主催者情報」の「出店料のオンライン受け取り」から「受け取り口座を設定する」を押し、
            決済会社 Stripe の画面で口座と本人確認を登録します。現金や振込で受け取る場合は、設定しなくてかまいません。
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>口座への入金は、Stripe の確認が終わり次第始まります。</li>
            <li>登録後は同じ場所に「受け取り口座」と、募集ごとの入金状況が表示されます。</li>
          </ul>

          <H2 id="create">2. 募集を作る</H2>
          <p>
            「主催者情報」またはマイページの「マイイベント」から「出店募集をつくる」を押すと、入力画面が開きます。
            出店者は電源・区画サイズ・出店料を見て応募するか決めるので、ここを正確に書くほど、条件の合う出店者が集まります。＊印は必須です。
          </p>

          <H3>イベントの概要</H3>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>イベント名＊</b>：検索で探される名前にします（例：秋の〇〇マルシェ）。</li>
            <li><b>イベントの紹介</b>：どんなイベントか、どんな出店者に来てほしいか。</li>
            <li><b>開始日時・終了日時＊</b>、<b>想定来場者数</b>。</li>
          </ul>
          <Shot src="form-overview.png" alt="イベントの概要" width={854} height={686} />

          <H3>会場</H3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>会場名＊</b>、<b>エリア（都道府県）＊</b>、<b>住所</b>。
              千葉県の募集は、住所の市町村で「千葉のイベントカレンダー」にも載ります。市町村まで入れてください。
            </li>
          </ul>
          <Shot src="form-venue.png" alt="会場" width={924} height={458} />

          <H3>募集条件</H3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>出店料＊</b>：区画ごとに名前・金額・枠数・サイズを入れます。無料なら 0 円。
              金額が区画で変わるときは「区画を追加」で行を足します。「応相談」は使えません。
            </li>
            <li><b>オプション料金</b>：電源やテントの貸し出しなど、希望した出店者にだけかかる料金。</li>
            <li><b>出店料の補足</b>：どの区画にもかかる条件（例：＋売上の10%）。</li>
            <li>
              <b>募集枠数</b>、<b>1区画のサイズ</b>、<b>募集開始日・締切日</b>（開始日は開催の2か月前が自動で入ります）、<b>募集する業種</b>。
            </li>
          </ul>
          <Shot src="form-fee.png" alt="募集条件（出店料・区画）" width={741} height={804} />

          <H3>会場で使える設備</H3>
          <p>
            電源・給排水・火気の使用をスイッチで選びます。電源を用意できる場合は、1区画あたりの上限（W）も入れます。
            ここが合わないと出店できないので、正確に書いてください。
          </p>
          <Shot src="form-equipment.png" alt="会場で使える設備" width={924} height={552} />

          <H3>雨天時の扱い＊</H3>
          <ul className="list-disc pl-5 space-y-1">
            <li><b>雨の場合</b>：雨天決行／荒天中止／雨天中止から選びます。</li>
            <li>
              <b>中止を判断する期限</b>：「いつ」「何時」までに出店者へ知らせるか。
              出店者は数日前には仕入れを済ませるので、募集の時点で約束します。
            </li>
            <li><b>天候で中止になった場合の出店料</b>：全額返金か半額返金。</li>
          </ul>
          <Shot src="form-rain.png" alt="雨天時の扱い" width={921} height={645} />

          <H3>写真</H3>
          <p>
            一度「下書き保存」すると、編集画面から写真を追加できるようになります。
            会場や前回の様子の写真があると応募が集まりやすくなります。
          </p>

          <H3>必要書類・その他</H3>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <b>出店にあたって確認したい書類</b>：営業許可証・食品衛生責任者証・PL保険証券・車検証など。
              書類は応募時には届かず、やり取りの中で出店者が開示したものを確認できます。
            </li>
            <li><b>出店者への連絡事項</b>：搬入の時間、ゴミの扱いなど。</li>
          </ul>
          <Shot src="form-submit.png" alt="必要書類と「募集を公開する」「下書き保存」" width={902} height={666} />

          <H2 id="publish">3. 公開して確かめる</H2>
          <p>入力画面の一番下に「募集を公開する」と「下書き保存」があります。</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li><b>下書き保存</b>：出店者にはまだ見えません。写真を足したり、他の人に確認してもらったりするときに使います。</li>
            <li>
              <b>募集を公開する</b>：募集ページが公開され、出店者が応募できるようになります。
              あなたをフォローしている出店者には新着のお知らせが届きます。
            </li>
          </ul>
          <p className="mt-3">
            公開後は、募集ページで出店者からの見え方を確かめてください。開催日時・会場・出店料・設備・雨天時の扱いが上に並びます。
            内容を直すときは募集ページの「編集」からです。
          </p>
          <Shot src="event-page.png" alt="公開した募集ページ（見本）" width={782} height={764} />
          <ul className="list-disc pl-5 space-y-1">
            <li>応募がある募集は下書きに戻せません。取りやめる場合は「6. 中止・キャンセルのとき」を見てください。</li>
            <li>募集を消すことは主催者にはできません。理由を添えて運営に削除を申請します。</li>
          </ul>

          <H2 id="applications">4. 応募が来たら</H2>
          <p>
            応募が届くと、サイトの通知でお知らせします（通知設定でメールでも受け取れます）。
            募集ページの「応募を確認する」から応募一覧を開きます。
          </p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>
              <b>応募一覧</b>で、応募数・やり取り中・出店決定・募集枠を確かめます。各応募の「やり取りを見る」で出店者ごとの画面に入ります。
            </li>
            <li><b>やり取り</b>の画面で、出店者の店舗情報、開示された書類を確認し、メッセージで質問や調整をします。</li>
            <li>
              条件が合えば<b>「出店を決定する」</b>を押します。このとき「出店料のキャンセル規定」への同意を求められます。合わない場合は「見送る」を押します。
            </li>
            <li>出店が決まったあとも、同じ画面で当日の詳細をやり取りできます。</li>
          </ol>
          <Shot src="applications.png" alt="応募一覧" width={941} height={627} />
          <p>
            応募を待つだけでは枠が埋まらないときは、<b>「出店者をスカウトする」</b>から、登録されている出店者を探して声をかけられます。
          </p>

          <H2 id="payment">5. 出店料の請求と入金</H2>
          <p>受け取り口座を設定していれば、出店が決まった出店者に出店料を請求し、カードで払ってもらえます。</p>
          <ol className="mt-2 list-decimal pl-5 space-y-1">
            <li>出店者とのやり取り画面の「出店料のお支払い」で<b>「出店料を請求する」</b>を押します。</li>
            <li>金額を確かめ、<b>「この内容で請求する」</b>を押します。画面に、手数料を差し引いて入金される額が出ます。</li>
            <li>出店者がカードで支払うと「支払い済み」になり、入金予定日が表示されます。</li>
          </ol>
          <Shot src="payment.png" alt="やり取り画面の出店料とキャンセル" width={843} height={687} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-left font-medium text-gray-900 whitespace-nowrap">手数料</th>
                  <td className="py-2">出店料の10%（税込）</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-left font-medium text-gray-900 whitespace-nowrap">入金の時期</th>
                  <td className="py-2">開催が終わった2日後以降に、まとめて口座へ</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <th className="py-2 pr-4 text-left font-medium text-gray-900 whitespace-nowrap">請求できない募集</th>
                  <td className="py-2">入金予定が85日より先になる募集</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            現金や振込で受け取る場合は、この手続きは不要です。領収書は決済会社（Stripe）から出店者へ自動でメールされます。
          </p>

          <H2 id="cancel">6. 中止・キャンセルのとき</H2>
          <p>
            キャンセルと返金は、すべて
            <Link href="/cancel-policy" className="text-orange-700 underline">出店料のキャンセル規定</Link>
            に沿って画面の手続きで進みます。カードで受け取った出店料の返金は自動で行われます。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-900">
                  <th className="py-2 pr-3 font-medium">こんなとき</th>
                  <th className="py-2 pr-3 font-medium">やること</th>
                  <th className="py-2 font-medium">返金</th>
                </tr>
              </thead>
              <tbody className="align-top">
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-3">出店者からキャンセルの申し出が来た</td>
                  <td className="py-2 pr-3">やり取り画面で申し出を受け付ける（返金額は規定どおり以上）。出店者が承認すると返金</td>
                  <td className="py-2">規定の額以上</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-3">主催者の都合で1店だけ取り消す</td>
                  <td className="py-2 pr-3">やり取り画面の「キャンセル」で「主催者都合で取り消す」。理由は必須で、出店者に届きます</td>
                  <td className="py-2">全額</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-3">募集そのものを中止する</td>
                  <td className="py-2 pr-3">募集ページの「募集の中止」。応募中・出店決定の出店者に知らせが届きます</td>
                  <td className="py-2">理由による</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-2 pr-3">天候で中止する</td>
                  <td className="py-2 pr-3">募集で約束した期限までに中止し、出店者に知らせる</td>
                  <td className="py-2">募集で決めた全額／半額</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="mt-4 list-disc pl-5 space-y-1">
            <li>どちらかが3日動かないと、手続きは自動で確定します。</li>
            <li>返金額で合意できないときは「合意できない」を押すと、運営が額を決めて確定します。</li>
            <li>手続き中の出店料は、確定するまで口座への入金を止めます。</li>
            <li>主催者都合の取り消しの回数（過去1年）は、募集ページの主催者欄に表示されます。天候による中止は数えません。</li>
          </ul>

          <div className="mt-14 rounded-2xl bg-orange-50 p-6 text-center">
            <p className="font-bold text-gray-900">さっそく出店者を募集してみましょう</p>
            <p className="mt-1 text-sm text-gray-600">登録と募集の掲載は無料です。</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button className="rounded-full" asChild>
                <Link href="/organizer">
                  主催者の登録・募集の作成へ
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" className="rounded-full bg-white" asChild>
                <Link href="/contact">わからないことを問い合わせる</Link>
              </Button>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
