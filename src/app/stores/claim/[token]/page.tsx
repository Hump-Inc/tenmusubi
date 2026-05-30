"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { signIn } from "next-auth/react";
import {
  Loader2,
  CheckCircle2,
  Store as StoreIcon,
  MapPin,
  Tag,
  PartyPopper,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface StorePreview {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  area: string | null;
  website: string | null;
  instagram: string | null;
  twitter: string | null;
  claimEmail: string | null;
  images: { id: string; url: string }[];
}

export default function StoreClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StorePreview | null>(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);

  const fetchPreview = useCallback(async () => {
    try {
      const res = await fetch(`/api/stores/claim/${token}`);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || "リンクを開けませんでした");
        return;
      }
      setStore(data.store);
      if (data.store.claimEmail) setEmail(data.store.claimEmail);
    } catch {
      setLoadError("リンクを開けませんでした");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!agree) {
      setSubmitError("利用規約への同意が必要です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/stores/claim/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "承認に失敗しました");
        setSubmitting(false);
        return;
      }

      setDone(true);

      // 作成したアカウントでそのままログイン
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        // ログインに失敗してもアカウント作成は成功しているのでログインへ
        window.location.href = "/login";
        return;
      }
      window.location.href = "/stores/my";
    } catch {
      setSubmitError("承認に失敗しました");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <StoreIcon className="h-12 w-12 text-gray-300 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">リンクを開けませんでした</h1>
        <p className="text-gray-600 mb-6">{loadError || "店舗が見つかりません"}</p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">トップへ戻る</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="py-5 px-4 bg-white border-b border-gray-100">
        <div className="container mx-auto">
          <Link href="/" className="flex items-center gap-3 w-fit">
            <Logo size={48} />
            <span className="text-2xl font-bold tracking-wide text-[#d35f2d]">てんむすび</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        {/* Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#fdeee6] mb-4">
            <PartyPopper className="h-7 w-7 text-[#d35f2d]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            あなたのお店のページを作成しました
          </h1>
          <p className="text-gray-600 mt-2">
            内容をご確認のうえ、ページを承認してご利用ください。<br />
            承認すると、あなたのアカウントで編集・公開できるようになります。
          </p>
        </div>

        {/* Store preview */}
        <Card className="rounded-2xl border-0 shadow-sm overflow-hidden mb-6">
          {store.images.length > 0 && (
            <div className="relative w-full aspect-[16/9] bg-gray-100">
              <Image
                src={store.images[0].url}
                alt={store.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
              {store.category && (
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {store.category}
                </span>
              )}
              {store.area && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {store.area}
                </span>
              )}
            </div>
            {store.description && (
              <p className="text-gray-700 mt-4 whitespace-pre-wrap">{store.description}</p>
            )}
          </CardContent>
        </Card>

        {/* Approval form */}
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-[#d35f2d]" />
              <h3 className="text-lg font-bold text-gray-900">承認してアカウントを作成</h3>
            </div>

            {submitError && (
              <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 rounded-xl">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">お名前 / 担当者名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード（8文字以上）</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを設定"
                    className="rounded-xl pr-10"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <span>
                  <Link href="/terms" target="_blank" className="text-primary hover:underline">利用規約</Link>
                  および
                  <Link href="/privacy" target="_blank" className="text-primary hover:underline">プライバシーポリシー</Link>
                  に同意します
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full"
                disabled={submitting || done}
              >
                {(submitting || done) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                承認してページを公開する
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
