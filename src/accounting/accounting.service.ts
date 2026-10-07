import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JournalStatus, VoucherStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateJournalEntryDto, CreateVoucherDto, DeleteAccountingVoucherDto } from './dto/accounting.dto';

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  async createVoucher(createdById: string, dto: CreateVoucherDto) {
    const creator = await this.prisma.user.findUnique({ where: { id: createdById } });
    if (!creator) throw new NotFoundException('Creator user not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.accountingVoucher.count();
    const voucherCode = `VOU#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.accountingVoucher.create({
      data: {
        voucherCode,
        voucherType: dto.voucherType,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        amount: new Prisma.Decimal(dto.amount),
        status: VoucherStatus.DRAFT,
        createdById,
      },
    });
  }

  async approveVoucher(id: string, approvedById: string) {
    const voucher = await this.prisma.accountingVoucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Accounting voucher not found');
    if (voucher.status !== VoucherStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT vouchers can be approved. Current status: ${voucher.status}`);
    }

    if (voucher.createdById === approvedById) {
      throw new ConflictException('Segregation of Duties (SoD) Violation: Creator cannot self-approve their own voucher');
    }

    return this.prisma.accountingVoucher.update({
      where: { id },
      data: {
        status: VoucherStatus.APPROVED,
        approvedById,
        approvedAt: new Date(),
      },
    });
  }

  async postJournalEntry(createdById: string, dto: CreateJournalEntryDto) {
    if (!dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('A journal entry must contain at least 2 lines (debit and credit)');
    }

    let totalDebit = new Prisma.Decimal(0);
    let totalCredit = new Prisma.Decimal(0);

    for (const line of dto.lines) {
      totalDebit = totalDebit.plus(line.debit);
      totalCredit = totalCredit.plus(line.credit);
    }

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException(
        `Double-entry invariant violated: Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)})`,
      );
    }

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.journalEntry.count();
    const entryCode = `JRN#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.$transaction(async (transaction) => {
      const journalEntry = await transaction.journalEntry.create({
        data: {
          entryCode,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          status: JournalStatus.POSTED,
          totalDebit,
          totalCredit,
          createdById,
          lines: {
            create: dto.lines.map((line) => ({
              accountCode: line.accountCode,
              description: line.description,
              debit: new Prisma.Decimal(line.debit),
              credit: new Prisma.Decimal(line.credit),
            })),
          },
        },
        include: { lines: true },
      });

      return journalEntry;
    });
  }

  async getGeneralLedger() {
    const lines = await this.prisma.journalLine.findMany({
      include: { journalEntry: true },
      orderBy: { journalEntry: { createdAt: 'desc' } },
    });

    const ledger: Record<string, { totalDebit: Prisma.Decimal; totalCredit: Prisma.Decimal; balance: Prisma.Decimal }> = {};

    for (const line of lines) {
      if (!ledger[line.accountCode]) {
        ledger[line.accountCode] = {
          totalDebit: new Prisma.Decimal(0),
          totalCredit: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(0),
        };
      }

      ledger[line.accountCode].totalDebit = ledger[line.accountCode].totalDebit.plus(line.debit);
      ledger[line.accountCode].totalCredit = ledger[line.accountCode].totalCredit.plus(line.credit);
      ledger[line.accountCode].balance = ledger[line.accountCode].totalDebit.minus(ledger[line.accountCode].totalCredit);
    }

    return Object.entries(ledger).map(([accountCode, data]) => ({
      accountCode,
      totalDebit: data.totalDebit.toFixed(2),
      totalCredit: data.totalCredit.toFixed(2),
      balance: data.balance.toFixed(2),
    }));
  }

  findAllVouchers() {
    return this.prisma.accountingVoucher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findAllJournalEntries() {
    return this.prisma.journalEntry.findMany({ include: { lines: true }, orderBy: { createdAt: 'desc' } });
  }

  async removeVoucher(id: string, deletedById: string, dto: DeleteAccountingVoucherDto) {
    const voucher = await this.prisma.accountingVoucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException('Accounting voucher not found');

    const archiveCode = `DEL_VOU#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${voucher.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.accountingVoucherDeleted.create({
        data: {
          archiveCode,
          originalAccountingVoucherId: voucher.id,
          voucherCode: voucher.voucherCode,
          voucherType: voucher.voucherType,
          sourceType: voucher.sourceType,
          sourceId: voucher.sourceId,
          amount: voucher.amount,
          status: voucher.status,
          createdById: voucher.createdById,
          approvedById: voucher.approvedById,
          originalCreatedAt: voucher.createdAt,
          approvedAt: voucher.approvedAt,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.accountingVoucher.delete({ where: { id } });
    });
  }
}
