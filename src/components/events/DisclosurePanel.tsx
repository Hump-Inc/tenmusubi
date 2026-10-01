"use client";

import { useState } from "react";
import {
  FileCheck2,
  Loader2,
  ShieldCheck,
  Eye,
  X,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { documentTypeLabel } from "@/lib/constants";
import { formatDateShort, isExpiredDate } from "@/lib/eventFormat";

export interface DocumentSummary {
  id: string;
  type: string;
  label: string | null;
  expiresOn: string | null;
  mimeType: string;
}

export interface Disclosure {
  id: string;
  disclosedAt: string;
  document: DocumentSummary;
}

function docName(d: DocumentSummary) {
  return d.label || documentTypeLabel(d.type) || d.type;
}

/**
 * 書類の開示。出店者は相手ごと・書類ごとに開示を決められ、いつでも取り消せる。
 * 主催者には開示中のものだけが見える。
 */
export function DisclosurePanel({
  applicationId,
  role,
  status,
  disclosures,
  myDocuments,
  requestedAt,
  onChanged,
}: {
  applicationId: string;
  role: "vendor" | "organizer" | "admin";
  status: string;
  disclosures: Disclosure[];
  myDocuments: DocumentSummary[];
  requestedAt: string | null;
  onChanged: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const disclosedIds = new Set(disclosures.map((d) => d.document.id));
  const undisclosed = myDocuments.filter((d) => !disclosedIds.has(d.id));
  const isOpen = status === "open";

  const disclose = async () => {
    if (selected.length === 0) return;
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(`/api/applications/${applicationId}/disclosures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "開示に失敗しました");
        return;
      }
      setSelected([]);
      setShowPicker(false);
      onChanged();
    } finally {
      setIsWorking(false);
    }
  };

  const revoke = async (disclosureId: string) => {
    setIsWorking(true);
    setError("");
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/disclosures/${disclosureId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "取り消しに失敗しました");
        return;
      }
      onChanged();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <FileCheck2 className="h-4 w-4 text-orange-500" />
          書類
        </p>
        {disclosures.length > 0 && (
          <Badge variant="outline" className="text-xs font-normal">
            {disclosures.length}件を開示中
          </Badge>
        )}
      </div>

      {role === "vendor" && requestedAt && disclosures.length === 0 && isOpen && (
        <div className="rounded-xl bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              主催者から書類の開示を依頼されています
            </p>
            <p className="text-xs text-amber-800 mt-1">
              開示した書類は、この主催者だけが見られます。いつでも取り消せます。
            </p>
          </div>
        </div>
      )}

      {/* 開示中の一覧 */}
      {disclosures.length === 0 ? (
        <p className="text-sm text-gray-500">
          {role === "organizer"
            ? "まだ書類は開示されていません。"
            : "まだ書類を開示していません。"}
        </p>
      ) : (
        <ul className="space-y-2">
          {disclosures.map((d) => {
            const expired = isExpiredDate(d.document.expiresOn);
            return (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{docName(d.document)}</p>
                  {d.document.expiresOn && (
                    <p className={`text-xs mt-0.5 ${expired ? "text-red-600" : "text-gray-500"}`}>
                      {expired && <AlertTriangle className="mr-1 inline h-3 w-3 align-[-2px]" />}
                      有効期限 {formatDateShort(d.document.expiresOn)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" className="rounded-full text-xs" asChild>
                    <a
                      href={`/api/applications/${applicationId}/documents/${d.document.id}/file`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      開く
                    </a>
                  </Button>
                  {role === "vendor" && isOpen && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-xs text-gray-500 hover:text-red-600"
                      onClick={() => revoke(d.id)}
                      disabled={isWorking}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      取り消す
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 開示する（出店者のみ） */}
      {role === "vendor" && isOpen && undisclosed.length > 0 && (
        <div className="space-y-3">
          {showPicker ? (
            <div className="rounded-xl bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-medium text-gray-900">開示する書類を選ぶ</p>
              <ul className="space-y-2">
                {undisclosed.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) =>
                          prev.includes(d.id)
                            ? prev.filter((x) => x !== d.id)
                            : [...prev, d.id]
                        )
                      }
                      className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                        selected.includes(d.id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{docName(d)}</p>
                      {d.expiresOn && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          有効期限 {formatDateShort(d.expiresOn)}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={disclose}
                  disabled={isWorking || selected.length === 0}
                >
                  {isWorking ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  この主催者に開示する
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setShowPicker(false);
                    setSelected([]);
                  }}
                >
                  やめる
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setShowPicker(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              書類を開示する
            </Button>
          )}
        </div>
      )}

      {role === "vendor" && myDocuments.length === 0 && (
        <p className="text-xs text-gray-500">
          開示できる書類がありません。出店申込情報から登録してください。
        </p>
      )}
    </div>
  );
}
