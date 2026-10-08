import { describe, expect, it } from "vitest";
import { passwordPolicySchema } from "./password-policy";

describe("password policy", () => {
  it("requires more than eight characters, an uppercase letter, and a special character", () => {
    expect(passwordPolicySchema.safeParse("TiepNhan1234@").success).toBe(true);
    expect(passwordPolicySchema.safeParse("Abcdefg@").success).toBe(false);
    expect(passwordPolicySchema.safeParse("tiepnhan1234@").success).toBe(false);
    expect(passwordPolicySchema.safeParse("Tiepnhan1234").success).toBe(false);
  });

  it("does not require lowercase letters or digits", () => {
    expect(passwordPolicySchema.safeParse("PASSWORD!!").success).toBe(true);
    expect(passwordPolicySchema.safeParse("PASSWORD!!1").success).toBe(true);
  });
});
