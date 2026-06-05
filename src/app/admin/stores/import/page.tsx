"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseCsv,
  mapCsvToRecords,
  buildTemplateCsv,
  type ParsedRecord,
} from "@/lib/storeImport";

interface ImportResultRow {
  ok: boolean;
  name: string;
  id?: string;
  error?: string;
}

export default function AdminStoreImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    failed: number;
    total: number;
    results: ImportResultRow[];
  } | null>(null);

  const validRecords = records.filter((r) => r.errors.length === 0);
  const invalidCount = records.length - validRecords.length;

  const handleFile = async (file: File) => {
    setParseError("");
    setResult(null);
    setRecords([]);
    setUnknownHeaders([]);
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setParseError("ヘッダー行とデータ行が必要です。CSVの内容をご確認ください。");
        return;
      }
      const { unknownHeaders, records } = mapCsvToRecords(rows);
      setUnknownHeaders(unknownHeaders);
      setRecords(records);
    } catch {
      setParseError("CSVの読み込みに失敗しました。ファイル形式をご確認ください。");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tenmusubi_stores_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (validRecords.length === 0) return;
    setImporting(true);
    setParseError("");
    try {
      const res = await fetch("/api/admin/stores/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: validRecords.map((r) => r.input) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || "一括登録に失敗しました");
        return;
      }
      setResult(data);
      setRecords([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setParseError("一括登録に失敗しました");
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setRecords([]);
    setUnknownHeaders([]);
    setFileName("");
    setParseError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/stores">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">店舗CSV一括登録</h1>
                <p className="text-sm text-gray-600">スプレッドシートのデータをまとめて登録</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
        {parseError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* 完了サマリ */}
        {result && (
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-bold text-gray-900">
                    {result.created}件を登録しました
                  </p>
                  {result.failed > 0 && (
                    <p className="text-sm text-red-600">{result.failed}件は失敗しました</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                登録した店舗は「未割当・非公開」状態です。店舗一覧から招待リンクを発行して営業者へお渡しください。
              </p>
              {result.results.some((r) => !r.ok) && (
                <div className="border rounded-lg divide-y text-sm">
                  {result.results
                    .filter((r) => !r.ok)
                    .map((r, i) => (
                      <div key={i} className="px-4 py-2 flex justify-between">
                        <span>{r.name || "(店舗名なし)"}</span>
                        <span className="text-red-600">{r.error}</span>
                      </div>
                    ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button asChild className="rounded-full">
                  <Link href="/admin/stores">店舗一覧へ</Link>
                </Button>
                <Button variant="outline" onClick={reset} className="rounded-full">
                  続けて登録
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!result && (
          <>
            {/* 手順 / テンプレート */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium text-gray-900">使い方</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-gray-600">
                      <li>テンプレートCSVをダウンロードして店舗情報を入力</li>
                      <li>スプレッドシートから「CSV形式」で書き出し</li>
                      <li>下のボタンからCSVを選択 → 内容を確認して登録</li>
                    </ol>
                    <p className="text-gray-500 pt-1">
                      「店舗名」が必須です。タグ・出店可能エリアは <code>;</code> 区切りで複数指定できます。
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={downloadTemplate} className="rounded-full">
                  <Download className="h-4 w-4 mr-2" />
                  テンプレートCSVをダウンロード
                </Button>
              </CardContent>
            </Card>

            {/* ファイル選択 */}
            <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={onFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {fileName || "CSVファイルを選択"}
                  </span>
                  <span className="text-xs text-gray-500">クリックしてファイルを選択</span>
                </button>
              </CardContent>
            </Card>

            {/* プレビュー */}
            {records.length > 0 && (
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      登録可能 {validRecords.length}件
                    </Badge>
                    {invalidCount > 0 && (
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                        エラー {invalidCount}件
                      </Badge>
                    )}
                  </div>

                  {unknownHeaders.length > 0 && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      認識できない列があります（無視されます）: {unknownHeaders.join("、")}
                    </div>
                  )}

                  <div className="border rounded-xl overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">行</TableHead>
                          <TableHead>店舗名</TableHead>
                          <TableHead className="hidden md:table-cell">カテゴリ</TableHead>
                          <TableHead className="hidden md:table-cell">エリア</TableHead>
                          <TableHead className="hidden md:table-cell">Instagram</TableHead>
                          <TableHead>状態</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((r) => (
                          <TableRow key={r.rowNum} className={r.errors.length > 0 ? "bg-red-50/50" : ""}>
                            <TableCell className="text-gray-400 text-xs">{r.rowNum}</TableCell>
                            <TableCell className="font-medium">
                              {r.input.name || <span className="text-gray-400">(空)</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {r.input.category || <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {r.input.area || <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm max-w-[200px] truncate">
                              {r.input.instagram || <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {r.errors.length > 0 ? (
                                <span className="text-xs text-red-600">{r.errors.join(", ")}</span>
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={importing || validRecords.length === 0}
                      className="rounded-full"
                    >
                      {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {validRecords.length}件を登録する
                    </Button>
                    <Button variant="outline" onClick={reset} className="rounded-full">
                      クリア
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
