import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 出店申込情報（S1）の取得・保存。
 *
 * 屋号・業種・SNS・店舗画像は Store 側の既存項目なので、ここでは触らない
 * （店舗編集画面が唯一の編集場所）。車両サイズと出店可能エリアは
 * 主催者が最も見る箇所であり申込情報の一部なので、ここからも更新できる。
 */

async function loadEditableStore(storeId: string, userId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "店舗が見つかりません", status: 404 as const };

  if (store.ownerId !== userId && !(await isAdmin(userId))) {
    return { error: "この店舗を編集する権限がありません", status: 403 as const };
  }
  return { store };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadEditableStore(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const [profile, documents, menuItems] = await Promise.all([
      prisma.storeApplicationProfile.findUnique({ where: { storeId: id } }),
      prisma.applicationDocument.findMany({
        where: { storeId: id },
        orderBy: { order: "asc" },
        // fileKey は返さない。ファイルの所在をレスポンスに載せないため。
        select: {
          id: true,
          type: true,
          label: true,
          mimeType: true,
          fileSize: true,
          expiresOn: true,
          visibility: true,
          order: true,
          createdAt: true,
        },
      }),
      prisma.applicationMenuItem.findMany({
        where: { storeId: id },
        orderBy: { order: "asc" },
      }),
    ]);

    return NextResponse.json({
      store: {
        id: result.store.id,
        name: result.store.name,
        category: result.store.category,
        area: result.store.area,
        availableAreas: result.store.availableAreas,
        vehicleLength: result.store.vehicleLength,
        vehicleWidth: result.store.vehicleWidth,
        vehicleHeight: result.store.vehicleHeight,
      },
      profile,
      documents,
      menuItems,
    });
  } catch (error) {
    console.error("Application profile GET error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// 数値入力は空文字で送られてくるので null に寄せる
function toInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toFloat(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStr(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadEditableStore(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const body = await request.json();

    const availableDays = Array.isArray(body.availableDays)
      ? JSON.stringify(body.availableDays.filter((d: unknown) => typeof d === "string"))
      : null;
    const availableAreas = Array.isArray(body.availableAreas)
      ? JSON.stringify(body.availableAreas.filter((a: unknown) => typeof a === "string"))
      : undefined;

    const data = {
      phone: toStr(body.phone, 40),
      contactEmail: toStr(body.contactEmail, 200),
      openedOn: toStr(body.openedOn, 20),
      appeal: toStr(body.appeal, 2000),

      vehicleType: toStr(body.vehicleType, 40),
      vehicleWeightKg: toInt(body.vehicleWeightKg),
      plateNumber: toStr(body.plateNumber, 40),
      plateNumberPublic: body.plateNumberPublic === true,

      powerWatt: toInt(body.powerWatt),
      hasGenerator: body.hasGenerator === true,
      generatorModel: toStr(body.generatorModel, 100),
      generatorNoiseDb: toInt(body.generatorNoiseDb),
      usesFire: body.usesFire === true,
      fireType: toStr(body.fireType, 40),
      waterTankLiter: toInt(body.waterTankLiter),
      minSpaceWidthM: toFloat(body.minSpaceWidthM),
      minSpaceDepthM: toFloat(body.minSpaceDepthM),

      maxServingsPerHour: toInt(body.maxServingsPerHour),
      secondsPerServing: toInt(body.secondsPerServing),
      availableDays,
      hasPrepKitchen: body.hasPrepKitchen === true,
      prepKitchenNote: toStr(body.prepKitchenNote, 500),
    };

    const [profile] = await Promise.all([
      prisma.storeApplicationProfile.upsert({
        where: { storeId: id },
        create: { storeId: id, ...data },
        update: data,
      }),
      prisma.store.update({
        where: { id },
        data: {
          vehicleLength: toInt(body.vehicleLength),
          vehicleWidth: toInt(body.vehicleWidth),
          vehicleHeight: toInt(body.vehicleHeight),
          ...(availableAreas !== undefined ? { availableAreas } : {}),
        },
      }),
    ]);

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Application profile PUT error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
