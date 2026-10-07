import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VisitStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { VisitsService } from './visits.service';

describe('VisitsService status workflow', () => {
  const prisma = {
    visit: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const service = new VisitsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('completes a zero-cost visit directly from processing', async () => {
    prisma.visit.findUnique.mockResolvedValue({
      id: 'visit-1',
      status: VisitStatus.WAITING_PROCESSING,
      grossCharge: new Prisma.Decimal(0),
    });
    prisma.visit.update.mockResolvedValue({ id: 'visit-1', status: VisitStatus.COMPLETED });

    await service.transition('visit-1', VisitStatus.COMPLETED);

    expect(prisma.visit.update).toHaveBeenCalledWith({
      where: { id: 'visit-1' },
      data: { status: VisitStatus.COMPLETED },
    });
  });

  it('rejects an illegal transition after completion', async () => {
    prisma.visit.findUnique.mockResolvedValue({
      id: 'visit-1',
      status: VisitStatus.COMPLETED,
      grossCharge: new Prisma.Decimal(100000),
    });

    await expect(service.transition('visit-1', VisitStatus.IN_PROGRESS)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.visit.update).not.toHaveBeenCalled();
  });
});