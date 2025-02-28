import { manageSubscriptionStatusChange, updateStripeCustomer } from "@/actions/stripe-action";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const relevantEvents = new Set(["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"]);

interface StripeWebhookData {
  id: string;
  object: string;
  api_version: string;
  created: number;
  data: {
    object: Stripe.Event.Data.Object;
  };
  type: string;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    ) as StripeWebhookData;

    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
            await handleSubscriptionChange(event);
            break;

          case "checkout.session.completed":
            await handleCheckoutSession(event);
            break;

          default:
            throw new Error("Unhandled relevant event!");
        }
      } catch (error) {
        console.error("Webhook handler failed:", error);
        return NextResponse.json(
          { error: "Webhook handler failed. View your nextjs function logs." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error(`Webhook Error: ${(error as Error).message}`);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }
}

async function handleSubscriptionChange(event: StripeWebhookData) {
  const subscription = event.data.object as Stripe.Subscription;
  const productId = subscription.items.data[0].price.product as string;
  await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
}

async function handleCheckoutSession(event: StripeWebhookData) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.mode === "subscription") {
    const subscriptionId = checkoutSession.subscription as string;
    await updateStripeCustomer(checkoutSession.client_reference_id as string, subscriptionId, checkoutSession.customer as string);

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"]
    });

    const productId = subscription.items.data[0].price.product as string;
    await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
  }
}