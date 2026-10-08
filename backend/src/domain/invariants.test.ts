import { describe, expect, it } from "vitest";
import {
  allocateFifo,
  assertBalancedJournal,
  calculateCashClose,
  canTransitionVisit,
  type StockLot
} from "./invariants";

describe("visit state transitions", () => {
  it("allows only workflow transitions", () => {
    expect(canTransitionVisit(0, 1)).toBe(true);
    expect(canTransitionVisit(2, 4)).toBe(true);
    expect(canTransitionVisit(4, 1)).toBe(false);
    expect(canTransitionVisit(0, 3)).toBe(false);
  });
});

describe("cash shift close control", () => {
  it("requires independent reconciliation even when cash balances exactly", () => {
    expect(calculateCashClose(100.25, 20, 120.25)).toEqual({
      expectedCash: 120.25,
      countedCash: 120.25,
      difference: 0,
      status: "PENDING_CLOSE"
    });
  });

  it("records a signed discrepancy to be investigated", () => {
    expect(calculateCashClose(100, 20.5, 119.25)).toEqual({
      expectedCash: 120.5,
      countedCash: 119.25,
      difference: -1.25,
      status: "PENDING_CLOSE"
    });
  });

  it("rejects invalid or sub-cent cash amounts", () => {
    expect(() => calculateCashClose(0, -1, 0)).toThrow();
    expect(() => calculateCashClose(0, 1.005, 1)).toThrow();
  });
});

describe("FIFO stock allocation", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const lots: StockLot[] = [
    {
      lotId: "later",
      expiresAt: new Date("2027-01-01T00:00:00.000Z"),
      receivedAt: new Date("2025-03-01T00:00:00.000Z"),
      quantityAvailable: 10,
      unitCost: 22
    },
    {
      lotId: "first",
      expiresAt: new Date("2026-06-01T00:00:00.000Z"),
      receivedAt: new Date("2025-01-01T00:00:00.000Z"),
      quantityAvailable: 4,
      unitCost: 20
    },
    {
      lotId: "expired",
      expiresAt: new Date("2025-12-31T00:00:00.000Z"),
      receivedAt: new Date("2024-01-01T00:00:00.000Z"),
      quantityAvailable: 100,
      unitCost: 10
    }
  ];

  it("splits issues across lots in receipt order and excludes expired lots", () => {
    expect(allocateFifo(lots, 7, now)).toEqual([
      { lotId: "first", quantity: 4, unitCost: 20 },
      { lotId: "later", quantity: 3, unitCost: 22 }
    ]);
  });

  it("rejects issues larger than available unexpired stock", () => {
    expect(() => allocateFifo(lots, 15, now)).toThrow(
      "Insufficient unexpired stock"
    );
  });

  it("rejects zero and quantities with more than three decimal places", () => {
    expect(() => allocateFifo(lots, 0, now)).toThrow();
    expect(() => allocateFifo(lots, 1.0001, now)).toThrow();
  });

  it("supports fractional units to three decimal places", () => {
    expect(allocateFifo(lots, 1.25, now)).toEqual([
      { lotId: "first", quantity: 1.25, unitCost: 20 }
    ]);
  });
});

describe("accounting journal invariant", () => {
  it("accepts equal debit and credit totals", () => {
    expect(() =>
      assertBalancedJournal([
        { accountCode: "111", debit: 100, credit: 0 },
        { accountCode: "511", debit: 0, credit: 100 }
      ])
    ).not.toThrow();
  });

  it("rejects unbalanced or two-sided journal lines", () => {
    expect(() =>
      assertBalancedJournal([
        { accountCode: "111", debit: 100, credit: 0 },
        { accountCode: "511", debit: 0, credit: 99 }
      ])
    ).toThrow("Journal entry is not balanced");
    expect(() =>
      assertBalancedJournal([
        { accountCode: "111", debit: 100, credit: 1 },
        { accountCode: "511", debit: 0, credit: 101 }
      ])
    ).toThrow("Journal lines must contain valid one-sided amounts");
  });
});
