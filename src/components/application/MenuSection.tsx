"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  UtensilsCrossed,
  Loader2,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  ImagePlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface MenuItemDto {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  order: number;
}

export function MenuSection({
  storeId,
  items,
  onChange,
}: {
  storeId: string;
  items: MenuItemDto[];
  onChange: (items: MenuItemDto[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/stores/${storeId}/application/menu/image`, {
        method: "POST",
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "画像のアップロードに失敗しました");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError("画像のアップロードに失敗しました");
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const add = async () => {
    if (!name.trim()) {
      setError("メニュー名を入力してください");
      return;
    }
    setIsAdding(true);
    setError("");
    try {
      const res = await fetch(`/api/stores/${storeId}/application/menu`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price, description, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "追加に失敗しました");
        return;
      }
      onChange([...items, data.item]);
      setName("");
      setPrice("");
      setDescription("");
      setImageUrl(null);
    } catch {
      setError("追加に失敗しました");
    } finally {
      setIsAdding(false);
    }
  };

  const remove = async (item: MenuItemDto) => {
    const res = await fetch(`/api/stores/${storeId}/application/menu/${item.id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    onChange(items.filter((i) => i.id !== item.id));
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;

    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next); // 先に画面へ反映し、サーバーには裏で追随させる

    const res = await fetch(`/api/stores/${storeId}/application/menu`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((i) => i.id) }),
    });
    if (!res.ok) {
      onChange(items); // 失敗したら元に戻す
      return;
    }
    const data = await res.json();
    onChange(data.items);
  };

  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-orange-500" />
          メニュー
        </CardTitle>
        <CardDescription>
          共有ページと申込書に、この並び順で載ります。主力商品を上にしてください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {items.length > 0 && (
          <ul className="space-y-3">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="上へ移動"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="下へ移動"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {item.imageUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    {item.price !== null && (
                      <p className="shrink-0 text-sm text-gray-600">
                        {item.price.toLocaleString()}円
                      </p>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-full text-red-600 hover:text-red-700"
                  onClick={() => remove(item)}
                  aria-label="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-xl bg-gray-50 p-4 space-y-4">
          <p className="text-sm font-medium text-gray-900">メニューを追加</p>

          <div className="grid sm:grid-cols-[1fr_140px] gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-name">メニュー名</Label>
              <Input
                id="menu-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 特製ローストビーフ丼"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="menu-price">価格</Label>
              <div className="relative">
                <Input
                  id="menu-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="800"
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  円
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-description">説明（任意）</Label>
            <Textarea
              id="menu-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              rows={2}
              placeholder="例: 国産牛のローストビーフを贅沢に使用"
            />
          </div>

          <div className="space-y-2">
            <Label>写真（任意）</Label>
            {imageUrl ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-gray-100">
                <Image src={imageUrl} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                  aria-label="写真を外す"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      写真を選ぶ
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={add}
            disabled={isAdding}
          >
            {isAdding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                追加中...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                追加する
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
