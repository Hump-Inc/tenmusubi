import { notFound } from "next/navigation";
import { PREMIUM_PLAN_ENABLED } from "@/lib/constants";

// プレミアムプランの方針が決まるまで、料金ページは出さない（src/lib/constants.ts）
export default function PricingLayout({ children }: { children: React.ReactNode }) {
  if (!PREMIUM_PLAN_ENABLED) notFound();
  return children;
}
