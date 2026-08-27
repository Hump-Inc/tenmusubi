import Link from "next/link";
import Image from "next/image";
import { CalendarDays, MapPin, Coins, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatFee, formatApplicationPeriod } from "@/lib/eventFormat";

export interface EventCardData {
  id: string;
  title: string;
  venueName: string;
  area: string;
  startAt: string;
  endAt: string;
  exhibitFee: number;
  exhibitFeeMax: number | null;
  feeNote: string | null;
  slots: number | null;
  applicationOpenAt: string | null;
  applicationCloseAt: string | null;
  powerAvailable: boolean;
  images: { id: string; url: string }[];
  organizer: { orgName: string };
  _count: { applications: number };
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function formatDay(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const same = s.toDateString() === e.toDateString();
  const d = (x: Date) => `${x.getMonth() + 1}/${x.getDate()}(${WEEK[x.getDay()]})`;
  return same ? `${s.getFullYear()}年 ${d(s)}` : `${s.getFullYear()}年 ${d(s)}〜${d(e)}`;
}

/** 「2026/8/10〜9/24」。年が同じなら右側の年は省く。カードは幅が狭い。 */
function formatPeriodLine(openAt: string | null, closeAt: string | null): string | null {
  const parse = (v: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const ymd = (d: Date) => `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

  const open = parse(openAt);
  const close = parse(closeAt);
  if (open && close) {
    const right = open.getFullYear() === close.getFullYear() ? md(close) : ymd(close);
    return `募集 ${ymd(open)}〜${right}`;
  }
  if (close) return `募集締切 ${ymd(close)}`;
  if (open) return `募集開始 ${ymd(open)}`;
  return null;
}

/** 締切までの残り日数。近いものは急かさずに、事実として出す。 */
function daysLeft(closeAt: string | null): number | null {
  if (!closeAt) return null;
  const diff = new Date(closeAt).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function EventCard({ event }: { event: EventCardData }) {
  const left = daysLeft(event.applicationCloseAt);
  // 一覧の主役は金額ではなく募集期間。区画やエリアで金額が変わる募集が多く、
  // 一律の金額を大きく出すと誤解を招く（2026-08-27 MTG）。金額は下段に幅で出す。
  const period = formatApplicationPeriod(event.applicationOpenAt, event.applicationCloseAt);
  const periodLine = formatPeriodLine(event.applicationOpenAt, event.applicationCloseAt);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/9] bg-muted">
        {event.images[0]?.url ? (
          <Image
            src={event.images[0].url}
            alt=""
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <Badge className="bg-white/95 text-gray-900 hover:bg-white/95 shadow-sm">
            {period.text}
          </Badge>
          {period.beforeOpen ? (
            <Badge className="bg-gray-900/80 text-white hover:bg-gray-900/80 shadow-sm">
              募集開始前
            </Badge>
          ) : (
            left !== null &&
            left >= 0 &&
            left <= 7 && (
              <Badge className="bg-orange-500 text-white hover:bg-orange-500 shadow-sm">
                締切まで{left === 0 ? "本日" : `${left}日`}
              </Badge>
            )
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-bold text-foreground line-clamp-2 leading-snug">{event.title}</h3>

        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {formatDay(event.startAt, event.endAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {event.area} ・ {event.venueName}
            </span>
          </span>
          {periodLine && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{periodLine}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Coins className="h-3.5 w-3.5 text-muted-foreground" />
            {formatFee(event.exhibitFee, event.feeNote, event.exhibitFeeMax)}
          </span>
          {event.slots !== null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {event.slots}枠 / 応募{event._count.applications}件
            </span>
          )}
          {event.powerAvailable && (
            <Badge variant="outline" className="text-[11px] font-normal">
              電源あり
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground truncate">主催 {event.organizer.orgName}</p>
      </div>
    </Link>
  );
}
