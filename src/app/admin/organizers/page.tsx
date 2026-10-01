"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Handshake,
  Globe,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Organizer {
  id: string;
  orgName: string;
  contactName: string | null;
  phone: string | null;
  website: string | null;
  intro: string | null;
  status: string;
  note: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  _count: { events: number };
}

const STATUS_LABEL: Record<string, string> = {
  pending: "審査待ち",
  approved: "承認済み",
  rejected: "却下",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  approved: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

function formatDate(value: string): string {
  const d = new Date(value);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function AdminOrganizersPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [target, setTarget] = useState<Organizer | null>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrganizers = useCallback(async () => {
    setIsLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const res = await fetch(`/api/admin/organizers${query}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      setOrganizers(data.organizers);
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
    if (authStatus === "authenticated") fetchOrganizers();
  }, [authStatus, router, fetchOrganizers]);

  const review = async (nextStatus: "approved" | "rejected") => {
    if (!target) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/organizers/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "更新に失敗しました");
        return;
      }
      setTarget(null);
      setNote("");
      await fetchOrganizers();
    } finally {
      setIsSubmitting(false);
    }
  };

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

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Handshake className="h-6 w-6 text-orange-500" />
              主催者の審査
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              承認するまで出店募集は公開されません。実在する主催者かを確認してください。
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">審査待ち</SelectItem>
              <SelectItem value="approved">承認済み</SelectItem>
              <SelectItem value="rejected">却下</SelectItem>
              <SelectItem value="all">すべて</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            ["合計", stats.total],
            ["審査待ち", stats.pending],
            ["承認済み", stats.approved],
            ["却下", stats.rejected],
          ].map(([label, value]) => (
            <Card key={String(label)} className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : organizers.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Handshake className="h-10 w-10 mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500">該当する主催者はいません</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {organizers.map((o) => (
              <li key={o.id}>
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{o.orgName}</p>
                          <Badge className={STATUS_STYLE[o.status] ?? ""}>
                            {STATUS_LABEL[o.status] ?? o.status}
                          </Badge>
                          {o._count.events > 0 && (
                            <span className="text-xs text-gray-500">
                              募集 {o._count.events}件
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(o.createdAt)} 申請
                          {o.contactName && ` ・ 担当 ${o.contactName}`}
                        </p>
                      </div>
                      {o.status === "pending" && (
                        <Button
                          size="sm"
                          className="rounded-full shrink-0"
                          onClick={() => {
                            setTarget(o);
                            setNote("");
                          }}
                        >
                          審査する
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      {o.user.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {o.user.email}
                        </span>
                      )}
                      {o.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {o.phone}
                        </span>
                      )}
                      {o.website && (
                        <a
                          href={o.website}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <Globe className="h-3 w-3" />
                          サイトを見る
                        </a>
                      )}
                    </div>

                    {o.intro && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-xl bg-gray-50 px-4 py-3">
                        {o.intro}
                      </p>
                    )}

                    {o.status === "rejected" && o.note && (
                      <p className="text-xs text-gray-500">却下理由: {o.note}</p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{target?.orgName} の審査</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              承認すると、この主催者は出店募集を掲載できるようになります。
              却下する場合は、申請者に伝わる理由を書いてください。
            </p>
            <div className="space-y-2">
              <Label htmlFor="note">申請者へのメッセージ（却下時は必須）</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="例: 過去の開催実績が分かる情報を追記してください"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 rounded-full"
                disabled={isSubmitting}
                onClick={() => review("approved")}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                承認する
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-full text-red-600 hover:text-red-700"
                disabled={isSubmitting || !note.trim()}
                onClick={() => review("rejected")}
              >
                <XCircle className="mr-2 h-4 w-4" />
                却下する
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
