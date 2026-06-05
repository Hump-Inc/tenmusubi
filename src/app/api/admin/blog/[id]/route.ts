import { NextResponse } from "next/server";
import { auth, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, randomSlugSuffix } from "@/lib/slug";

async function ensureUniqueSlug(desired: string, excludeId: string): Promise<string> {
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

// GET: 単一記事を取得（管理者用、編集フォーム用）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const post = await prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error("Admin blog get error:", error);
    return NextResponse.json({ error: "記事の取得に失敗しました" }, { status: 500 });
  }
}

// PUT: 記事を更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const { title, slug, excerpt, content, coverImage, category, tags, isPublished } = body;

    if (title !== undefined && !title.trim()) {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
    }

    // slug は明示指定があれば再採番、なければ据え置き
    let finalSlug = existing.slug;
    if (slug !== undefined && slug.trim() && slugify(slug) !== existing.slug) {
      finalSlug = await ensureUniqueSlug(slug, id);
    }

    // 公開状態が false→true に変わるときだけ publishedAt を打つ（再公開で日時を保持）
    const willPublish = isPublished ?? existing.isPublished;
    let publishedAt = existing.publishedAt;
    if (willPublish && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (!willPublish) {
      publishedAt = null;
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        slug: finalSlug,
        ...(excerpt !== undefined && { excerpt: excerpt?.trim() || null }),
        ...(content !== undefined && { content: content || "" }),
        ...(coverImage !== undefined && { coverImage: coverImage || null }),
        ...(category !== undefined && { category: category || null }),
        ...(tags !== undefined && { tags: tags?.trim() || null }),
        ...(isPublished !== undefined && { isPublished: willPublish }),
        publishedAt,
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Admin blog update error:", error);
    return NextResponse.json({ error: "記事の更新に失敗しました" }, { status: 500 });
  }
}

// DELETE: 記事を削除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }
    const adminCheck = await requireAdmin(session.user.id);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin blog delete error:", error);
    return NextResponse.json({ error: "記事の削除に失敗しました" }, { status: 500 });
  }
}
