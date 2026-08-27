import {
  CheckCircle2,
  AlertTriangle,
  Truck,
  Zap,
  Clock,
  UtensilsCrossed,
  Coins,
} from "lucide-react";
import type { ApplicationSnapshot } from "@/lib/eventApplicationSnapshot";
import { vehicleTypeLabel, fireTypeLabel, documentTypeLabel } from "@/lib/constants";
import { formatDays } from "@/lib/applicationFormat";
import { formatDateShort } from "@/lib/eventFormat";

/**
 * 応募者の条件。主催者は書類を見ないまま話を始めるかを決めるので、
 * ここで判断できることがこの機能の使い勝手を決める。
 */
export function FitBadges({ fit }: { fit: { label: string; ok: boolean; detail: string }[] }) {
  if (fit.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {fit.map((f) => (
        <span
          key={f.label}
          title={f.detail}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            f.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {f.ok ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          {f.label}
        </span>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2">
      <dt className="w-24 shrink-0 text-xs text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-900 break-words">{value}</dd>
    </div>
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
    <div>
      <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <span className="text-orange-500">{icon}</span>
        {title}
      </h3>
      <dl className="divide-y divide-gray-100">{children}</dl>
    </div>
  );
}

export function ApplicantSpecList({
  snapshot,
  fit,
}: {
  snapshot: ApplicationSnapshot;
  fit: { label: string; ok: boolean; detail: string }[];
}) {
  const size =
    snapshot.vehicleLength || snapshot.vehicleWidth || snapshot.vehicleHeight
      ? `全長 ${snapshot.vehicleLength ?? "—"} × 全幅 ${snapshot.vehicleWidth ?? "—"} × 全高 ${snapshot.vehicleHeight ?? "—"} cm`
      : null;
  const days = formatDays(snapshot.availableDays);

  const adjusted = snapshot.adjustedFields ?? [];

  return (
    <div className="space-y-5">
      {adjusted.length > 0 && (
        <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-900">
          この募集に合わせて調整された項目: {adjusted.join(" / ")}
        </p>
      )}

      {fit.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-4 space-y-2">
          <p className="text-xs text-gray-500">この会場の条件との照合</p>
          <FitBadges fit={fit} />
          <ul className="space-y-0.5">
            {fit.map((f) => (
              <li key={f.label} className="text-xs text-gray-600">
                {f.label}: {f.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {snapshot.desiredFeeTier && (
        <Section icon={<Coins className="h-4 w-4" />} title="希望する区画">
          <Row
            label={snapshot.desiredFeeTier.label || "出展料"}
            value={
              snapshot.desiredFeeTier.fee === 0
                ? "無料"
                : `${snapshot.desiredFeeTier.fee.toLocaleString()}円`
            }
          />
        </Section>
      )}

      <Section icon={<Truck className="h-4 w-4" />} title="車両">
        {vehicleTypeLabel(snapshot.vehicleType) && (
          <Row label="車種" value={vehicleTypeLabel(snapshot.vehicleType)!} />
        )}
        {size && <Row label="サイズ" value={size} />}
        {snapshot.vehicleWeightKg && (
          <Row label="重量" value={`${snapshot.vehicleWeightKg.toLocaleString()} kg`} />
        )}
      </Section>

      <Section icon={<Zap className="h-4 w-4" />} title="設備">
        <Row
          label="必要電源"
          value={snapshot.powerWatt ? `${snapshot.powerWatt.toLocaleString()} W` : "不要 / 未登録"}
        />
        <Row
          label="発電機"
          value={
            snapshot.hasGenerator
              ? [snapshot.generatorModel, snapshot.generatorNoiseDb ? `${snapshot.generatorNoiseDb}dB` : null]
                  .filter(Boolean)
                  .join(" / ") || "あり"
              : "なし"
          }
        />
        <Row
          label="火気使用"
          value={
            snapshot.usesFire
              ? `あり（${[
                  fireTypeLabel(snapshot.fireType) ?? "種類未登録",
                  snapshot.fireApplianceCount ? `${snapshot.fireApplianceCount}台` : "台数未記入",
                ].join(" / ")}）`
              : "なし"
          }
        />
        {snapshot.waterTankLiter && (
          <Row label="給排水" value={`${snapshot.waterTankLiter} L`} />
        )}
        {(snapshot.minSpaceWidthM || snapshot.minSpaceDepthM) && (
          <Row
            label="必要スペース"
            value={`間口 ${snapshot.minSpaceWidthM ?? "—"}m × 奥行 ${snapshot.minSpaceDepthM ?? "—"}m`}
          />
        )}
      </Section>

      <Section icon={<Clock className="h-4 w-4" />} title="営業条件">
        {snapshot.maxServingsPerHour && (
          <Row
            label="提供食数"
            value={`${snapshot.maxServingsPerHour.toLocaleString()} 食/時間`}
          />
        )}
        {snapshot.secondsPerServing && (
          <Row label="提供時間" value={`約 ${snapshot.secondsPerServing} 秒/食`} />
        )}
        {days && <Row label="出店可能曜日" value={days} />}
        {snapshot.hasPrepKitchen && (
          <Row
            label="仕込み場所"
            value={snapshot.prepKitchenNote ? `あり（${snapshot.prepKitchenNote}）` : "あり"}
          />
        )}
      </Section>

      {snapshot.menuItems.length > 0 && (
        <Section icon={<UtensilsCrossed className="h-4 w-4" />} title="メニュー">
          {snapshot.menuItems.map((m, i) => (
            <Row
              key={i}
              label={m.price !== null ? `${m.price.toLocaleString()}円` : "—"}
              value={m.description ? `${m.name}（${m.description}）` : m.name}
            />
          ))}
        </Section>
      )}

      {snapshot.documentSummary.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-bold text-gray-900 mb-2">提出できる書類</p>
          <ul className="space-y-1">
            {snapshot.documentSummary.map((d, i) => (
              <li key={i} className="text-xs text-gray-600">
                {documentTypeLabel(d.type)}
                {d.expiresOn && ` ・ 有効期限 ${formatDateShort(d.expiresOn)}`}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            書類そのものは、出店者が開示を選ぶまで表示されません。
          </p>
        </div>
      )}

      {snapshot.appeal && (
        <div>
          <h3 className="mb-1 text-sm font-bold text-gray-900">自己PR</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {snapshot.appeal}
          </p>
        </div>
      )}
    </div>
  );
}
