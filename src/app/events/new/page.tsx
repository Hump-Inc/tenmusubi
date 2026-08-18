"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm, EMPTY_EVENT } from "@/components/events/EventForm";

export default function NewEventPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/events/new");
      return;
    }
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/organizer");
        const data = await res.json();
        setOrganizerStatus(data.organizer?.status ?? null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [status, router]);

  if (status === "loading" || isLoading) {
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
            href="/events/my"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイイベントに戻る
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">出店募集をつくる</h1>
          <p className="text-sm text-gray-600 mb-6">
            出店者は電源・区画サイズ・出展料を見て応募するかを決めます。ここを正確に書くほど、条件の合う出店者が集まります。
          </p>

          {organizerStatus !== "approved" ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">
                    {organizerStatus === "pending"
                      ? "主催者の審査が完了していません"
                      : "先に主催者の登録が必要です"}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    出店者に安心して応募してもらうため、運営が主催者を確認してから募集を掲載できるようにしています。
                  </p>
                  <Button className="rounded-full mt-4" asChild>
                    <Link href="/organizer">主催者情報へ</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EventForm initial={EMPTY_EVENT} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
