export type VisitStatus = -1 | 0 | 1 | 2 | 3 | 4;

const visitTransitions: Record<VisitStatus, readonly VisitStatus[]> = {
  [-1]: [],
  0: [-1, 1],
  1: [-1, 2],
  2: [1, 3, 4],
  3: [4],
  4: []
};

export function canTransitionVisit(from: VisitStatus, to: VisitStatus): boolean {
  return visitTransitions[from].includes(to);
}

export interface CashCloseSummary {
  expectedCash: number;
  countedCash: number;
  difference: number;
  status: "PENDING_CLOSE";
}

export function calculateCashClose(
  openingFloat: number,
  cashCollected: number,
  countedCash: number
): CashCloseSummary {
  const amounts = [openingFloat, cashCollected, countedCash];
  if (amounts.some((amount) =>
    !Number.isFinite(amount) ||
    amount < 0 ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8
  )) {
    throw new Error("Cash amounts must be non-negative and have at most two decimal places");
  }
  const expectedCents = Math.round(openingFloat * 100) + Math.round(cashCollected * 100);
  const countedCents = Math.round(countedCash * 100);
  return {
    expectedCash: expectedCents / 100,
    countedCash: countedCents / 100,
    difference: (countedCents - expectedCents) / 100,
    status: "PENDING_CLOSE"
  };
}

export interface StockLot {
  lotId: string;
  expiresAt: Date;
  receivedAt: Date;
  quantityAvailable: number;
  unitCost: number;
}

export interface StockAllocation {
  lotId: string;
  quantity: number;
  unitCost: number;
}

export function allocateFifo(
  lots: readonly StockLot[],
  requestedQuantity: number,
  now = new Date()
): StockAllocation[] {
  if (
    !Number.isFinite(requestedQuantity) ||
    requestedQuantity <= 0 ||
    Math.abs(requestedQuantity * 1000 - Math.round(requestedQuantity * 1000)) > 1e-8
  ) {
    throw new Error("Requested quantity must be positive with at most 3 decimal places");
  }

  let remaining = requestedQuantity;
  const allocations: StockAllocation[] = [];
  const orderedLots = [...lots]
    .filter((lot) => lot.expiresAt > now && lot.quantityAvailable > 0)
    .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

  for (const lot of orderedLots) {
    const quantity = Math.min(remaining, lot.quantityAvailable);
    if (quantity > 0) {
      allocations.push({ lotId: lot.lotId, quantity, unitCost: lot.unitCost });
      remaining = Number((remaining - quantity).toFixed(3));
    }
    if (remaining === 0) {
      break;
    }
  }

  if (remaining > 0) {
    throw new Error("Insufficient unexpired stock");
  }

  return allocations;
}

export interface JournalLineInput {
  accountCode: string;
  debit: number;
  credit: number;
}

export function assertBalancedJournal(lines: readonly JournalLineInput[]): void {
  if (lines.length < 2) {
    throw new Error("A journal entry requires at least two lines");
  }

  for (const line of lines) {
    if (
      !Number.isFinite(line.debit) ||
      !Number.isFinite(line.credit) ||
      line.debit < 0 ||
      line.credit < 0 ||
      (line.debit > 0 && line.credit > 0)
    ) {
      throw new Error("Journal lines must contain valid one-sided amounts");
    }
  }

  const debitTotal = lines.reduce((sum, line) => sum + line.debit, 0);
  const creditTotal = lines.reduce((sum, line) => sum + line.credit, 0);
  if (Math.round(debitTotal * 100) !== Math.round(creditTotal * 100)) {
    throw new Error("Journal entry is not balanced");
  }
}
