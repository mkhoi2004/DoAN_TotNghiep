import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReservationStatus, StockLotStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ReceiveLotDto } from './dto/receive-lot.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  createItem(dto: CreateItemDto) {
    return this.prisma.inventoryItem.create({ data: { ...dto, requiresLot: dto.requiresLot ?? true } });
  }

  receiveLot(dto: ReceiveLotDto) {
    if (dto.quantity <= 0) throw new BadRequestException('Lot quantity must be greater than zero');
    if (dto.unitCost < 0) throw new BadRequestException('Unit cost cannot be negative');
    return this.prisma.stockLot.create({
      data: {
        itemId: dto.itemId,
        lotCode: dto.lotCode,
        quantityOnHand: dto.quantity,
        unitCost: dto.unitCost,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  listLots() {
    return this.prisma.stockLot.findMany({ include: { item: true }, orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }] });
  }

  async reserve(dto: ReserveStockDto) {
    const requested = new Prisma.Decimal(dto.quantity);
    const [item, visit] = await Promise.all([
      this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } }),
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
    ]);
    if (!item) throw new NotFoundException('Inventory item not found');
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status === 'CANCELLED' || visit.status === 'COMPLETED') throw new BadRequestException('Visit cannot reserve stock');

    return this.prisma.$transaction(async (transaction) => {
      const lots = await transaction.stockLot.findMany({
        where: {
          itemId: dto.itemId,
          status: { in: [StockLotStatus.AVAILABLE, StockLotStatus.RESERVED] },
          OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }],
        },
        orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
      });
      if (lots.some((lot) => new Prisma.Decimal(lot.quantityOnHand).isNegative() || new Prisma.Decimal(lot.quantityReserved).isNegative() || new Prisma.Decimal(lot.quantityReserved).greaterThan(lot.quantityOnHand))) {
        throw new BadRequestException('Stock lot quantities are inconsistent');
      }
      const totalAvailable = lots.reduce(
        (total, lot) => total.plus(new Prisma.Decimal(lot.quantityOnHand).minus(lot.quantityReserved)),
        new Prisma.Decimal(0),
      );
      if (totalAvailable.lessThan(requested)) throw new BadRequestException(`Insufficient available stock for ${item.itemCode}`);

      let remaining = requested;
      const reservations = [];
      const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
      const existingCount = await transaction.stockReservation.count({ where: { createdAt: { gte: new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00.000Z`) } } });
      let sequence = existingCount;
      for (const lot of lots) {
        if (remaining.isZero()) break;
        const available = new Prisma.Decimal(lot.quantityOnHand).minus(lot.quantityReserved);
        if (available.lessThanOrEqualTo(0)) continue;
        const allocated = Prisma.Decimal.min(available, remaining);
        sequence += 1;
        reservations.push(await transaction.stockReservation.create({
          data: {
            reservationCode: `RES#${date}#/${String(sequence).padStart(4, '0')}`,
            visitId: dto.visitId,
            itemId: dto.itemId,
            lotId: lot.id,
            quantity: allocated,
          },
        }));
        await transaction.stockLot.update({
          where: { id: lot.id },
          data: { quantityReserved: { increment: allocated }, status: StockLotStatus.RESERVED },
        });
        remaining = remaining.minus(allocated);
      }
      return reservations;
    });
  }

  async consume(reservationId: string) {
    const reservation = await this.prisma.stockReservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== ReservationStatus.RESERVED) throw new BadRequestException('Reservation is not active');
    return this.prisma.$transaction(async (transaction) => {
      const lot = await transaction.stockLot.findUnique({ where: { id: reservation.lotId } });
      if (!lot || new Prisma.Decimal(lot.quantityReserved).lessThan(reservation.quantity) || new Prisma.Decimal(lot.quantityOnHand).lessThan(reservation.quantity)) {
        throw new BadRequestException('Reserved quantity is inconsistent with on-hand stock');
      }
      const remainingOnHand = new Prisma.Decimal(lot.quantityOnHand).minus(reservation.quantity);
      await transaction.stockLot.update({
        where: { id: lot.id },
        data: {
          quantityOnHand: { decrement: reservation.quantity },
          quantityReserved: { decrement: reservation.quantity },
          status: remainingOnHand.isZero() ? StockLotStatus.CONSUMED : StockLotStatus.AVAILABLE,
        },
      });
      return transaction.stockReservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.CONSUMED, consumedAt: new Date() } });
    });
  }

  async release(reservationId: string) {
    const reservation = await this.prisma.stockReservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.status !== ReservationStatus.RESERVED) throw new BadRequestException('Reservation is not active');
    return this.prisma.$transaction(async (transaction) => {
      const lot = await transaction.stockLot.findUnique({ where: { id: reservation.lotId } });
      if (!lot || new Prisma.Decimal(lot.quantityReserved).lessThan(reservation.quantity)) {
        throw new BadRequestException('Reserved quantity is inconsistent');
      }
      await transaction.stockLot.update({
        where: { id: reservation.lotId },
        data: { quantityReserved: { decrement: reservation.quantity }, status: StockLotStatus.AVAILABLE },
      });
      return transaction.stockReservation.update({ where: { id: reservationId }, data: { status: ReservationStatus.RELEASED, releasedAt: new Date() } });
    });
  }
}