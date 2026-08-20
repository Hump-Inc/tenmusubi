"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  MapPin,
  Coins,
  Store as StoreIcon,
  FileCheck2,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ApplicationThread,
  type ThreadMessage,
} from "@/components/events/ApplicationThread";
import { ApplicantSpecList } from "@/components/events/ApplicantSpecList";
import type { ApplicationSnapshot } from "@/lib/eventApplicationSnapshot";
import { formatFee, formatEventDate } from "@/lib/eventFormat";

interface ThreadData {
  role: "vendor" | "organizer" | "admin";
  application: {
    id: string;
    kind: string;
    status: string;
    documentRequestedAt: string | null;
    createdAt: string;
    store: { id: string; name: string; category: string | null };
    event: {
      id: string;
      title: string;
      venueName: string;
      area: string;
      startAt: string;
      endAt: string;
      exhibitFee: number;
      feeNote: string | null;
      organizer: { orgName: string };
    };
  };
  snapshot: ApplicationSnapshot | null;
  fit: { label: string; ok: boolean; detail: string }[];
  messages: ThreadMessage[];
  disclosures: {
    id: string;
    disclosedAt: string;
    document: { id: string; type: string; label: string | null; expiresOn: string | null };
  }[];
}

const STATUS_LABEL: Record<string, string> = {
  open: "やり取り中",
  confirmed: "出店決定",
  rejected: "見送り",
  withdrawn: "取り下げ",
};
const STATUS_STYLE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  confirmed: "bg-green-100 text-green-700 hover:bg-green-100",
  rejected: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  withdrawn: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

export default function ApplicationThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ThreadData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/applications/${id}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "取得に失敗しました");
        return;
      }
      setData(json);
    } catch {
      setError("取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/events/applications/${id}`);
      return;
    }
    if (status === "authenticated") load();
  }, [status, router, id, load]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error || "取得に失敗しました"}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { application, snapshot, fit, messages, disclosures, role } = data;
  const isOrganizer = role === "organizer";
  const backHref = isOrganizer
    ? `/events/${application.event.id}/applications`
    : "/events/applications";
  const canPost = role !== "admin" && application.status === "open";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link
            href={backHref}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {isOrganizer ? "応募一覧に戻る" : "応募した募集に戻る"}
          </Link>

          {/* 見出し */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge className={STATUS_STYLE[application.status] ?? ""}>
                {STATUS_LABEL[application.status] ?? application.status}
              </Badge>
              {application.kind === "scout" && <Badge variant="outline">スカウト</Badge>}
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              {isOrganizer ? application.store.name : application.event.title}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isOrganizer
                ? `${application.event.title} への応募`
                : `主催 ${application.event.organizer.orgName}`}
            </p>
          </div>

          {/* 募集の条件 */}
          <Card className="rounded-2xl border-0 shadow-sm mb-4">
            <CardContent className="p-5">
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-gray-400" />
                  {formatEventDate(application.event.startAt, application.event.endAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {application.event.area} ・ {application.event.venueName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-gray-400" />
                  {formatFee(application.event.exhibitFee, application.event.feeNote)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 開示中の書類（実際の操作は E8 で追加する） */}
          {disclosures.length > 0 && (
            <Card className="rounded-2xl border-0 shadow-sm mb-4">
              <CardContent className="p-5">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                  <FileCheck2 className="h-4 w-4 text-orange-500" />
                  開示中の書類
                </p>
                <ul className="space-y-1">
                  {disclosures.map((d) => (
                    <li key={d.id} className="text-sm text-gray-700">
                      {d.document.label || d.document.type}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* やり取り */}
          <div className="mb-4">
            <ApplicationThread
              applicationId={application.id}
              messages={messages}
              canPost={canPost}
              closedReason={
                application.status === "confirmed"
                  ? "出店が決定しています"
                  : "このやり取りは終了しています"
              }
              onPosted={(m) => setData({ ...data, messages: [...messages, m] })}
            />
          </div>

          {/* 応募者の条件 */}
          {snapshot && (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="mb-4 flex items-center gap-1.5 text-sm font-bold text-gray-900">
                  <StoreIcon className="h-4 w-4 text-orange-500" />
                  {isOrganizer ? "応募者の条件" : "主催者に伝えている内容"}
                </p>
                <ApplicantSpecList snapshot={snapshot} fit={fit} />
                <p className="mt-4 text-xs text-gray-500">
                  応募した時点の内容です。出店申込情報を更新しても、ここは変わりません。
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
