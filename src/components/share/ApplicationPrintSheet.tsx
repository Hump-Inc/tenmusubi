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

function Rows({ rows }: { rows: { label: string; value: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full table-fixed border-collapse text-[10.5pt]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="align-top">
            <th className="w-[32%] border border-gray-300 bg-gray-50 px-2 py-1 text-left font-normal text-gray-600">
              {row.label}
            </th>
            <td className="border border-gray-300 px-2 py-1 text-gray-900">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="print-block mb-3">
      <h2 className="mb-1 border-l-[3px] border-gray-900 pl-2 text-[11pt] font-bold text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A4 1枚を基本とした出店申込書。
 * PDF生成にヘッドレスブラウザは使わず、ブラウザの印刷機能に任せている。
 */
export function ApplicationPrintSheet({
  view,
  printedOn,
}: {
  view: ApplicationView;
  printedOn: Date;
}) {
  const { store, profile, documents, menuItems } = view;
  const vehicleRows = buildVehicleRows(store, profile);
  const specRows = profile ? buildSpecRows(profile) : [];
  const days = profile ? formatDays(profile.availableDays) : null;

  const basicRows = [
    { label: "屋号", value: store.name },
    ...(store.ownerName ? [{ label: "代表者名", value: store.ownerName }] : []),
    ...(store.category ? [{ label: "業種", value: store.category }] : []),
    ...(profile?.openedOn
      ? [{ label: "開業年月", value: formatMonthJa(profile.openedOn) ?? profile.openedOn }]
      : []),
    ...(profile?.phone ? [{ label: "電話番号", value: profile.phone }] : []),
    ...(profile?.contactEmail ? [{ label: "メール", value: profile.contactEmail }] : []),
    ...(store.area ? [{ label: "主な出店エリア", value: store.area }] : []),
  ];

  const conditionRows = [
    ...(profile?.maxServingsPerHour
      ? [{ label: "提供可能食数", value: `${profile.maxServingsPerHour.toLocaleString()} 食/時間` }]
      : []),
    ...(profile?.secondsPerServing
      ? [{ label: "提供時間", value: `約 ${profile.secondsPerServing} 秒/食` }]
      : []),
    ...(days ? [{ label: "出店可能曜日", value: days }] : []),
    ...(store.availableAreas.length > 0
      ? [{ label: "出店可能エリア", value: store.availableAreas.join("・") }]
      : []),
    ...(profile?.hasPrepKitchen
      ? [
          {
            label: "仕込み場所",
            value: profile.prepKitchenNote ? `あり（${profile.prepKitchenNote}）` : "あり",
          },
        ]
      : []),
  ];

  return (
    <div className="print-sheet mx-auto max-w-[210mm] bg-white px-[12mm] py-[9mm] text-gray-900">
      <header className="mb-4 flex items-end justify-between border-b-2 border-gray-900 pb-1.5">
        <h1 className="text-[16pt] font-bold tracking-wide">出店申込書</h1>
        <p className="text-[9pt] text-gray-600">作成日 {formatDateJa(printedOn)}</p>
      </header>

      <Block title="事業者情報">
        <Rows rows={basicRows} />
      </Block>

      {vehicleRows.length > 0 && (
        <Block title="車両">
          <Rows rows={vehicleRows} />
        </Block>
      )}

      {specRows.length > 0 && (
        <Block title="設備・インフラ要件">
          <Rows rows={specRows} />
        </Block>
      )}

      {conditionRows.length > 0 && (
        <Block title="営業条件">
          <Rows rows={conditionRows} />
        </Block>
      )}

      {documents.length > 0 && (
        <Block title="提出可能な書類">
          <table className="w-full table-fixed border-collapse text-[10.5pt]">
            <thead>
              <tr>
                <th className="w-[55%] border border-gray-300 bg-gray-50 px-2 py-1 text-left font-normal text-gray-600">
                  書類
                </th>
                <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left font-normal text-gray-600">
                  有効期限
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="align-top">
                  <td className="border border-gray-300 px-2 py-1">
                    {doc.label || documentTypeLabel(doc.type)}
                  </td>
                  <td className="border border-gray-300 px-2 py-1">
                    {doc.expiresOn ? (
                      <>
                        {formatDateJa(doc.expiresOn)}
                        {isExpired(doc.expiresOn) && (
                          <span className="ml-1 font-bold">（期限切れ）</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}

      {menuItems.length > 0 && (
        <Block title="メニュー">
          <table className="w-full table-fixed border-collapse text-[10.5pt]">
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="w-[70%] border border-gray-300 px-2 py-1">
                    {item.name}
                    {item.description && (
                      <span className="ml-1 text-[9pt] text-gray-600">（{item.description}）</span>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right">
                    {item.price !== null ? `${item.price.toLocaleString()}円` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      )}

      {(profile?.appeal || store.description) && (
        <Block title="自己PR">
          <p className="whitespace-pre-wrap border border-gray-300 px-2 py-1 text-[10.5pt] leading-relaxed">
            {profile?.appeal || store.description}
          </p>
        </Block>
      )}

      <footer className="mt-4 border-t border-gray-300 pt-2 text-[8.5pt] text-gray-500">
        てんむすび（tenmusubi.net）で作成
      </footer>
    </div>
  );
}
