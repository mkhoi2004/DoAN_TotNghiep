import { describe, expect, it } from "vitest";
import {
  protectNationalId,
  protectSensitiveText,
  revealSensitiveText
} from "./pii";

describe("patient data protection", () => {
  it("encrypts and decrypts sensitive clinical notes", () => {
    const encrypted = protectSensitiveText("Penicillin allergy");
    expect(encrypted).not.toContain("Penicillin allergy");
    expect(revealSensitiveText(encrypted)).toBe("Penicillin allergy");
    expect(revealSensitiveText(null)).toBeNull();
  });

  it("detects tampered ciphertext", () => {
    const encrypted = protectSensitiveText("Sensitive note");
    if (encrypted === null) {
      throw new Error("Expected ciphertext");
    }
    const content = encrypted.slice(3);
    const replacement = content[content.length - 2] === "A" ? "B" : "A";
    const tampered = `v1:${content.slice(0, -2)}${replacement}${content.slice(-1)}`;
    expect(() => revealSensitiveText(tampered)).toThrow();
  });

  it("uses a deterministic keyed hash but randomized ciphertext for duplicate checks", () => {
    const first = protectNationalId("012345678901");
    const second = protectNationalId(" 012345678901 ");
    expect(first.lookupHash).toBe(second.lookupHash);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.ciphertext).not.toContain("012345678901");
  });
});
