import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConsentStatus, VisitStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { EmrService } from './emr.service';

describe('EmrService workflow', () => {
  const prisma = {
    emrRecord: { findUnique: jest.fn(), update: jest.fn() },
    consent: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    settlement: { create: jest.fn() },
    treatmentLine: { create: jest.fn() },
    visit: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new EmrService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('blocks settlement when a required service has no signed consent', async () => {
    prisma.emrRecord.findUnique.mockResolvedValue({
      id: 'emr-1',
      lockedAt: null,
      visit: { id: 'visit-1', status: VisitStatus.IN_PROGRESS },
      treatmentLines: [{ serviceCode: 'IMPLANT', unitPrice: new Prisma.Decimal(100), quantity: 1, requiresConsent: true }],
      consents: [],
      settlement: null,
    });

    await expect(service.settle('emr-1', 'idem-12345678')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('settles a zero-cost EMR and completes the visit atomically', async () => {
    prisma.emrRecord.findUnique.mockResolvedValue({
      id: 'emr-1',
      visitId: 'visit-1',
      lockedAt: null,
      visit: { id: 'visit-1', status: VisitStatus.IN_PROGRESS },
      treatmentLines: [{ serviceCode: 'FOLLOW_UP', unitPrice: new Prisma.Decimal(0), quantity: 1, requiresConsent: false }],
      consents: [],
      settlement: null,
    });
    const transaction = {
      settlement: { create: jest.fn().mockResolvedValue({ id: 'settlement-1' }) },
      emrRecord: { update: jest.fn() },
      visit: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await service.settle('emr-1', 'idem-12345678');

    expect(transaction.visit.update).toHaveBeenCalledWith({
      where: { id: 'visit-1' },
      data: { status: VisitStatus.COMPLETED, grossCharge: new Prisma.Decimal(0) },
    });
    expect(transaction.emrRecord.update).toHaveBeenCalled();
  });

  it('reverts a processing visit when its signed consent is revoked', async () => {
    prisma.consent.findUnique.mockResolvedValue({
      id: 'consent-1',
      status: ConsentStatus.SIGNED,
      emrId: 'emr-1',
      emr: { visitId: 'visit-1', visit: { status: VisitStatus.WAITING_PROCESSING } },
    });
    const transaction = {
      consent: { update: jest.fn().mockResolvedValue({ id: 'consent-1', status: ConsentStatus.REVOKED }) },
      visit: { update: jest.fn() },
      emrRecord: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await service.revokeConsent('consent-1');

    expect(transaction.visit.update).toHaveBeenCalledWith({
      where: { id: 'visit-1' },
      data: { status: VisitStatus.IN_PROGRESS },
    });
    expect(transaction.emrRecord.update).toHaveBeenCalledWith({ where: { id: 'emr-1' }, data: { lockedAt: null } });
  });
});