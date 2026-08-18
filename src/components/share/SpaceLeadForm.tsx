"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SpaceLeadForm({ token, storeName }: { token: string; storeName: string }) {
  const [spaceName, setSpaceName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      // 1つの入力欄でメールと電話のどちらでも受ける
      const isEmail = contact.includes("@");
      const res = await fetch("/api/space-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          spaceName,
          contactName,
          contactEmail: isEmail ? contact : "",
          contactPhone: isEmail ? "" : contact,
          note,
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "送信に失敗しました");
        return;
      }
      setIsDone(true);
    } catch {
      setError("送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDone) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h1 className="mb-3 text-lg font-bold text-gray-900">送信しました</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          担当者よりご連絡します。
          <br />
          いただいた内容をもとに、出店できるかどうかをお調べします。
        </p>
        <Link
          href={`/s/${token}`}
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {storeName}のページに戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <h1 className="mb-2 text-xl font-bold text-gray-900">スペースを登録する</h1>
      <p className="mb-6 text-sm leading-relaxed text-gray-600">
        駐車場や空きスペースにキッチンカーを呼びたい方向けのご相談窓口です。
        3項目だけご記入ください。担当者よりご連絡します。
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="spaceName">
            スペース名または所在地 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="spaceName"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="例: 〇〇ビル駐車場 / 東京都世田谷区"
            required
          />
          <p className="text-xs text-gray-500">市区町村まででも構いません</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactName">
            ご担当者名 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contactName"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="例: 山田 太郎"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">
            連絡先 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="メールアドレスまたは電話番号"
            required
          />
          <p className="text-xs text-gray-500">どちらか一方で構いません</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">ご要望・備考（任意）</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
            rows={4}
            placeholder="例: 平日の昼だけ、10台分の駐車場の一角を使えます"
          />
        </div>

        {/* honeypot。人には見えない。 */}
        <div className="absolute left-[-9999px]" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              送信中...
            </>
          ) : (
            "送信する"
          )}
        </Button>
      </form>

      <Link
        href={`/s/${token}`}
        className="mt-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {storeName}のページに戻る
      </Link>
    </div>
  );
}
