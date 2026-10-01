"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Star, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EventImageDto {
  id: string;
  url: string;
  order: number;
}

const MAX_IMAGES = 6;

export function EventImageSection({ eventId }: { eventId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<EventImageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/images`);
      const data = await res.json();
      if (res.ok) setImages(data.images);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file: File) => {
    setIsWorking(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/events/${eventId}/images`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "アップロードに失敗しました");
        return;
      }
      setImages((prev) => [...prev, data.image]);
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setIsWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const makeCover = async (imageId: string) => {
    setIsWorking(true);
    try {
      const res = await fetch(`/api/events/${eventId}/images/${imageId}`, { method: "PATCH" });
      if (!res.ok) return;
      const data = await res.json();
      setImages(data.images);
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (imageId: string) => {
    setIsWorking(true);
    try {
      const res = await fetch(`/api/events/${eventId}/images/${imageId}`, { method: "DELETE" });
      if (!res.ok) return;
      setImages((prev) => prev.filter((i) => i.id !== imageId));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-orange-500" />
          写真
        </CardTitle>
        <CardDescription>
          1枚目が募集ページの先頭と、SNSで共有したときのカードに使われます。
          会場の様子が分かる写真があると、出店者が判断しやすくなります。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          images.length > 0 && (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, index) => (
                <li key={img.id} className="space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-white">
                        <Star className="h-3 w-3" />
                        カバー
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {index === 0 ? (
                      <span className="text-xs text-gray-400">先頭に表示</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => makeCover(img.id)}
                        disabled={isWorking}
                        className="text-xs text-gray-600 hover:text-orange-600 disabled:opacity-50"
                      >
                        カバーにする
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(img.id)}
                      disabled={isWorking}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      aria-label="削除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {images.length < MAX_IMAGES && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload(file);
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => fileRef.current?.click()}
              disabled={isWorking}
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  写真を追加
                </>
              )}
            </Button>
            <p className="mt-2 text-xs text-gray-500">
              JPG / PNG / WebP、10MBまで。{MAX_IMAGES}枚まで登録できます。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
