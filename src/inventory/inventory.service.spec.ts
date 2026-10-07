import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService FIFO workflow', () => {
  const prisma = {
    inventoryItem: { findUnique: jest.fn(), create: jest.fn() },
    visit: { findUnique: jest.fn() },
    stockLot: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    stockReservation: { count: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new InventoryService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('splits a FIFO reservation across the oldest lots', async () => {
    prisma.inventoryItem.findUnique.mockResolvedValue({ id: 'item-1', itemCode: 'VT-001' });
    prisma.visit.findUnique.mockResolvedValue({ id: 'visit-1', status: 'IN_PROGRESS' });
    const transaction = {
      stockLot: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'lot-1', quantityOnHand: new Prisma.Decimal(4), quantityReserved: new Prisma.Decimal(0) },
          { id: 'lot-2', quantityOnHand: new Prisma.Decimal(20), quantityReserved: new Prisma.Decimal(0) },
        ]),
        update: jest.fn(),
      },
      stockReservation: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await service.reserve({ visitId: 'visit-1', itemId: 'item-1', quantity: 10 });

    expect(transaction.stockReservation.create).toHaveBeenCalledTimes(2);
    expect(transaction.stockReservation.create.mock.calls[0][0].data.quantity.toString()).toBe('4');
    expect(transaction.stockReservation.create.mock.calls[1][0].data.quantity.toString()).toBe('6');
    expect(transaction.stockLot.update).toHaveBeenCalledTimes(2);
  });

  it('rejects a reservation that exceeds available stock before writing rows', async () => {
    prisma.inventoryItem.findUnique.mockResolvedValue({ id: 'item-1', itemCode: 'VT-001' });
    prisma.visit.findUnique.mockResolvedValue({ id: 'visit-1', status: 'IN_PROGRESS' });
    const transaction = {
      stockLot: { findMany: jest.fn().mockResolvedValue([{ id: 'lot-1', quantityOnHand: new Prisma.Decimal(4), quantityReserved: new Prisma.Decimal(0) }]), update: jest.fn() },
      stockReservation: { count: jest.fn(), create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await expect(service.reserve({ visitId: 'visit-1', itemId: 'item-1', quantity: 5 })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.stockReservation.create).not.toHaveBeenCalled();
    expect(transaction.stockLot.update).not.toHaveBeenCalled();
  });

  it('releases an active reservation without reducing on-hand stock', async () => {
    prisma.stockReservation.findUnique.mockResolvedValue({ id: 'reservation-1', status: 'RESERVED', lotId: 'lot-1', quantity: new Prisma.Decimal(2) });
    const transaction = {
      stockLot: { findUnique: jest.fn().mockResolvedValue({ quantityReserved: new Prisma.Decimal(2) }), update: jest.fn() },
      stockReservation: { update: jest.fn().mockResolvedValue({ status: 'RELEASED' }) },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await service.release('reservation-1');

    expect(transaction.stockLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { quantityReserved: { decrement: new Prisma.Decimal(2) }, status: 'AVAILABLE' },
    });
  });

  it('rejects consume when on-hand stock cannot cover the reservation', async () => {
    prisma.stockReservation.findUnique.mockResolvedValue({ id: 'reservation-1', status: 'RESERVED', lotId: 'lot-1', quantity: new Prisma.Decimal(5) });
    const transaction = {
      stockLot: { findUnique: jest.fn().mockResolvedValue({ quantityOnHand: new Prisma.Decimal(4), quantityReserved: new Prisma.Decimal(5) }), update: jest.fn() },
      stockReservation: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await expect(service.consume('reservation-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.stockLot.update).not.toHaveBeenCalled();
  });

  it('rejects reservation when stored lot quantities are already inconsistent', async () => {
    prisma.inventoryItem.findUnique.mockResolvedValue({ id: 'item-1', itemCode: 'VT-001' });
    prisma.visit.findUnique.mockResolvedValue({ id: 'visit-1', status: 'IN_PROGRESS' });
    const transaction = {
      stockLot: { findMany: jest.fn().mockResolvedValue([{ id: 'lot-1', quantityOnHand: new Prisma.Decimal(4), quantityReserved: new Prisma.Decimal(5) }]), update: jest.fn() },
      stockReservation: { count: jest.fn(), create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof transaction) => unknown) => callback(transaction));

    await expect(service.reserve({ visitId: 'visit-1', itemId: 'item-1', quantity: 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.stockReservation.create).not.toHaveBeenCalled();
  });
});