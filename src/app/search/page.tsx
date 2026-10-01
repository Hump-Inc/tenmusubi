"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Filter, SlidersHorizontal, Grid, List, X, Loader2 } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchBox } from "@/components/common/SearchBox";
import { ProfileCard } from "@/components/common/ProfileCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard, type EventCardData } from "@/components/events/EventCard";
import { SEARCH_CATEGORIES, AREAS } from "@/lib/constants";

interface SearchResult {
  id: string;
  name: string;
  image: string;
  location: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  description: string;
}

const categories = SEARCH_CATEGORIES;
const areas = AREAS;

type SearchType = "vendor" | "space" | "event";

const TYPE_LABEL: Record<SearchType, string> = {
  vendor: "出店者",
  space: "スペース",
  event: "出店募集",
};

/**
 * 開催月の選択肢。当月から5ヶ月分は月ごとに、その先は「◯年◯月以降」でまとめる。
 * 半年より先の募集も掲載するので、6ヶ月で打ち止めにすると選べないイベントができる
 * （2026-08-27 MTG）。「以降」は value を "from:YYYY-MM" にして API 側で分ける。
 */
function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { value: key(d), label: `${d.getFullYear()}年${d.getMonth() + 1}月` };
  });

  const rest = new Date(now.getFullYear(), now.getMonth() + 5, 1);
  months.push({
    value: `from:${key(rest)}`,
    label: `${rest.getFullYear()}年${rest.getMonth() + 1}月以降`,
  });
  return months;
}

const FEE_OPTIONS = [
  { value: "すべて", label: "指定なし" },
  { value: "0", label: "無料" },
  { value: "5000", label: "5,000円以下" },
  { value: "10000", label: "1万円以下" },
  { value: "20000", label: "2万円以下" },
  { value: "50000", label: "5万円以下" },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const [searchType, setSearchType] = useState<SearchType>("vendor");
  const [selectedCategory, setSelectedCategory] = useState("すべて");
  const [selectedArea, setSelectedArea] = useState("すべて");
  const [sortBy, setSortBy] = useState("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterOpen, setFilterOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState("すべて");
  const [selectedFee, setSelectedFee] = useState("すべて");
  const months = monthOptions();

  const fetchResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedArea === "その他") {
        // 「その他」= リスト内の主要エリア以外
        const mainAreas = areas.filter((a) => a !== "すべて" && a !== "その他");
        params.set("excludeAreas", mainAreas.join(","));
      } else if (selectedArea !== "すべて") {
        params.set("area", selectedArea);
      }
      if (selectedCategory !== "すべて") params.set("category", selectedCategory);

      if (searchType === "event") {
        // イベントはカードの中身が出店者・スペースと大きく違うので、別の一覧として扱う
        if (selectedMonth !== "すべて") {
          // 「◯月以降」は月そのものではなく開始月として渡す
          if (selectedMonth.startsWith("from:")) {
            params.set("monthFrom", selectedMonth.slice("from:".length));
          } else {
            params.set("month", selectedMonth);
          }
        }
        if (selectedFee !== "すべて") params.set("maxFee", selectedFee);
        const res = await fetch(`/api/events?${params.toString()}`);
        const data = await res.json();
        setEvents(data.events || []);
        setResults([]);
        setTotal(data.total || 0);
        return;
      }

      const endpoint = searchType === "vendor" ? "/api/vendors" : "/api/spaces";
      const res = await fetch(`${endpoint}?${params.toString()}`);
      const data = await res.json();

      if (searchType === "vendor") {
        const vendors = data.vendors || [];
        setResults(vendors.map((v: { id: string; storeId?: string; userId: string; displayName: string; images: { url: string }[]; user: { image: string }; area: string; averageRating: number; reviewCount: number; tags: string; description: string }) => ({
          id: v.storeId || v.id, // Use store ID for linking to /store/[id]
          name: v.displayName,
          image: v.images?.[0]?.url || v.user?.image || "/placeholder.jpg",
          location: v.area || "未設定",
          rating: v.averageRating || 0,
          reviewCount: v.reviewCount || 0,
          tags: v.tags ? JSON.parse(v.tags) : [],
          description: v.description || "",
        })));
        setTotal(data.total || 0);
      } else {
        const spaces = data.spaces || [];
        setResults(spaces.map((s: { id: string; name: string; images: { url: string }[]; location: string; _count: { reviews: number }; tags: string; description: string }) => ({
          id: s.id,
          name: s.name,
          image: s.images?.[0]?.url || "/placeholder.jpg",
          location: s.location,
          rating: 0,
          reviewCount: s._count?.reviews || 0,
          tags: s.tags ? JSON.parse(s.tags) : [],
          description: s.description || "",
        })));
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchType, selectedArea, selectedCategory, selectedMonth, selectedFee]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "vendor" || type === "space" || type === "event") {
      setSearchType(type);
    }
    const area = searchParams.get("area");
    if (area) setSelectedArea(area);
    const category = searchParams.get("category");
    if (category) setSelectedCategory(category);
  }, [searchParams]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);
  const activeFilters = [
    selectedCategory !== "すべて" && selectedCategory,
    selectedArea !== "すべて" && selectedArea,
    searchType === "event" &&
      selectedMonth !== "すべて" &&
      months.find((m) => m.value === selectedMonth)?.label,
    searchType === "event" &&
      selectedFee !== "すべて" &&
      FEE_OPTIONS.find((f) => f.value === selectedFee)?.label,
  ].filter((x): x is string => Boolean(x));

  const clearFilters = () => {
    setSelectedCategory("すべて");
    setSelectedArea("すべて");
    setSelectedMonth("すべて");
    setSelectedFee("すべて");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Search Header */}
        <section className="bg-cream py-8">
          <div className="container mx-auto px-4">
            <SearchBox variant="hero" defaultType={searchType} />
          </div>
        </section>

        {/* Results Section */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            {/* Controls */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Type Tabs and View Controls */}
              <div className="flex items-center justify-between">
                <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
                  <TabsList className="rounded-full bg-muted">
                    <TabsTrigger value="vendor" className="rounded-full">
                      出店者
                    </TabsTrigger>
                    <TabsTrigger value="space" className="rounded-full">
                      出店スペース
                    </TabsTrigger>
                    <TabsTrigger value="event" className="rounded-full">
                      出店募集
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 border border-border rounded-full p-1">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>

                  <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="rounded-full sm:hidden">
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        絞り込み
                        {activeFilters.length > 0 && (
                          <Badge className="ml-2 h-5 w-5 p-0 justify-center rounded-full">
                            {activeFilters.length}
                          </Badge>
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
                      <SheetHeader>
                        <SheetTitle>絞り込み</SheetTitle>
                      </SheetHeader>
                      <div className="space-y-6 py-6">
                        <div className="space-y-3">
                          <label className="text-sm font-medium">カテゴリー</label>
                          <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                              <Badge
                                key={cat}
                                variant={selectedCategory === cat ? "default" : "outline"}
                                className="cursor-pointer rounded-full px-4 py-2"
                                onClick={() => setSelectedCategory(cat)}
                              >
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm font-medium">エリア</label>
                          <div className="flex flex-wrap gap-2">
                            {areas.map((area) => (
                              <Badge
                                key={area}
                                variant={selectedArea === area ? "default" : "outline"}
                                className="cursor-pointer rounded-full px-4 py-2"
                                onClick={() => setSelectedArea(area)}
                              >
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {searchType === "event" && (
                          <>
                            <div className="space-y-3">
                              <label className="text-sm font-medium">開催月</label>
                              <div className="flex flex-wrap gap-2">
                                <Badge
                                  variant={selectedMonth === "すべて" ? "default" : "outline"}
                                  className="cursor-pointer rounded-full px-4 py-2"
                                  onClick={() => setSelectedMonth("すべて")}
                                >
                                  指定なし
                                </Badge>
                                {months.map((m) => (
                                  <Badge
                                    key={m.value}
                                    variant={selectedMonth === m.value ? "default" : "outline"}
                                    className="cursor-pointer rounded-full px-4 py-2"
                                    onClick={() => setSelectedMonth(m.value)}
                                  >
                                    {m.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-3">
                              <label className="text-sm font-medium">出展料</label>
                              <div className="flex flex-wrap gap-2">
                                {FEE_OPTIONS.map((f) => (
                                  <Badge
                                    key={f.value}
                                    variant={selectedFee === f.value ? "default" : "outline"}
                                    className="cursor-pointer rounded-full px-4 py-2"
                                    onClick={() => setSelectedFee(f.value)}
                                  >
                                    {f.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                        <Button
                          className="w-full rounded-full"
                          onClick={() => setFilterOpen(false)}
                        >
                          検索結果を見る
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Desktop Filters */}
              <div className="hidden sm:flex flex-wrap items-center justify-between gap-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">絞り込み:</span>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[140px] rounded-full border-border/50">
                      <SelectValue placeholder="カテゴリー" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="w-[140px] rounded-full border-border/50">
                      <SelectValue placeholder="エリア" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {searchType === "event" && (
                    <>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[140px] rounded-full border-border/50">
                          <SelectValue placeholder="開催月" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="すべて">開催月</SelectItem>
                          {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={selectedFee} onValueChange={setSelectedFee}>
                        <SelectTrigger className="w-[140px] rounded-full border-border/50">
                          <SelectValue placeholder="出展料" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {FEE_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.value === "すべて" ? "出展料" : f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {activeFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-1" />
                      クリア
                    </Button>
                  )}
                </div>

                <div className={`items-center gap-2 ${searchType === "event" ? "hidden" : "flex"}`}>
                  <span className="text-sm text-muted-foreground">並び替え:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px] rounded-full border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="recommended">おすすめ順</SelectItem>
                      <SelectItem value="rating">評価が高い順</SelectItem>
                      <SelectItem value="newest">新着順</SelectItem>
                      <SelectItem value="reviews">レビュー数順</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="flex items-center gap-2 sm:hidden">
                  {activeFilters.map((filter) => (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="rounded-full"
                    >
                      {filter}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Results Count */}
              <div className="text-sm text-muted-foreground">
                {total}件の{TYPE_LABEL[searchType]}が見つかりました
              </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : searchType === "event" ? (
              events.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">募集中の出店募集が見つかりませんでした</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    条件を変更するか、少し先の開催月でお試しください
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((e) => (
                    <EventCard key={e.id} event={e} />
                  ))}
                </div>
              )
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground">
                  {TYPE_LABEL[searchType]}が見つかりませんでした
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  条件を変更して再度検索してみてください
                </p>
              </div>
            ) : (
              <>
                {/* Results Grid */}
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                      : "flex flex-col gap-4"
                  }
                >
                  {results.map((item) => (
                    <ProfileCard
                      key={item.id}
                      id={item.id}
                      type={searchType === "space" ? "space" : "vendor"}
                      name={item.name}
                      image={item.image}
                      location={item.location}
                      rating={item.rating}
                      reviewCount={item.reviewCount}
                      tags={item.tags}
                      description={item.description}
                    />
                  ))}
                </div>

                {/* Load More */}
                {results.length < total && (
                  <div className="mt-12 text-center">
                    <Button variant="outline" className="rounded-full">
                      もっと見る
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SearchContent />
    </Suspense>
  );
}
