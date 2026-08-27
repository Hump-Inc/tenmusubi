"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  EventForm,
  EMPTY_EVENT,
  EMPTY_FEE_TIER,
  toLocalInput,
  type EventFormValues,
} from "@/components/events/EventForm";

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [initial, setInitial] = useState<EventFormValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/events/${id}/edit`);
      return;
    }
    if (status !== "authenticated") return;
    (async () => {
      const res = await fetch(`/api/events/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "取得に失敗しました");
        return;
      }
      const e = data.event;
      setInitial({
        ...EMPTY_EVENT,
        title: str(e.title),
        description: str(e.description),
        venueName: str(e.venueName),
        address: str(e.address),
        area: str(e.area),
        startAt: toLocalInput(e.startAt, "datetime"),
        endAt: toLocalInput(e.endAt, "datetime"),
        applicationOpenAt: toLocalInput(e.applicationOpenAt, "date"),
        applicationCloseAt: toLocalInput(e.applicationCloseAt, "date"),
        slots: str(e.slots),
        // 区画の行がまだ無い募集（この機能より前に作られたもの）は、
        // 既存の金額から1行だけ作って引き継ぐ
        feeTiers:
          Array.isArray(e.feeTiers) && e.feeTiers.length > 0
            ? e.feeTiers.map(
                (t: {
                  label: string | null;
                  fee: number;
                  note: string | null;
                  slots: number | null;
                  widthM: number | null;
                  depthM: number | null;
                }) => ({
                  label: str(t.label),
                  fee: str(t.fee),
                  note: str(t.note),
                  slots: str(t.slots),
                  widthM: str(t.widthM),
                  depthM: str(t.depthM),
                })
              )
            : [{ ...EMPTY_FEE_TIER, fee: str(e.exhibitFee) }],
        feeNote: str(e.feeNote),
        spaceWidthM: str(e.spaceWidthM),
        spaceDepthM: str(e.spaceDepthM),
        powerAvailable: !!e.powerAvailable,
        powerWatt: str(e.powerWatt),
        waterAvailable: !!e.waterAvailable,
        fireAllowed: !!e.fireAllowed,
        categories: parseJsonArray(e.categories),
        requiredDocuments: parseJsonArray(e.requiredDocuments),
        expectedVisitors: str(e.expectedVisitors),
        note: str(e.note),
        status: str(e.status),
      });
    })();
  }, [status, router, id]);

  if (status === "loading" || (!initial && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  if (!session) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href={`/events/${id}`}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            募集ページに戻る
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-6">出店募集を編集</h1>

          {error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : (
            initial && <EventForm initial={initial} eventId={id} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
