import type { Metadata } from "next";
import { resolveShareLink } from "@/lib/shareLink";
import { ShareLinkNotice } from "@/components/share/ShareLinkNotice";
import { SpaceLeadForm } from "@/components/share/SpaceLeadForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function SpaceLeadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { status, link } = await resolveShareLink(token);

  if (status !== "ok" || !link) {
    return <ShareLinkNotice status={status as "expired" | "revoked" | "notfound"} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg px-4 py-10 sm:py-16">
        <SpaceLeadForm token={token} storeName={link.store.name} />
      </main>
    </div>
  );
}
