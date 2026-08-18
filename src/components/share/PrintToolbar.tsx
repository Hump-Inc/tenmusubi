"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";

/** 印刷時には消える操作バー */
export function PrintToolbar({ token }: { token: string }) {
  return (
    <div className="no-print sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[210mm] items-center justify-between gap-4 px-4 py-3">
        <Link
          href={`/s/${token}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Printer className="h-4 w-4" />
          印刷 / PDFで保存
        </button>
      </div>
      <p className="mx-auto max-w-[210mm] px-4 pb-3 text-xs text-gray-500">
        印刷ダイアログで「送信先」を「PDFに保存」にすると、そのままPDFになります。
      </p>
    </div>
  );
}
