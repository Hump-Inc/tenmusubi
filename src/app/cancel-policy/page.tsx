import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import {
  CANCELLATION_POLICY,
  CANCELLATION_POLICY_IS_DRAFT,
  CANCELLATION_POLICY_OPEN_ITEMS,
  CANCELLATION_POLICY_VERSION,
} from "@/lib/cancellationPolicy";

export const metadata: Metadata = {
  title: "出展料のキャンセル規定 | てんむすび",
};

// 出展料の決済と一体の規定なので、決済を切っている間は出さない
export default function CancelPolicyPage() {
  if (!EVENT_PAYMENTS_ENABLED) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">出展料のキャンセル規定</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              イベントの出店が決まり、出展料をてんむすびで支払った場合のキャンセルと返金のルールです。
              主催者・出店者のどちらにも適用されます。
            </p>
          </div>

          {CANCELLATION_POLICY_IS_DRAFT && (
            <div className="mb-6 rounded-2xl bg-amber-50 p-5 text-amber-900">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                草案です。内容は変わることがあります
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
                {CANCELLATION_POLICY_OPEN_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <Card className="border-0 shadow-md rounded-2xl">
            <CardContent className="py-8 space-y-8">
              {CANCELLATION_POLICY.map((article) => (
                <section key={article.title}>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">{article.title}</h2>
                  <div className="space-y-2 text-sm leading-relaxed text-gray-700">
                    {article.body.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  {article.table && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-gray-600">
                          <tr>
                            <th className="px-4 py-2 font-medium">取りやめの時期</th>
                            <th className="px-4 py-2 font-medium text-right">キャンセル料</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {article.table.map((row) => (
                            <tr key={row.when}>
                              <td className="px-4 py-2 text-gray-700">{row.when}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-900">
                                {row.fee}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
              <p className="text-xs text-muted-foreground">版: {CANCELLATION_POLICY_VERSION}</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
