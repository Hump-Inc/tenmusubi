import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PREMIUM_PLAN_ENABLED } from "@/lib/constants";

// プレミアムプランを閉じている間は、加入したことがある人（解約・請求の確認が要る）にだけ出す
export default async function PaymentSettingsLayout({ children }: { children: React.ReactNode }) {
  if (!PREMIUM_PLAN_ENABLED) {
    const session = await auth();
    const subscription = session?.user?.id
      ? await prisma.subscription.findUnique({ where: { userId: session.user.id }, select: { id: true } })
      : null;
    if (!subscription) notFound();
  }
  return children;
}
