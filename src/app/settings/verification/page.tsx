"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Upload,
  Loader2,
  FileText,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface VerificationData {
  isVerified: boolean;
  request: {
    id: string;
    documentType: string;
    hasDocument: boolean;
    status: string;
    note: string | null;
    submittedAt: string;
    reviewedAt: string | null;
  } | null;
}

const documentTypes = [
  { value: "business_license", label: "営業許可証" },
  { value: "food_license", label: "食品衛生責任者証" },
  { value: "id_card", label: "身分証明書（運転免許証等）" },
  { value: "registration_cert", label: "登記簿謄本" },
  { value: "other", label: "その他の証明書類" },
];

export default function VerificationSettingsPage() {
  const [data, setData] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/verification");
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch verification status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setMessage({ type: "error", text: "ファイルサイズは10MB以下にしてください" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      setMessage({ type: "error", text: "書類の種類を選択してください" });
      return;
    }
    if (!selectedFile) {
      setMessage({ type: "error", text: "書類のファイルを選択してください" });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // 書類は非公開の保存先に置かれ、運営だけが確認する
      const formData = new FormData();
      formData.append("documentType", selectedType);
      formData.append("file", selectedFile);
      const res = await fetch("/api/verification", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) => prev ? { ...prev, request: result } : null);
        setShowForm(false);
        setMessage({ type: "success", text: "本人確認申請を提出しました" });
        setSelectedType("");
        setSelectedFile(null);
      } else {
        const errorData = await res.json();
        setMessage({ type: "error", text: errorData.error || "申請の提出に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "申請の提出中にエラーが発生しました" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocumentTypeLabel = (value: string) => {
    return documentTypes.find((d) => d.value === value)?.label || value;
  };

  const renderStatus = () => {
    if (!data) return null;

    if (data.isVerified) {
      return (
        <div className="flex items-center gap-4 p-6 rounded-xl bg-green-50 border border-green-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">本人確認済み</h3>
            <p className="text-sm text-green-700 mt-1">
              本人確認が完了しています。認証バッジがプロフィールに表示されます。
            </p>
          </div>
        </div>
      );
    }

    if (data.request) {
      switch (data.request.status) {
        case "pending":
          return (
            <div className="flex items-center gap-4 p-6 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-amber-800">審査中</h3>
                  <Badge variant="secondary" className="text-xs">
                    {getDocumentTypeLabel(data.request.documentType)}
                  </Badge>
                </div>
                <p className="text-sm text-amber-700 mt-1">
                  提出いただいた書類を確認中です。審査には数日かかる場合があります。
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  提出日: {new Date(data.request.submittedAt).toLocaleDateString("ja-JP")}
                </p>
              </div>
            </div>
          );
        case "rejected":
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-6 rounded-xl bg-red-50 border border-red-200">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">審査が却下されました</h3>
                  {data.request.note && (
                    <p className="text-sm text-red-700 mt-1">
                      理由: {data.request.note}
                    </p>
                  )}
                  <p className="text-xs text-red-600 mt-2">
                    書類を確認の上、再度申請してください。
                  </p>
                </div>
              </div>
              {!showForm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="rounded-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  再申請する
                </Button>
              )}
            </div>
          );
      }
    }

    // 未申請
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-6 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <Shield className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">未確認</h3>
            <p className="text-sm text-gray-600 mt-1">
              本人確認を行うと、認証バッジが表示され信頼性が向上します。
            </p>
          </div>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="rounded-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            本人確認を申請する
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            href="/mypage"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            マイページに戻る
          </Link>

          <div className="mb-8">
            <h1 className="text-2xl font-bold">本人確認</h1>
            <p className="mt-2 text-muted-foreground">
              本人確認書類を提出して、アカウントの信頼性を高めましょう
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="ml-auto text-current hover:opacity-70"
              >
                ×
              </button>
            </div>
          )}

          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                本人確認ステータス
              </CardTitle>
              <CardDescription>
                本人確認の状況を確認できます
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                renderStatus()
              )}
            </CardContent>
          </Card>

          {/* 申請フォーム */}
          {showForm && (
            <Card className="rounded-2xl border-0 shadow-sm mt-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  書類を提出する
                </CardTitle>
                <CardDescription>
                  以下のいずれかの書類を提出してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">書類の種類</Label>
                    <div className="space-y-2">
                      {documentTypes.map((type) => (
                        <label
                          key={type.value}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            selectedType === type.value
                              ? "border-primary bg-primary/5"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="documentType"
                            value={type.value}
                            checked={selectedType === type.value}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="text-sm">{type.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">書類の画像・PDF</Label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="document-file"
                      />
                      <label
                        htmlFor="document-file"
                        className="cursor-pointer space-y-2"
                      >
                        <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                        {selectedFile ? (
                          <p className="text-sm text-primary font-medium">{selectedFile.name}</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-600">
                              クリックしてファイルを選択
                            </p>
                            <p className="text-xs text-gray-400">
                              JPG, PNG, WebP, PDF（10MB以下）。運営だけが確認し、公開されません
                            </p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setShowForm(false);
                        setSelectedType("");
                        setSelectedFile(null);
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      type="submit"
                      className="rounded-full"
                      disabled={isSubmitting || !selectedType}
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      申請する
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 p-4 rounded-xl bg-muted/50">
            <h3 className="font-medium text-sm">本人確認について</h3>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              <li>・審査には数日かかる場合があります</li>
              <li>・提出された書類は本人確認の目的のみに使用されます</li>
              <li>・本人確認が完了すると、プロフィールに認証バッジが表示されます</li>
              <li>・却下された場合は、理由を確認の上再申請が可能です</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
