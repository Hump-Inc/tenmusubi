import type { Metadata } from "next";
import { getOpenRecruitments } from "@/lib/boshu";
import { BoshuView } from "./BoshuView";

// 締切や開催日で一覧が変わるので、1時間ごとに作り直す
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "キッチンカー・出店者募集一覧｜マルシェ・イベントの出店募集｜てんむすび",
  description:
    "マルシェやイベントのキッチンカー・飲食・ハンドメイドの出店者募集の一覧。開催日・会場・出店料・募集期間を見て、そのまま応募できます。",
  alternates: { canonical: "/boshu" },
};

export default async function BoshuPage() {
  const events = await getOpenRecruitments();
  return <BoshuView prefecture={null} events={events} allEvents={events} />;
}
