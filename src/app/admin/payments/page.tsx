"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  Loader2,
  ArrowLeft,
  Filter,
  Clock,
  CheckCircle2,
  Coins,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentItem {
  id: string;
  description: string;
  amount: number;
  platformFee: number;
  status: string;
  refundedAmount: number;
  paidAt: string | null;
  paidOutAt: string | null;
  createdAt: string;
  applicationId: string;
  storeName: string;
  eventTitle: string;
  eventCancelled: boolean;
  orgName: string;
  stripeUrl: string | null;
}

interface Stats {
  requested: number;
  paidCount: number;
  paidTotal: number;
  feeTotal: number;
  needsReview: number;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  requested: { label: "未払い", variant: "outline" },
  paid: { label: "支払い済み", variant: "default" },
  canceled: { label: "取り消し", variant: "secondary" },
  refunded: { label: "返金済み", variant: "secondary" },
};

function yen(n: number) {
  return `${n.toLocaleString("ja-JP")}円`;
}

export default function AdminPaymentsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<Stats>({ requested: 0, paidCount: 0, paidTotal: 0, feeTotal: 0, needsReview: 0 });
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/admin/payments");
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments);
          setStats(data.stats);
        }
      } catch (error) {
        console.error("Failed to fetch payments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const filtered =
    statusFilter === "all"
      ? payments
      : statusFilter === "review"
        ? payments.filter((p) => p.status === "paid" && p.eventCancelled)
        : payments.filter((p) => p.status === statusFilter);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">出展料の決済</h1>
                <p className="text-sm text-gray-600">
                  返金は Stripe ダッシュボードから行ってください。結果はここに自動で反映されます。
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-amber-500 mx-auto" />
              <p className="text-2xl font-bold mt-2">{stats.requested}</p>
              <p className="text-xs text-muted-foreground">未払いの請求</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto" />
              <p className="text-2xl font-bold mt-2">{yen(stats.paidTotal)}</p>
              <p className="text-xs text-muted-foreground">決済額（返金を除く・{stats.paidCount}件）</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="p-4 text-center">
              <Coins className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="text-2xl font-bold mt-2">{yen(stats.feeTotal)}</p>
              <p className="text-xs text-muted-foreground">手数料</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm rounded-2xl ${stats.needsReview > 0 ? "ring-2 ring-red-200" : ""}`}>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mx-auto" />
              <p className="text-2xl font-bold mt-2">{stats.needsReview}</p>
              <p className="text-xs text-muted-foreground">中止した募集の支払い</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] rounded-full">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              <SelectItem value="requested">未払い</SelectItem>
              <SelectItem value="paid">支払い済み</SelectItem>
              <SelectItem value="refunded">返金済み</SelectItem>
              <SelectItem value="canceled">取り消し</SelectItem>
              <SelectItem value="review">中止した募集の支払い</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>請求日</TableHead>
                <TableHead>募集 / 主催者</TableHead>
                <TableHead>出店者</TableHead>
                <TableHead>品目</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead className="text-right">手数料</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    該当する決済はありません
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const s = statusLabels[p.status] ?? { label: p.status, variant: "outline" as const };
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(p.createdAt).toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <p className="font-medium">{p.eventTitle}</p>
                        <p className="text-xs text-muted-foreground">{p.orgName}</p>
                        {p.eventCancelled && (
                          <Badge variant="destructive" className="mt-1 text-[10px]">募集中止</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{p.storeName}</TableCell>
                      <TableCell className="text-sm">{p.description}</TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">
                        {yen(p.amount)}
                        {p.refundedAmount > 0 && (
                          <p className="text-xs text-muted-foreground">返金 {yen(p.refundedAmount)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right whitespace-nowrap">{yen(p.platformFee)}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                        {p.status === "paid" && (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-nowrap">
                            {p.paidOutAt
                              ? `${new Date(p.paidOutAt).toLocaleDateString("ja-JP")} 入金`
                              : "入金待ち（開催後）"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" asChild>
                            <Link href={`/events/applications/${p.applicationId}`}>やり取り</Link>
                          </Button>
                          {p.stripeUrl && (
                            <Button variant="ghost" size="sm" className="text-xs" asChild>
                              <a href={p.stripeUrl} target="_blank" rel="noopener noreferrer">
                                Stripe
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </div>
  );
}
