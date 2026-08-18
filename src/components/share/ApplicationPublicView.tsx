import Image from "next/image";
import Link from "next/link";
import {
  Truck,
  Zap,
  UtensilsCrossed,
  FileCheck2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Twitter,
  Printer,
  CalendarClock,
  Clock,
  Store as StoreIcon,
  AlertTriangle,
  ShieldCheck,
  FileText,
} from "lucide-react";
import type { ApplicationView } from "@/lib/applicationView";
import { documentTypeLabel } from "@/lib/constants";
import {
  buildSpecRows,
  buildVehicleRows,
  formatDateJa,
  formatDays,
  formatMonthJa,
  isExpired,
} from "@/lib/applicationFormat";
import { SpaceLeadCta } from "./SpaceLeadCta";

function SpecList({ rows }: { rows: { label: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="divide-y divide-gray-100">
      {rows.map((row) => (
        <div key={row.label} className="flex gap-4 py-3">
          <dt className="w-28 shrink-0 text-sm text-gray-500">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-sm font-medium text-gray-900 break-words">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
        <span className="text-orange-500">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ApplicationPublicView({
  view,
  token,
}: {
  view: ApplicationView;
  token: string;
}) {
  const { store, profile, documents, menuItems } = view;
  const vehicleRows = buildVehicleRows(store, profile);
  const specRows = profile ? buildSpecRows(profile) : [];
  const days = profile ? formatDays(profile.availableDays) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* 見出し */}
        <header className="mb-6">
          <p className="mb-2 text-xs font-medium tracking-wide text-orange-600">出店申込情報</p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{store.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
            {store.category && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon className="h-4 w-4" />
                {store.category}
              </span>
            )}
            {store.area && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {store.area}
              </span>
            )}
            {profile?.openedOn && (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-4 w-4" />
                {formatMonthJa(profile.openedOn)}開業
              </span>
            )}
          </div>
          {store.motto && (
            <p className="mt-4 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-900">
              {store.motto}
            </p>
          )}
        </header>

        {/* 写真 */}
        {store.images.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {store.images.slice(0, 6).map((img, index) => (
              <div
                key={img.id}
                className={`relative overflow-hidden rounded-xl bg-gray-100 ${
                  index === 0 ? "col-span-2 aspect-[16/10] sm:col-span-2" : "aspect-square"
                }`}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {/* 自己PR */}
          {(profile?.appeal || store.description) && (
            <Section icon={<StoreIcon className="h-5 w-5" />} title="出店者について">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                {profile?.appeal || store.description}
              </p>
              {store.ownerIntro && (
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                  {store.ownerIntro}
                </p>
              )}
            </Section>
          )}

          {/* 車両 */}
          {vehicleRows.length > 0 && (
            <Section icon={<Truck className="h-5 w-5" />} title="車両">
              <SpecList rows={vehicleRows} />
            </Section>
          )}

          {/* 設備・インフラ */}
          {specRows.length > 0 && (
            <Section icon={<Zap className="h-5 w-5" />} title="設備・インフラ要件">
              <SpecList rows={specRows} />
            </Section>
          )}

          {/* 営業条件 */}
          {profile && (
            <Section icon={<Clock className="h-5 w-5" />} title="営業条件">
              <SpecList
                rows={[
                  ...(profile.maxServingsPerHour
                    ? [
                        {
                          label: "提供可能食数",
                          value: `${profile.maxServingsPerHour.toLocaleString()} 食/時間`,
                        },
                      ]
                    : []),
                  ...(profile.secondsPerServing
                    ? [{ label: "提供時間", value: `約 ${profile.secondsPerServing} 秒/食` }]
                    : []),
                  ...(days ? [{ label: "出店可能曜日", value: days }] : []),
                  ...(store.availableAreas.length > 0
                    ? [{ label: "出店可能エリア", value: store.availableAreas.join("・") }]
                    : []),
                  ...(profile.hasPrepKitchen
                    ? [
                        {
                          label: "仕込み場所",
                          value: profile.prepKitchenNote
                            ? `あり（${profile.prepKitchenNote}）`
                            : "あり",
                        },
                      ]
                    : []),
                ]}
              />
            </Section>
          )}

          {/* メニュー */}
          {menuItems.length > 0 && (
            <Section icon={<UtensilsCrossed className="h-5 w-5" />} title="メニュー">
              <ul className="divide-y divide-gray-100">
                {menuItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-3 py-3">
                    {item.imageUrl && (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.price !== null && (
                          <p className="shrink-0 text-sm font-medium text-gray-700">
                            {item.price.toLocaleString()}円
                          </p>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* 書類 */}
          {documents.length > 0 && (
            <Section icon={<FileCheck2 className="h-5 w-5" />} title="提出可能な書類">
              <ul className="space-y-2">
                {documents.map((doc) => {
                  const expired = isExpired(doc.expiresOn);
                  return (
                    <li
                      key={doc.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-gray-100 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {doc.label || documentTypeLabel(doc.type)}
                        </p>
                        {doc.expiresOn && (
                          <p
                            className={`mt-0.5 text-xs ${
                              expired ? "text-red-600" : "text-gray-500"
                            }`}
                          >
                            {expired && (
                              <AlertTriangle className="mr-1 inline h-3 w-3 align-[-2px]" />
                            )}
                            有効期限 {formatDateJa(doc.expiresOn)}
                          </p>
                        )}
                      </div>

                      {doc.fileUrl ? (
                        <Link
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-gray-300"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {doc.isImage ? "画像を見る" : "PDFを開く"}
                        </Link>
                      ) : (
                        // meta_only。ここにはファイルへの経路が存在しない。
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          提出可能
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {/* 連絡先 */}
          <Section icon={<Phone className="h-5 w-5" />} title="連絡先">
            <SpecList
              rows={[
                ...(store.ownerName ? [{ label: "代表者", value: store.ownerName }] : []),
                ...(profile?.phone ? [{ label: "電話番号", value: profile.phone }] : []),
                ...(profile?.contactEmail
                  ? [{ label: "メール", value: profile.contactEmail }]
                  : []),
              ]}
            />
            {(store.website || store.instagram || store.twitter) && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    ウェブサイト
                  </a>
                )}
                {store.instagram && (
                  <a
                    href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    Instagram
                  </a>
                )}
                {store.twitter && (
                  <a
                    href={`https://x.com/${store.twitter.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-gray-300"
                  >
                    <Twitter className="h-3.5 w-3.5" />X
                  </a>
                )}
              </div>
            )}
            {store.messageToOwners && (
              <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                {store.messageToOwners}
              </p>
            )}
          </Section>
        </div>

        {/* 印刷用（申込書） */}
        <div className="mt-6 flex justify-center">
          <Link
            href={`/s/${token}/print`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300"
          >
            <Printer className="h-4 w-4" />
            出店申込書として印刷・PDF保存
          </Link>
        </div>

        {/* オーナー導線。ページ最下部に置き、バナーやモーダルにはしない。 */}
        <SpaceLeadCta token={token} storeName={store.name} />

        <footer className="mt-10 border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-500">
            このページは{" "}
            <Link href="/" className="text-orange-600 hover:underline">
              てんむすび
            </Link>{" "}
            が提供しています
          </p>
        </footer>
      </main>
    </div>
  );
}
