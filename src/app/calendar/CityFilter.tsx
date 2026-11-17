"use client";

import { useRouter } from "next/navigation";
import { CHIBA_CITIES } from "@/lib/eventListing";

/** 市町村の絞り込み。選んだらすぐ URL を変える（期間の指定は残す） */
export function CityFilter({ period, city }: { period: string; city: string | null }) {
  const router = useRouter();
  return (
    <select
      aria-label="市町村で絞る"
      value={city ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (period !== "upcoming") params.set("period", period);
        if (e.target.value) params.set("city", e.target.value);
        const q = params.toString();
        router.push(q ? `/calendar?${q}` : "/calendar");
      }}
      className="h-8 rounded-full border border-gray-300 bg-white px-3 text-sm text-gray-700"
    >
      <option value="">市町村で絞る</option>
      {CHIBA_CITIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
