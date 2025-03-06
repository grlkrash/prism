export const FEATURE_FLAGS = {
  ENABLE_AGENT_CHAT: process.env.NEXT_PUBLIC_ENABLE_AGENT_CHAT === 'true'
} as const

export type FeatureFlag = keyof typeof FEATURE_FLAGS 