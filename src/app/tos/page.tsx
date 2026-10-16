import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { PAYOUT_GRACE_DAYS, platformFeePercent } from "@/lib/eventPayments";

export default function TosPage() {
  const feePercent = platformFeePercent();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold">利用規約</h1>
          </div>

          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-8 prose prose-gray max-w-none">
              <p className="text-muted-foreground mb-8">
                この利用規約（以下「本規約」）は、いいこと（以下「当社」）が提供するサービス「てんむすび」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様には、本規約に同意いただいた上で、本サービスをご利用いただきます。
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第1条（適用）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>本規約は、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。</li>
                  <li>当社は本サービスに関し、本規約のほか、ご利用にあたってのルール等、各種の定め（以下「個別規定」）をすることがあります。これら個別規定はその名称のいかんに関わらず、本規約の一部を構成するものとします。</li>
                  <li>本規約の規定が前条の個別規定の規定と矛盾する場合には、個別規定において特段の定めなき限り、個別規定の規定が優先されるものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第2条（利用登録）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。</li>
                  <li>当社は、利用登録の申請者に以下の事由があると判断した場合、利用登録の申請を承認しないことがあり、その理由については一切の開示義務を負わないものとします。
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
                      <li>本規約に違反したことがある者からの申請である場合</li>
                      <li>その他、当社が利用登録を相当でないと判断した場合</li>
                    </ul>
                  </li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第3条（ユーザーIDおよびパスワードの管理）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。</li>
                  <li>ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。</li>
                  <li>当社は、ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には、そのユーザーIDを登録しているユーザー自身による利用とみなします。</li>
                  <li>ユーザーIDおよびパスワードが第三者によって使用されたことによって生じた損害は、当社に故意または重大な過失がある場合を除き、当社は一切の責任を負わないものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第4条（禁止事項）</h2>
                <p className="text-muted-foreground mb-2">ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>当社、本サービスの他のユーザー、または第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>当社のサービスの運営を妨害するおそれのある行為</li>
                  <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>他のユーザーに成りすます行為</li>
                  <li>当社のサービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                  <li>当社、本サービスの他のユーザーまたは第三者の知的財産権、肖像権、プライバシー、名誉その他の権利または利益を侵害する行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第5条（本サービスの提供の停止等）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                      <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                      <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                      <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                    </ul>
                  </li>
                  <li>当社は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第6条（利用制限および登録抹消）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>本規約のいずれかの条項に違反した場合</li>
                      <li>登録事項に虚偽の事実があることが判明した場合</li>
                      <li>料金等の支払債務の不履行があった場合</li>
                      <li>当社からの連絡に対し、一定期間返答がない場合</li>
                      <li>本サービスについて、最終の利用から一定期間利用がない場合</li>
                      <li>その他、当社が本サービスの利用を適当でないと判断した場合</li>
                    </ul>
                  </li>
                  <li>当社は、本条に基づき当社が行った行為によりユーザーに生じた損害について、一切の責任を負いません。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第7条（退会）</h2>
                <p className="text-muted-foreground">
                  ユーザーは、当社の定める退会手続により、本サービスから退会できるものとします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第8条（保証の否認および免責事項）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。</li>
                  <li>当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重過失による場合を除き、一切の責任を負いません。</li>
                  <li>当社は、本サービスに関して、ユーザーと他のユーザーまたは第三者との間において生じた取引、連絡または紛争等について一切責任を負いません。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第9条（出店料の決済）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>本サービスでは、イベントへの出店が決定した出店者が主催者に支払う出店料を、本サービス上でクレジットカード等により決済することができます。決済には Stripe, Inc. およびその関連会社（以下「Stripe」）が提供する決済サービスを利用し、主催者は Stripe の定める規約に同意の上、出店料の受取口座を設定するものとします。</li>
                  <li>出店に関する契約の当事者は主催者と出店者であり、当社は主催者の委託を受けて出店料を代理受領します。出店者が本サービス上で決済した出店料は、イベントの開催までは仮払いとして当社が預かり、次項以下に従って主催者に支払います。開催前にキャンセルまたは中止となった場合は、第5項の規定に従って返金します。</li>
                  <li>当社は、出店料から当社所定の手数料（出店料の{feePercent}%・税込。決済手数料を含みます）を差し引いた額を主催者に支払います。手数料の額は、主催者が出店料を請求した時点で確定します。</li>
                  <li>主催者への支払いは、イベントの開催終了日の{PAYOUT_GRACE_DAYS}日後以降に行います。</li>
                  <li>出店料のキャンセルおよび返金は、当社が別に定める「<a href="/cancel-policy" className="text-orange-600 hover:underline">出店料のキャンセル規定</a>」によるものとします。同規定は第1条の個別規定にあたります。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第10条（サービス内容の変更等）</h2>
                <p className="text-muted-foreground">
                  当社は、ユーザーへの事前の告知をもって、本サービスの内容を変更、追加または廃止することがあり、ユーザーはこれを承諾するものとします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第11条（利用規約の変更）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>当社は以下の場合には、ユーザーの個別の同意を要せず、本規約を変更することができるものとします。
                    <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                      <li>本規約の変更がユーザーの一般の利益に適合するとき。</li>
                      <li>本規約の変更が本サービス利用契約の目的に反せず、かつ、変更の必要性、変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。</li>
                    </ul>
                  </li>
                  <li>当社はユーザーに対し、前項による本規約の変更にあたり、事前に、本規約を変更する旨および変更後の本規約の内容並びにその効力発生時期を通知します。</li>
                </ol>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第12条（個人情報の取扱い）</h2>
                <p className="text-muted-foreground">
                  当社は、本サービスの利用によって取得する個人情報については、当社「プライバシーポリシー」に従い適切に取り扱うものとします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第13条（通知または連絡）</h2>
                <p className="text-muted-foreground">
                  ユーザーと当社との間の通知または連絡は、当社の定める方法によって行うものとします。当社は、ユーザーから、当社が別途定める方式に従った変更届け出がない限り、現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い、これらは、発信時にユーザーへ到達したものとみなします。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第14条（権利義務の譲渡の禁止）</h2>
                <p className="text-muted-foreground">
                  ユーザーは、当社の書面による事前の承諾なく、利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し、または担保に供することはできません。
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-bold mb-4">第15条（準拠法・裁判管轄）</h2>
                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                  <li>本規約の解釈にあたっては、日本法を準拠法とします。</li>
                  <li>本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。</li>
                </ol>
              </section>

              <p className="text-sm text-muted-foreground text-right mt-8">
                以上
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
