import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InstrumentPackStatus, SterilizationStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import {
  CompleteSterilizationCycleDto,
  CreateSterilizationCycleDto,
  DeleteSterilizationCycleDto,
  PackInstrumentDto,
} from './dto/sterilization.dto';

@Injectable()
export class SterilizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createCycle(dto: CreateSterilizationCycleDto) {
    const operator = await this.prisma.user.findUnique({ where: { id: dto.operatorId } });
    if (!operator) throw new NotFoundException('Operator user not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.sterilizationCycle.count();
    const cycleCode = `CYC#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.sterilizationCycle.create({
      data: {
        cycleCode,
        machineName: dto.machineName,
        temperatureC: new Prisma.Decimal(dto.temperatureC),
        pressureBar: new Prisma.Decimal(dto.pressureBar),
        durationMinutes: dto.durationMinutes,
        resultStatus: SterilizationStatus.IN_PROGRESS,
        operatorId: dto.operatorId,
        startedAt: new Date(),
      },
    });
  }

  async completeCycle(id: string, dto: CompleteSterilizationCycleDto) {
    const cycle = await this.prisma.sterilizationCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Sterilization cycle not found');

    return this.prisma.sterilizationCycle.update({
      where: { id },
      data: {
        resultStatus: dto.passed ? SterilizationStatus.PASSED : SterilizationStatus.FAILED,
        completedAt: new Date(),
      },
    });
  }

  async packInstrument(dto: PackInstrumentDto) {
    const cycle = await this.prisma.sterilizationCycle.findUnique({ where: { id: dto.sterilizationCycleId } });
    if (!cycle) throw new NotFoundException('Sterilization cycle not found');
    if (cycle.resultStatus !== SterilizationStatus.PASSED) {
      throw new BadRequestException(`Cannot pack instruments from a cycle that is not PASSED (Current: ${cycle.resultStatus})`);
    }

    const sterilizedAt = new Date();
    const validDays = dto.validDays ?? 30;
    const expiryAt = new Date(sterilizedAt.getTime() + validDays * 24 * 60 * 60 * 1000);

    const dateStr = sterilizedAt.toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.instrumentPack.count();
    const packCode = `PAK#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.instrumentPack.create({
      data: {
        packCode,
        packName: dto.packName,
        sterilizationCycleId: dto.sterilizationCycleId,
        sterilizedAt,
        expiryAt,
        status: InstrumentPackStatus.STERILE,
      },
    });
  }

  async verifyPack(packCode: string) {
    const pack = await this.prisma.instrumentPack.findUnique({ where: { packCode } });
    if (!pack) throw new NotFoundException(`Instrument pack ${packCode} not found`);

    const now = new Date();
    const isExpired = pack.expiryAt < now;
    const isValid = pack.status === InstrumentPackStatus.STERILE && !isExpired;

    return {
      packCode: pack.packCode,
      packName: pack.packName,
      status: pack.status,
      sterilizedAt: pack.sterilizedAt,
      expiryAt: pack.expiryAt,
      isExpired,
      isValid,
    };
  }

  findAllCycles() {
    return this.prisma.sterilizationCycle.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findAllPacks() {
    return this.prisma.instrumentPack.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async removeCycle(id: string, deletedById: string, dto: DeleteSterilizationCycleDto) {
    const cycle = await this.prisma.sterilizationCycle.findUnique({ where: { id } });
    if (!cycle) throw new NotFoundException('Sterilization cycle not found');

    const archiveCode = `DEL_CYC#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${cycle.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.sterilizationCycleDeleted.create({
        data: {
          archiveCode,
          originalSterilizationCycleId: cycle.id,
          cycleCode: cycle.cycleCode,
          machineName: cycle.machineName,
          temperatureC: cycle.temperatureC,
          pressureBar: cycle.pressureBar,
          durationMinutes: cycle.durationMinutes,
          resultStatus: cycle.resultStatus,
          operatorId: cycle.operatorId,
          startedAt: cycle.startedAt,
          completedAt: cycle.completedAt,
          originalCreatedAt: cycle.createdAt,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.sterilizationCycle.delete({ where: { id } });
    });
  }
}
