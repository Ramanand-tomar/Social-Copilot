export type PlanType = "free" | "pro" | "business";

export interface PlanLimits {
  maxSocialAccounts: number;
  maxScheduledPosts: number;
  maxAutoReplyRules: number;
  maxStorageMB: number;
  aiCaptionsPerMonth: number;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxSocialAccounts: 2,
    maxScheduledPosts: 5,
    maxAutoReplyRules: 1,
    maxStorageMB: 500,
    aiCaptionsPerMonth: 10,
  },
  pro: {
    maxSocialAccounts: 10,
    maxScheduledPosts: 100,
    maxAutoReplyRules: 10,
    maxStorageMB: 10240, // 10GB
    aiCaptionsPerMonth: 500,
  },
  business: {
    maxSocialAccounts: 100,
    maxScheduledPosts: 9999,
    maxAutoReplyRules: 9999,
    maxStorageMB: 102400, // 100GB
    aiCaptionsPerMonth: 9999,
  },
};

export const getPlanLimits = (plan: string | null | undefined): PlanLimits => {
  const p = (plan?.toLowerCase() || "free") as PlanType;
  return PLAN_LIMITS[p] || PLAN_LIMITS.free;
};
