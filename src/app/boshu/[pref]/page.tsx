import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { boshuPath, getOpenRecruitments, prefectureFromSlug } from "@/lib/boshu";
import { BoshuView } from "../BoshuView";

export const revalidate = 3600;

type Params = Promise<{ pref: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pref } = await params;
  const prefecture = prefectureFromSlug(pref);
  if (!prefecture) return { title: "ページが見つかりません" };

  const events = await getOpenRecruitments(prefecture);
  const place = prefecture.replace(/[都府県]$/, "");
  return {
    title: `${prefecture}のキッチンカー・出店者募集一覧｜${place}のマルシェ・イベント出店募集｜てんむすび`,
    description: `${prefecture}のマルシェやイベントで、キッチンカー・飲食・ハンドメイドの出店者を募集している一覧（${events.length}件）。開催日・会場・出店料・募集期間を見て、そのまま応募できます。`,
    alternates: { canonical: boshuPath(prefecture) },
    // 募集が無い間は中身の無いページになるので、検索結果に出さない
    robots: events.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function BoshuPrefecturePage({ params }: { params: Params }) {
  const { pref } = await params;
  const prefecture = prefectureFromSlug(pref);
  if (!prefecture) notFound();

  const allEvents = await getOpenRecruitments();
  const events = allEvents.filter((e) => e.area === prefecture);
  return <BoshuView prefecture={prefecture} events={events} allEvents={allEvents} />;
}
