import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CashShiftStatus, PaymentMethod, VisitStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { OpenShiftDto } from './dto/open-shift.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

const CASH_OVER_SHORT_THRESHOLD = 50000;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async openShift(cashierId: string, dto: OpenShiftDto) {
    const existing = await this.prisma.cashShift.findFirst({ where: { cashierId, status: CashShiftStatus.OPEN } });
    if (existing) throw new ConflictException('Cashier already has an open shift');
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.cashShift.count({ where: { openedAt: { gte: new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00.000Z`) } } });
    return this.prisma.cashShift.create({
      data: { shiftCode: `SHIFT#${date}#/${String(count + 1).padStart(3, '0')}`, cashierId, openingFloat: dto.openingFloat },
    });
  }

  async recordPayment(dto: RecordPaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
    if (existing) return existing;

    const visit = await this.prisma.visit.findUnique({ where: { id: dto.visitId }, include: { payments: true, emr: true } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (!visit.emr) throw new BadRequestException('Visit has not been settled');
    if (visit.status !== VisitStatus.WAITING_PAYMENT) throw new BadRequestException('Visit is not waiting for payment');

    const paid = visit.payments.reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
    const amount = new Prisma.Decimal(dto.amount);
    if (paid.plus(amount).greaterThan(visit.grossCharge)) throw new BadRequestException('Payment exceeds receivable amount');

    let cashShiftId: string | undefined;
    if (dto.method === PaymentMethod.CASH) {
      if (!dto.cashShiftId) throw new BadRequestException('Cash payment requires an open cash shift');
      const shift = await this.prisma.cashShift.findUnique({ where: { id: dto.cashShiftId } });
      if (!shift || shift.status !== CashShiftStatus.OPEN) throw new BadRequestException('Cash shift is not open');
      cashShiftId = shift.id;
    }

    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.payment.count({ where: { createdAt: { gte: new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}T00:00:00.000Z`) } } });
    return this.prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.create({
        data: {
          transactionCode: `PAY#${date}#/${String(count + 1).padStart(4, '0')}`,
          idempotencyKey: dto.idempotencyKey,
          visitId: dto.visitId,
          createdById: dto.createdById,
          cashShiftId,
          method: dto.method,
          amount,
        },
      });
      if (cashShiftId) {
        await transaction.cashShift.update({ where: { id: cashShiftId }, data: { cashCollected: { increment: amount } } });
      }
      if (paid.plus(amount).equals(visit.grossCharge)) {
        await transaction.visit.update({ where: { id: dto.visitId }, data: { status: VisitStatus.COMPLETED } });
      }
      return payment;
    });
  }

  async closeShift(id: string, dto: CloseShiftDto) {
    const shift = await this.prisma.cashShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Cash shift not found');
    if (shift.status !== CashShiftStatus.OPEN) throw new BadRequestException('Only an open shift can be closed');

    const theoretical = shift.openingFloat.plus(shift.cashCollected).minus(shift.cashPaidOut);
    const countedCash = new Prisma.Decimal(dto.countedCash);
    const difference = countedCash.minus(theoretical);
    const exceedsThreshold = difference.abs().greaterThan(CASH_OVER_SHORT_THRESHOLD);
    return this.prisma.cashShift.update({
      where: { id },
      data: {
        status: exceedsThreshold ? CashShiftStatus.PENDING_CLOSE : CashShiftStatus.CLOSED,
        countedCash,
        difference,
        closeNote: dto.closeNote,
        closedAt: exceedsThreshold ? null : new Date(),
      },
    });
  }
}