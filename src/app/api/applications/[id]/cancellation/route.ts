import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { EVENT_PAYMENTS_ENABLED } from "@/lib/constants";
import { loadApplicationForViewer } from "@/lib/eventApplicationAccess";
import {
  acceptCancellation,
  approveCancellation,
  CancellationError,
  disputeCancellation,
  organizerCancel,
  requestVendorCancellation,
  resolveCancellation,
} from "@/lib/eventCancellation";

/**
 * POST: 出店料を払ったあとのキャンセルの操作（キャンセル規定 第3条・第7条）。
 *
 * action:
 *   request          出店者が申し出る（reason: 任意）
 *   accept           主催者が受け付ける（refundAmount: 規定どおり以上）
 *   approve          出店者が受け付けた内容を承認する → 返金
 *   dispute          合意できないので運営に判断を求める（出店者・主催者。reason: 必須）
 *   organizer_cancel 主催者都合で取り消す → 全額返金（reason: 必須）
 *   resolve          運営が返金額を決めて確定する（refundAmount）
 */
const ROLE_FOR: Record<string, ("vendor" | "organizer" | "admin")[]> = {
  request: ["vendor"],
  accept: ["organizer"],
  approve: ["vendor"],
  dispute: ["vendor", "organizer"],
  organizer_cancel: ["organizer"],
  resolve: ["admin"],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!EVENT_PAYMENTS_ENABLED) {
      return NextResponse.json({ error: "現在ご利用いただけません" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { id } = await params;
    const result = await loadApplicationForViewer(id, session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { role } = result;

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";
    const roles = ROLE_FOR[action];
    if (!roles) {
      return NextResponse.json({ error: "指定できない操作です" }, { status: 400 });
    }
    if (!roles.includes(role)) {
      return NextResponse.json({ error: "この操作は行えません" }, { status: 403 });
    }
    const refundAmount = Number(body.refundAmount);

    switch (action) {
      case "request":
        await requestVendorCancellation(id, session.user.id, body.reason);
        break;
      case "accept":
        await acceptCancellation(id, refundAmount);
        break;
      case "approve":
        await approveCancellation(id);
        break;
      case "dispute":
        await disputeCancellation(id, session.user.id, role as "vendor" | "organizer", body.reason);
        break;
      case "organizer_cancel":
        await organizerCancel(id, session.user.id, body.reason);
        break;
      case "resolve":
        await resolveCancellation(id, refundAmount);
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CancellationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cancellation POST error:", error);
    return NextResponse.json({ error: "処理に失敗しました" }, { status: 500 });
  }
}
