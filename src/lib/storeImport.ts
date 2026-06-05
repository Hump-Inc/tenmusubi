// CSV一括登録用の共通ロジック（クライアントのプレビューとサーバーの検証で共有）

export interface StoreImportInput {
  name: string;
  description?: string;
  category?: string;
  area?: string;
  tags?: string[];
  website?: string;
  instagram?: string;
  twitter?: string;
  ownerIntro?: string;
  recommendedItems?: string;
  commitment?: string;
  motto?: string;
  messageToOwners?: string;
  availableAreas?: string[];
  vehicleLength?: number | null;
  vehicleWidth?: number | null;
  vehicleHeight?: number | null;
}

type FieldKey = keyof StoreImportInput;

// 複数値（区切り文字で配列化）するフィールド
const MULTI_FIELDS = new Set<FieldKey>(["tags", "availableAreas"]);
// 数値フィールド
const INT_FIELDS = new Set<FieldKey>(["vehicleLength", "vehicleWidth", "vehicleHeight"]);

// ヘッダー名（正規化済み）→ フィールドのマッピング
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  name: ["店舗名", "店名", "name"],
  category: ["カテゴリ", "カテゴリー", "業種", "category"],
  area: ["エリア", "主な出店エリア", "出店エリア", "area"],
  description: ["紹介文", "説明", "概要", "紹介", "description"],
  instagram: ["instagram", "インスタ", "インスタグラム", "ig"],
  twitter: ["twitter", "x", "xtwitter", "x旧twitter", "ツイッター"],
  website: ["website", "ウェブサイト", "ホームページ", "hp", "サイト", "url"],
  tags: ["タグ", "tags"],
  availableAreas: ["出店可能エリア", "出店可能な県", "対応エリア", "availableareas"],
  ownerIntro: ["オーナー紹介", "スタッフ紹介", "オーナー・スタッフ紹介", "ownerintro"],
  recommendedItems: ["おすすめ商品", "おすすめ", "おすすめメニュー", "recommendeditems"],
  commitment: ["こだわり", "こだわりポイント", "commitment"],
  motto: ["モットー", "大切にしていること", "motto"],
  messageToOwners: ["オーナーへ一言", "スペースオーナーへ一言", "messagetoowners"],
  vehicleLength: ["全長", "車両全長", "長さ", "vehiclelength"],
  vehicleWidth: ["全幅", "車両全幅", "幅", "vehiclewidth"],
  vehicleHeight: ["全高", "車両全高", "高さ", "vehicleheight"],
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[（）()【】\[\]]/g, "");
}

const HEADER_TO_FIELD: Record<string, FieldKey> = (() => {
  const map: Record<string, FieldKey> = {};
  (Object.keys(HEADER_ALIASES) as FieldKey[]).forEach((field) => {
    HEADER_ALIASES[field].forEach((alias) => {
      map[normalizeHeader(alias)] = field;
    });
  });
  return map;
})();

/**
 * RFC4180準拠の簡易CSVパーサ。
 * - 先頭BOM除去 / ダブルクォート内のカンマ・改行・"" エスケープに対応
 * - CRLF / LF 両対応 / 全て空のセルだけの行は除外
 */
export function parseCsv(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function splitMulti(value: string): string[] {
  return value
    .split(/[、;；／/|]+/)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

function toInt(value: string): number | null {
  if (value === "") return null;
  const n = parseInt(value.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export interface ParsedRecord {
  rowNum: number; // データ行番号（ヘッダーを除く1始まり）
  input: StoreImportInput;
  errors: string[];
}

export interface MapResult {
  headers: string[];
  unknownHeaders: string[];
  records: ParsedRecord[];
}

/** パース済みCSV（2次元配列）を店舗インプットへマッピング＆検証 */
export function mapCsvToRecords(rows: string[][]): MapResult {
  if (rows.length === 0) {
    return { headers: [], unknownHeaders: [], records: [] };
  }

  const headers = rows[0];
  const fieldByCol = headers.map((h) => HEADER_TO_FIELD[normalizeHeader(h)] ?? null);
  const unknownHeaders = headers.filter(
    (h, ci) => fieldByCol[ci] === null && h.trim() !== ""
  );

  const records: ParsedRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const input: StoreImportInput = { name: "" };

    fieldByCol.forEach((field, ci) => {
      if (!field) return;
      const val = (cols[ci] ?? "").trim();
      if (val === "") return;
      if (MULTI_FIELDS.has(field)) {
        (input[field] as string[]) = splitMulti(val);
      } else if (INT_FIELDS.has(field)) {
        (input[field] as number | null) = toInt(val);
      } else {
        (input[field] as string) = val;
      }
    });

    const errors: string[] = [];
    if (!input.name || !input.name.trim()) {
      errors.push("店舗名が空です");
    }

    records.push({ rowNum: r, input, errors });
  }

  return { headers, unknownHeaders, records };
}

// テンプレートCSVのヘッダー（ダウンロード用）
export const TEMPLATE_HEADERS = [
  "店舗名",
  "カテゴリ",
  "エリア",
  "紹介文",
  "Instagram",
  "X(Twitter)",
  "ウェブサイト",
  "タグ",
  "出店可能エリア",
  "おすすめ商品",
  "こだわり",
  "モットー",
  "オーナー紹介",
  "オーナーへ一言",
  "全長",
  "全幅",
  "全高",
];

export const TEMPLATE_EXAMPLE_ROW = [
  "わくわくキッチンカー",
  "キッチンカー",
  "東京都",
  "ふわふわのクレープが自慢のキッチンカーです",
  "https://instagram.com/example",
  "",
  "",
  "週末出店可;イベント出店可",
  "東京都;神奈川県",
  "いちごクレープ",
  "国産小麦を使用しています",
  "笑顔を絶やしません",
  "店主の山田です",
  "出店させていただきありがとうございます",
  "500",
  "200",
  "250",
];

/** 配列をCSVの1行へ（必要に応じてクォート） */
export function toCsvRow(cells: string[]): string {
  return cells
    .map((cell) => {
      if (/[",\r\n]/.test(cell)) {
        return '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    })
    .join(",");
}

export function buildTemplateCsv(): string {
  // ExcelがUTF-8と認識できるようBOM付き
  return (
    "﻿" +
    toCsvRow(TEMPLATE_HEADERS) +
    "\r\n" +
    toCsvRow(TEMPLATE_EXAMPLE_ROW) +
    "\r\n"
  );
}
