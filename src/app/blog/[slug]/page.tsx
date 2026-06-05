import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(d: Date | null): string {
  if (!d) return "";
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// HTML本文から概要テキストを抽出（メタ説明のフォールバック）
function htmlToText(html: string, max = 120): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

async function getPost(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, isPublished: true },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "記事が見つかりません | てんむすび" };

  const description = post.excerpt || htmlToText(post.content);
  return {
    title: `${post.title} | てんむすび`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      ...(post.coverImage ? { images: [{ url: post.coverImage }] } : {}),
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const tags = post.tags
    ? post.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          ブログ一覧へ
        </Link>

        <article>
          <header className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              {post.category && (
                <Badge variant="outline" className="text-gray-600">
                  {post.category}
                </Badge>
              )}
              <span className="text-sm text-gray-400">
                {formatDate(post.publishedAt)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-gray-600 mt-3">{post.excerpt}</p>
            )}
          </header>

          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full aspect-video object-cover rounded-2xl mb-8"
            />
          )}

          {/* 本文（Tiptap出力HTML） */}
          <div
            className="prose prose-neutral max-w-none prose-img:rounded-xl prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t">
              {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-gray-500">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
