import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CashShiftStatus, PaymentMethod, VisitStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { BillingService } from './billing.service';

describe('BillingService workflow', () => {
  const prisma = {
    cashShift: { findFirst: jest.fn(), findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn(), count: jest.fn() },
    visit: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new BillingService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('closes a shift when the difference is within the threshold', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({
      id: 'shift-1',
      status: CashShiftStatus.OPEN,
      openingFloat: new Prisma.Decimal(100000),
      cashCollected: new Prisma.Decimal(500000),
      cashPaidOut: new Prisma.Decimal(0),
    });
    prisma.cashShift.update.mockResolvedValue({ id: 'shift-1', status: CashShiftStatus.CLOSED });

    await service.closeShift('shift-1', { countedCash: 599990 });

    expect(prisma.cashShift.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: CashShiftStatus.CLOSED, difference: new Prisma.Decimal(-10) }),
    }));
  });

  it('keeps a shift pending when the difference exceeds the threshold', async () => {
    prisma.cashShift.findUnique.mockResolvedValue({
      id: 'shift-1',
      status: CashShiftStatus.OPEN,
      openingFloat: new Prisma.Decimal(100000),
      cashCollected: new Prisma.Decimal(500000),
      cashPaidOut: new Prisma.Decimal(0),
    });

    await service.closeShift('shift-1', { countedCash: 700000, closeNote: 'Needs manager review' });

    expect(prisma.cashShift.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: CashShiftStatus.PENDING_CLOSE, closedAt: null }),
    }));
  });

  it('completes a visit when the final payment is collected', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.visit.findUnique.mockResolvedValue({
      id: 'visit-1',
      status: VisitStatus.WAITING_PAYMENT,
      grossCharge: new Prisma.Decimal(100000),
      emr: { id: 'emr-1' },
      payments: [],
    });
    prisma.payment.count.mockResolvedValue(0);
    prisma.cashShift.findUnique.mockResolvedValue({ id: 'shift-1', status: CashShiftStatus.OPEN });
    const transaction = {
      payment: { create: jest.fn().mockResolvedValue({ id: 'payment-1' }) },
      cashShift: { update: jest.fn() },
      visit: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await service.recordPayment({
      visitId: 'visit-1',
      createdById: 'user-1',
      cashShiftId: 'shift-1',
      method: PaymentMethod.CASH,
      amount: 100000,
      idempotencyKey: 'payment-12345678',
    });

    expect(transaction.visit.update).toHaveBeenCalledWith({
      where: { id: 'visit-1' },
      data: { status: VisitStatus.COMPLETED },
    });
  });

  it('rejects a cash payment without an open shift', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    prisma.visit.findUnique.mockResolvedValue({
      id: 'visit-1',
      status: VisitStatus.WAITING_PAYMENT,
      grossCharge: new Prisma.Decimal(100000),
      emr: { id: 'emr-1' },
      payments: [],
    });
    prisma.cashShift.findUnique.mockResolvedValue(null);

    await expect(service.recordPayment({
      visitId: 'visit-1',
      createdById: 'user-1',
      method: PaymentMethod.CASH,
      amount: 100000,
      idempotencyKey: 'payment-12345678',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

});
