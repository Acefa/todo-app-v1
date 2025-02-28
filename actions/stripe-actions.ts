/**
 * Stripe 相关的服务器端操作
 * 处理订阅状态变更和客户信息更新
 */

import { updateProfile, updateProfileByStripeCustomerId } from "@/db/queries/profiles-queries";
import { SelectProfile } from "@/db/schema";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

type MembershipStatus = SelectProfile["membership"];

/**
 * 根据订阅状态确定会员等级
 * @param status - Stripe 订阅状态
 * @param membership - 当前会员等级
 * @returns 更新后的会员等级
 */
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

/**
 * 获取订阅详细信息
 * @param subscriptionId - Stripe 订阅 ID
 */
const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "items.data.price.product"]
  });
};

/**
 * 更新 Stripe 客户信息
 * @param userId - 用户 ID
 * @param subscriptionId - 订阅 ID
 * @param customerId - Stripe 客户 ID
 */
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

/**
 * 管理订阅状态变更
 * @param subscriptionId - 订阅 ID
 * @param customerId - Stripe 客户 ID
 * @param productId - 产品 ID
 */
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