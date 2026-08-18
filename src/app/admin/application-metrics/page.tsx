"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, BarChart3, Share2, Eye, Inbox, Printer, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MonthlyRow {
  month: string;
  issued: number;
  views: number;
  prints: number;
  leads: number;
  conversionRate: number | null;
}

interface Metrics {
  monthly: MonthlyRow[];
  byStore: { storeId: string; name: string; count: number }[];
  totals: {
    issued: number;
    views: number;
    prints: number;
    leads: number;
    registeredLeads: number;
    conversionRate: number | null;
    vendorsUsing: number;
  };
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  return `${year}年${Number(m)}月`;
}

export default function ApplicationMetricsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    (async () => {
      try {
        const res = await fetch("/api/admin/application-metrics");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "取得に失敗しました");
          return;
        }
        setMetrics(data);
      } catch {
        setError("取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [status, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const totals = metrics?.totals;
  const maxIssued = Math.max(1, ...(metrics?.monthly.map((m) => m.issued) ?? [1]));

  const cards = [
    { label: "共有リンク発行数", value: totals?.issued ?? 0, icon: Share2, hint: "ツールが使われているか" },
    { label: "リンク閲覧数", value: totals?.views ?? 0, icon: Eye, hint: "主催者に届いているか" },
    { label: "スペースリード数", value: totals?.leads ?? 0, icon: Inbox, hint: "獲得ループが回っているか" },
    {
      label: "リンク→リード転換率",
      value: totals?.conversionRate !== null && totals?.conversionRate !== undefined ? `${totals.conversionRate}%` : "—",
      icon: Percent,
      hint: "公開ページ設計の良否",
    },
    { label: "PDF出力数", value: totals?.prints ?? 0, icon: Printer, hint: "書類作成ニーズの実在" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          管理画面に戻る
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            出店申込パックの計測
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            この機能のKPIは登録者数ではありません。使われているか・届いているか・
            ループが回っているかを見ます。
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {cards.map((card) => (
            <Card key={card.label} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                  <card.icon className="h-3.5 w-3.5" />
                  <p className="text-xs">{card.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-[11px] text-gray-400 mt-1">{card.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 判定基準を数字のそばに置く。この数字を追える状態にすることが実装の目的の半分。 */}
        <Card className="rounded-2xl border-0 shadow-sm mb-6 bg-amber-50">
          <CardContent className="p-5">
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">判定の目安：</strong>
              提供開始から3ヶ月時点で共有リンク発行が20件に届かない場合、それは
              「機能が足りない」ではなく「このツールが必要とされていない」というシグナルです。
            </p>
            <p className="text-sm text-amber-800 mt-2">
              現在の累計発行数 <strong className="font-semibold">{totals?.issued ?? 0}件</strong>
              （利用している出店者 {totals?.vendorsUsing ?? 0}者）
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-sm overflow-hidden mb-6">
          <div className="px-5 pt-5">
            <h2 className="font-bold text-gray-900">月次推移</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>月</TableHead>
                  <TableHead className="text-right">リンク発行</TableHead>
                  <TableHead className="text-right">閲覧</TableHead>
                  <TableHead className="text-right">リード</TableHead>
                  <TableHead className="text-right">転換率</TableHead>
                  <TableHead className="text-right">PDF出力</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics?.monthly.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{formatMonth(row.month)}</span>
                        <span
                          className="h-1.5 rounded-full bg-orange-400"
                          style={{ width: `${(row.issued / maxIssued) * 60}px` }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.issued}</TableCell>
                    <TableCell className="text-right">{row.views}</TableCell>
                    <TableCell className="text-right">{row.leads}</TableCell>
                    <TableCell className="text-right text-gray-600">
                      {row.conversionRate !== null ? `${row.conversionRate}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">{row.prints}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {(metrics?.byStore.length ?? 0) > 0 && (
          <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
            <div className="px-5 pt-5">
              <h2 className="font-bold text-gray-900">出店者別の発行数</h2>
              <p className="text-xs text-gray-500 mt-1">上位20者</p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>店舗</TableHead>
                    <TableHead className="text-right">発行数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.byStore.map((row) => (
                    <TableRow key={row.storeId}>
                      <TableCell>
                        <Link
                          href={`/store/${row.storeId}`}
                          target="_blank"
                          className="text-sm text-gray-900 hover:underline"
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-medium">{row.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
