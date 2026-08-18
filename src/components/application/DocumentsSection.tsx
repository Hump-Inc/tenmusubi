"use client";

import { useState, useRef } from "react";
import {
  FileText,
  Loader2,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DOCUMENT_TYPES, DOCUMENT_VISIBILITIES, documentTypeLabel } from "@/lib/constants";

export interface ApplicationDocumentDto {
  id: string;
  type: string;
  label: string | null;
  mimeType: string;
  fileSize: number;
  expiresOn: string | null;
  visibility: string;
  order: number;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function isExpired(value: string | null): boolean {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

const visibilityIcon = (visibility: string) => {
  if (visibility === "public") return <Eye className="h-3.5 w-3.5" />;
  if (visibility === "meta_only") return <ShieldCheck className="h-3.5 w-3.5" />;
  return <EyeOff className="h-3.5 w-3.5" />;
};

export function DocumentsSection({
  storeId,
  documents,
  onChange,
}: {
  storeId: string;
  documents: ApplicationDocumentDto[];
  onChange: (documents: ApplicationDocumentDto[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<string>("business_license");
  const [visibility, setVisibility] = useState<string>("meta_only");
  const [expiresOn, setExpiresOn] = useState("");
  const [label, setLabel] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ApplicationDocumentDto | null>(null);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", type);
      body.append("visibility", visibility);
      if (expiresOn) body.append("expiresOn", expiresOn);
      if (label) body.append("label", label);

      const res = await fetch(`/api/stores/${storeId}/application/documents`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        return;
      }
      onChange([...documents, data.document]);
      if (fileRef.current) fileRef.current.value = "";
      setExpiresOn("");
      setLabel("");
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setIsUploading(false);
    }
  };

  const updateVisibility = async (doc: ApplicationDocumentDto, next: string) => {
    const res = await fetch(`/api/stores/${storeId}/application/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    if (!res.ok) return;
    const data = await res.json();
    onChange(documents.map((d) => (d.id === doc.id ? data.document : d)));
  };

  const remove = async (doc: ApplicationDocumentDto) => {
    const res = await fetch(`/api/stores/${storeId}/application/documents/${doc.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    onChange(documents.filter((d) => d.id !== doc.id));
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-500" />
          書類
        </CardTitle>
        <CardDescription>
          営業許可証・食品衛生責任者証・PL保険証券・車検証など。
          公開範囲は書類ごとに選べます。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {documents.length > 0 && (
          <ul className="space-y-3">
            {documents.map((doc) => {
              const expired = isExpired(doc.expiresOn);
              return (
                <li
                  key={doc.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {doc.label || documentTypeLabel(doc.type)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {documentTypeLabel(doc.type)} ・ {formatSize(doc.fileSize)}
                        {doc.expiresOn && ` ・ 有効期限 ${formatDate(doc.expiresOn)}`}
                      </p>
                      {expired && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          有効期限が切れています
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" className="rounded-full" asChild>
                        <a
                          href={`/api/stores/${storeId}/application/documents/${doc.id}/file`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-red-600 hover:text-red-700"
                        onClick={() => setDeleteTarget(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {DOCUMENT_VISIBILITIES.map((v) => (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => updateVisibility(doc, v.value)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                          doc.visibility === v.value
                            ? "border-orange-500 bg-orange-50 text-orange-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {visibilityIcon(v.value)}
                        {v.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {
                      DOCUMENT_VISIBILITIES.find((v) => v.value === doc.visibility)
                        ?.description
                    }
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rounded-xl bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-900">書類を追加</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>種類</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-expires">有効期限</Label>
              <Input
                id="doc-expires"
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-label">表示名（任意）</Label>
            <Input
              id="doc-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例: 東京都 食品営業許可"
            />
          </div>

          <div className="space-y-2">
            <Label>公開範囲</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_VISIBILITIES.map((v) => (
                  <SelectItem key={v.value} value={v.value}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {DOCUMENT_VISIBILITIES.find((v) => v.value === visibility)?.description}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-file">ファイル</Label>
            <Input
              id="doc-file"
              type="file"
              ref={fileRef}
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />
            <p className="text-xs text-gray-500">JPG / PNG / WebP / PDF、10MBまで</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={upload}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                アップロード
              </>
            )}
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この書類を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.label || documentTypeLabel(deleteTarget?.type)}
              を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) remove(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
