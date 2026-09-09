import {
  formatUserCount,
  shouldShowSocialProof,
  SOCIAL_PROOF_THRESHOLD,
} from "./social-proof";

describe("social proof", () => {
  it("stays hidden until the user count is greater than 100", () => {
    expect(SOCIAL_PROOF_THRESHOLD).toBe(100);
    expect(shouldShowSocialProof(100)).toBe(false);
    expect(shouldShowSocialProof(101)).toBe(true);
  });

  it("formats the actual count for display", () => {
    expect(formatUserCount(1234)).toBe("1,234");
  });
});
