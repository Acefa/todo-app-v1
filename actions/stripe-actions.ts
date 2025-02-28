import { updateProfile, updateProfileByStripeCustomerId } from "@/db/queries/profiles-queries";
import { SelectProfile } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

type MembershipStatus = SelectProfile["membership"];

const getMembershipStatus = (status: Stripe.Subscription.Status, membership: MembershipStatus): MembershipStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return "pro";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return "free";
    default:
      return "free";
  }
};

const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price.product"]
  });
};

export const updateStripeCustomer = async (userId: string, subscriptionId: string, customerId: string) => {
  try {
    if (!userId || !subscriptionId || !customerId) {
      throw new Error("Missing required parameters for updateStripeCustomer");
    }

    const subscription = await getSubscription(subscriptionId);
    const membershipStatus = getMembershipStatus(subscription.status, "free");

    const updatedProfile = await updateProfile(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      membership: membershipStatus,
      updatedAt: new Date()
    });

    if (!updatedProfile) {
      throw new Error("Failed to update customer profile");
    }

    return updatedProfile;
  } catch (error) {
    console.error("Error in updateStripeCustomer:", error);
    throw error instanceof Error ? error : new Error("Failed to update Stripe customer");
  }
};

export const manageSubscriptionStatusChange = async (subscriptionId: string, customerId: string, productId: string): Promise<MembershipStatus> => {
  try {
    if (!subscriptionId || !customerId || !productId) {
      throw new Error("Missing required parameters for manageSubscriptionStatusChange");
    }

    const subscription = await getSubscription(subscriptionId);
    const membershipStatus = getMembershipStatus(subscription.status, "pro");

    await updateProfileByStripeCustomerId(customerId, {
      stripeSubscriptionId: subscription.id,
      membership: membershipStatus,
      updatedAt: new Date()
    });

    return membershipStatus;
  } catch (error) {
    console.error("Error in manageSubscriptionStatusChange:", error);
    throw error instanceof Error ? error : new Error("Failed to update subscription status");
  }
};