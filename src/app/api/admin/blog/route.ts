import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, randomSlugSuffix } from "@/lib/slug";

// 一意な slug を確定する（空ならランダム、衝突時はサフィックス付与）
async function ensureUniqueSlug(desired: string, excludeId?: string): Promise<string> {
  let base = slugify(desired);
  if (!base) base = `post-${randomSlugSuffix()}`;
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${randomSlugSuffix()}`;
  }
  return `${base}-${randomSlugSuffix()}`;
}

// GET: ブログ記事一覧（管理者用、下書き含む）
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const posts = await prisma.blogPost.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        category: true,
        isPublished: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Admin blog fetch error:", error);
    return NextResponse.json({ error: "ブログの取得に失敗しました" }, { status: 500 });
  }
}

// POST: ブログ記事を作成
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, coverImage, category, tags, isPublished } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
    }

    const finalSlug = await ensureUniqueSlug(slug || title);
    const publish = isPublished ?? false;

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt?.trim() || null,
        content: content || "",
        coverImage: coverImage || null,
        category: category || null,
        tags: tags?.trim() || null,
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Admin blog create error:", error);
    return NextResponse.json({ error: "ブログの作成に失敗しました" }, { status: 500 });
  }
}
