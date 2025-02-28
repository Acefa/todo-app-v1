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
    stripeCustomerId: customerId
  });
}

export async function manageSubscriptionStatusChange(subscriptionId: string, customerId: string, productId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const profile = await updateProfile(customerId, {
    membership: getMembershipStatus(subscription.status, "free")
  });
  return profile;
} 