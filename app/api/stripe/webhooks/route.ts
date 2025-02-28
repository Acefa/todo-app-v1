/**
 * Stripe Webhook 处理
 * 处理订阅相关的事件回调
 */

import { manageSubscriptionStatusChange, updateStripeCustomer } from "@/actions/stripe-actions";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";

/**
 * 需要处理的 Stripe 事件类型
 */
const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted"
]);

/**
 * POST 请求处理
 * 处理来自 Stripe 的 webhook 事件
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature")!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

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
        return new Response("Webhook handler failed.", { status: 400 });
      }
    }

    return new Response(JSON.stringify({ received: true }));
  } catch (error) {
    console.error(`Webhook Error: ${(error as Error).message}`);
    return new Response("Invalid signature", { status: 400 });
  }
}

/**
 * 处理订阅变更事件
 * @param event - Stripe 事件对象
 */
async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const productId = subscription.items.data[0].price.product as string;
  await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
}

/**
 * 处理结账会话完成事件
 * @param event - Stripe 事件对象
 */
async function handleCheckoutSession(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;
  if (checkoutSession.mode === "subscription") {
    const subscriptionId = checkoutSession.subscription as string;
    await updateStripeCustomer(
      checkoutSession.client_reference_id as string,
      subscriptionId,
      checkoutSession.customer as string
    );

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"]
    });

    const productId = subscription.items.data[0].price.product as string;
    await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);

    // 重定向到成功页面或原页面
    if (checkoutSession.success_url) {
      redirect(checkoutSession.success_url);
    } else {
      redirect("/");  // 默认重定向到首页
    }
  }
}