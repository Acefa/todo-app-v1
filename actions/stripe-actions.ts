"use server";

import { updateProfile } from "@/db/queries/profiles-queries";
import { stripe } from "@/lib/stripe";
import { SelectProfile } from "@/db/schema/profiles-schema";
import Stripe from "stripe";

type MembershipStatus = SelectProfile["membership"];

const getMembershipStatus = (status: Stripe.Subscription.Status, membership: MembershipStatus): MembershipStatus => {
  switch (status) {
    case "active":
      return "pro";
    case "canceled":
    case "unpaid":
      return "free";
    default:
      return membership;
  }
};

export async function updateStripeCustomer(userId: string, subscriptionId: string, customerId: string) {
  await updateProfile(userId, {
    stripeSubscriptionId: subscriptionId,
    stripeCustomerId: customerId,
    membership: "pro"  // 新客户订阅时设置为 pro
  });
}

export async function manageSubscriptionStatusChange(subscriptionId: string, customerId: string, productId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['customer', 'items.data.price']
    });

    await updateProfile(customerId, {
      membership: getMembershipStatus(subscription.status, "free"),
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      updatedAt: new Date()
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error('Failed to update subscription status');
  }
} 