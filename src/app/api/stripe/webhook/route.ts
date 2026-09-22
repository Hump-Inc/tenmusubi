import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import {
  handleEventCheckoutCompleted,
  handleEventChargeRefunded,
  syncOrganizerAccount,
} from "@/lib/eventPayments";

// 主催者の Connect アカウントで起きたイベント（account.updated）は、Stripe 側で
// 別のエンドポイント設定になり署名シークレットも別になる。同じURLで両方受ける。
function webhookSecrets(): string[] {
  return [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => !!s
  );
}

function verify(body: string, signature: string): Stripe.Event | null {
  for (const secret of webhookSecrets()) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
      // 次のシークレットで試す
    }
  }
  return null;
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const event = verify(body, signature);
  if (!event) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment" && session.metadata?.kind === "event_payment") {
          await handleEventCheckoutCompleted(session);
          break;
        }
        if (session.mode === "subscription" && session.subscription && session.metadata?.userId) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await prisma.subscription.upsert({
            where: { userId: session.metadata.userId },
            create: {
              userId: session.metadata.userId,
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            update: {
              stripeSubscriptionId: subscription.id,
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
          });
        }
        break;
      }

      case "charge.refunded": {
        await handleEventChargeRefunded(event.data.object as Stripe.Charge);
        break;
      }

      case "account.updated": {
        await syncOrganizerAccount(event.data.object as Stripe.Account);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: subscription.status,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: "canceled",
            cancelAtPeriodEnd: false,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subId = subDetails?.subscription;
        if (subId) {
          const subscriptionId = typeof subId === "string" ? subId : subId.id;
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "past_due" },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
