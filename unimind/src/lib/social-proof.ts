export const SOCIAL_PROOF_THRESHOLD = 100;

export function shouldShowSocialProof(userCount: number) {
  return userCount > SOCIAL_PROOF_THRESHOLD;
}

export function formatUserCount(userCount: number) {
  return userCount.toLocaleString("en-US");
}
