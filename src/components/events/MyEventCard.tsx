"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Pencil, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 主催者から見た自分の募集カード。
 * マイページと /events/my の両方で使うので、見た目はここ1か所に置く。
 */
export interface MyEventData {
  id: string;
  title: string;
  venueName: string;
  area: string;
  startAt: string;
  endAt: string;
  exhibitFee: number;
  slots: number | null;
  status: string;
  images: { id: string; url: string }[];
  _count: { applications: number };
}

const STATUS_LABEL: Record<string, string> = {
  draft: "下書き",
  published: "公開中",
  closed: "募集終了",
  cancelled: "中止",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  published: "bg-green-100 text-green-700 hover:bg-green-100",
  closed: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  cancelled: "bg-red-100 text-red-700 hover:bg-red-100",
};

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const same = s.toDateString() === e.toDateString();
  const d = (x: Date) => `${x.getFullYear()}/${x.getMonth() + 1}/${x.getDate()}`;
  return same ? d(s) : `${d(s)}〜${d(e)}`;
}

export function MyEventCard({ event }: { event: MyEventData }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
      <div className="flex">
        <div className="relative w-28 sm:w-40 shrink-0 bg-gray-100">
          {event.images[0]?.url ? (
            <Image src={event.images[0].url} alt="" fill className="object-cover" sizes="160px" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CalendarDays className="h-7 w-7 text-gray-300" />
            </div>
          )}
        </div>
        <CardContent className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/events/${event.id}`}
              className="font-bold text-gray-900 hover:underline line-clamp-2"
            >
              {event.title}
            </Link>
            <Badge className={`shrink-0 ${STATUS_STYLE[event.status] ?? ""}`}>
              {STATUS_LABEL[event.status] ?? event.status}
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {formatRange(event.startAt, event.endAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.area}
            </span>
            <span className="inline-flex items-center gap-1 text-orange-600">
              <Users className="h-3 w-3" />
              応募 {event._count.applications}件
              {event.slots ? ` / ${event.slots}枠` : ""}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-full text-xs h-7" asChild>
              <Link href={`/events/${event.id}`} target="_blank">
                <ExternalLink className="h-3 w-3 mr-1" />
                {event.status === "draft" ? "プレビュー" : "公開ページ"}
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full text-xs h-7" asChild>
              <Link href={`/events/${event.id}/edit`}>
                <Pencil className="h-3 w-3 mr-1" />
                編集
              </Link>
            </Button>
            <Button size="sm" className="rounded-full text-xs h-7" asChild>
              <Link href={`/events/${event.id}/applications`}>
                <Users className="h-3 w-3 mr-1" />
                応募 {event._count.applications}件
              </Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/** 開催が終わったかどうか。マイページの「募集中 / 過去」の振り分けに使う。 */
export function isFinished(event: { endAt: string }): boolean {
  return new Date(event.endAt).getTime() < Date.now();
}
