import { describe, expect, it } from "vitest";
import { canAccessSection, canCreateInSection, sectionRoles } from "./constants";

describe("role-based section access", () => {
  it("keeps accountant menus aligned with API read permissions", () => {
    expect(canAccessSection("ACCOUNTANT", "lab")).toBe(false);
    expect(canAccessSection("CHIEF_ACCOUNTANT", "lab")).toBe(false);
    expect(canAccessSection("CHIEF_ACCOUNTANT", "hr")).toBe(false);
    expect(canAccessSection("CHIEF_ACCOUNTANT", "assets")).toBe(false);
    expect(canAccessSection("ACCOUNTANT", "finance")).toBe(true);
    expect(canAccessSection("CHIEF_ACCOUNTANT", "finance")).toBe(true);
  });

  it("limits journal creation to accountants while preserving separation of duties", () => {
    expect(canCreateInSection("ADMIN", "finance")).toBe(false);
    expect(canCreateInSection("ACCOUNTANT", "finance")).toBe(true);
    expect(canCreateInSection("CHIEF_ACCOUNTANT", "finance")).toBe(false);
  });

  it("supports the inventory manager dashboard without granting visit access", () => {
    expect(canAccessSection("INVENTORY_MANAGER", "dashboard")).toBe(true);
    expect(canAccessSection("INVENTORY_MANAGER", "inventory")).toBe(true);
    expect(canAccessSection("INVENTORY_MANAGER", "reception")).toBe(false);
  });

  it("provides access rules for every section", () => {
    expect(Object.keys(sectionRoles).sort()).toEqual([
      "assets", "cashier", "dashboard", "emr", "finance", "hr", "insurance",
      "inventory", "lab", "patients", "reception", "sterilization", "warranty"
    ]);
  });
});
