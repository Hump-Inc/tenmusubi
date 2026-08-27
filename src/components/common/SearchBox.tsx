"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VENDOR_CATEGORY_LABELS, AREAS } from "@/lib/constants";

const areas = AREAS.filter((a) => a !== "すべて");
const categories = VENDOR_CATEGORY_LABELS;

interface SearchBoxProps {
  variant?: "hero" | "compact";
  defaultType?: "space" | "vendor" | "event";
}

export function SearchBox({ variant = "hero", defaultType = "vendor" }: SearchBoxProps) {
  const router = useRouter();
  const [searchType, setSearchType] = useState(defaultType);

  // 検索ページ側でタブを切り替えたときに、こちらのボタンも追随させる。
  // useState の初期値だけでは、マウント後の変更が反映されない。
  useEffect(() => {
    setSearchType(defaultType);
  }, [defaultType]);
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [keyword, setKeyword] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("type", searchType);
    if (area) params.set("area", area);
    if (category) params.set("category", category);
    if (keyword) params.set("q", keyword);
    router.push(`/search?${params.toString()}`);
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-border bg-card p-2 shadow-sm">
        <Input
          type="text"
          placeholder="キーワードで検索..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0"
        />
        <Button size="icon" className="rounded-full shrink-0" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Type Tabs */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={searchType === "vendor" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSearchType("vendor")}
        >
          出店者を探す
        </Button>
        <Button
          variant={searchType === "space" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSearchType("space")}
        >
          出店場所を探す
        </Button>
        <Button
          variant={searchType === "event" ? "default" : "outline"}
          className="rounded-full"
          onClick={() => setSearchType("event")}
        >
          出店募集を探す
        </Button>
      </div>

      {/* Search Form */}
      <div className="rounded-2xl bg-card p-4 shadow-md border border-border/50">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Area */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              エリア
            </label>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="rounded-xl border-border/50">
                <SelectValue placeholder="エリアを選択" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {areas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Tag className="h-4 w-4" />
              カテゴリー
            </label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="rounded-xl border-border/50">
                <SelectValue placeholder="カテゴリーを選択" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keyword */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Search className="h-4 w-4" />
              キーワード
            </label>
            <Input
              type="text"
              placeholder="フリーワード検索"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="rounded-xl border-border/50"
            />
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <Button
              className="w-full rounded-xl h-10"
              onClick={handleSearch}
            >
              <Search className="h-4 w-4 mr-2" />
              検索する
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
