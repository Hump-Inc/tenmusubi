"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Inbox,
  Mail,
  Phone,
  MapPin,
  Share2,
  Store as StoreIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { SPACE_LEAD_STATUSES, spaceLeadStatusLabel } from "@/lib/constants";

interface SpaceLead {
  id: string;
  spaceName: string;
  area: string | null;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  shareLink: { id: string; label: string | null; token: string } | null;
  store: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-orange-100 text-orange-700 hover:bg-orange-100",
  contacted: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  qualified: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  registered: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AdminSpaceLeadsPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<SpaceLead[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/space-leads${query}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setLeads(data.leads);
      setStats(data.stats);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (authStatus === "authenticated") fetchLeads();
  }, [authStatus, router, fetchLeads]);

  const updateStatus = async (lead: SpaceLead, next: string) => {
    const res = await fetch(`/api/admin/space-leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) return;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status: next } : l)));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          管理画面に戻る
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Inbox className="h-6 w-6 text-orange-500" />
              スペースリード
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              出店者の共有ページ経由で届いたスペースオーナーからの相談です。
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべて</SelectItem>
              {SPACE_LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">合計</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total ?? 0}</p>
            </CardContent>
          </Card>
          {SPACE_LEAD_STATUSES.map((s) => (
            <Card key={s.value} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stats[s.value] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : leads.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Inbox className="h-10 w-10 mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500">該当するリードはありません</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>スペース</TableHead>
                    <TableHead>ご担当者・連絡先</TableHead>
                    <TableHead>流入元</TableHead>
                    <TableHead>受信日時</TableHead>
                    <TableHead className="w-[150px]">ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="align-top">
                        <p className="font-medium text-gray-900">{lead.spaceName}</p>
                        {lead.area && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.area}
                          </p>
                        )}
                        {lead.note && (
                          <p className="text-xs text-gray-600 mt-1 max-w-xs whitespace-pre-wrap">
                            {lead.note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm text-gray-900">{lead.contactName}</p>
                        {lead.contactEmail && (
                          <a
                            href={`mailto:${lead.contactEmail}`}
                            className="text-xs text-blue-600 hover:underline mt-0.5 flex items-center gap-1"
                          >
                            <Mail className="h-3 w-3" />
                            {lead.contactEmail}
                          </a>
                        )}
                        {lead.contactPhone && (
                          <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.contactPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {lead.store ? (
                          <Link
                            href={`/store/${lead.store.id}`}
                            target="_blank"
                            className="text-sm text-gray-900 hover:underline flex items-center gap-1"
                          >
                            <StoreIcon className="h-3 w-3" />
                            {lead.store.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                        {lead.shareLink && (
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Share2 className="h-3 w-3" />
                            {lead.shareLink.label || "（名前なし）"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-gray-600 whitespace-nowrap">
                        {formatDateTime(lead.createdAt)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge className={`mb-2 ${STATUS_STYLES[lead.status] ?? ""}`}>
                          {spaceLeadStatusLabel(lead.status)}
                        </Badge>
                        <Select
                          value={lead.status}
                          onValueChange={(next) => updateStatus(lead, next)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SPACE_LEAD_STATUSES.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
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
