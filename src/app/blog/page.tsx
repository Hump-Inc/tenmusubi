import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "ブログ | てんむすび",
  description: "てんむすび運営からのお知らせ・イベント・コラムをお届けします。",
};

// 常に最新を表示（公開直後に反映）
export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default async function BlogListPage() {
  const posts = await prisma.blogPost.findMany({
    where: { isPublished: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      category: true,
      publishedAt: true,
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ブログ</h1>
          <p className="text-gray-600 mt-2">運営からのお知らせ・イベント・コラム</p>
        </div>

        {posts.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <FileText className="h-10 w-10 text-gray-300" />
            <p className="text-gray-500">まだ記事がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden">
                  {post.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {post.category && (
                      <Badge variant="outline" className="text-gray-600">
                        {post.category}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(post.publishedAt)}
                    </span>
                  </div>
                  <h2 className="font-bold text-gray-900 line-clamp-2 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
