import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WarrantyStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateWarrantyDto, DeleteWarrantyDto } from './dto/warranty.dto';

@Injectable()
export class WarrantyService {
  constructor(private readonly prisma: PrismaService) {}

  async createWarranty(dto: CreateWarrantyDto) {
    const [patient, visit] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
    ]);

    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');
    if (!visit) throw new NotFoundException('Visit not found');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + dto.durationMonths);

    const dateStr = startDate.toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.warranty.count();
    const warrantyCode = `WRN#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.warranty.create({
      data: {
        warrantyCode,
        patientId: dto.patientId,
        visitId: dto.visitId,
        serviceCode: dto.serviceCode,
        status: WarrantyStatus.ACTIVE,
        startDate,
        endDate,
      },
    });
  }

  async checkWarranty(warrantyCode: string) {
    const warranty = await this.prisma.warranty.findUnique({ where: { warrantyCode } });
    if (!warranty) throw new NotFoundException(`Warranty card ${warrantyCode} not found`);

    const now = new Date();
    const isExpired = warranty.endDate < now;
    const isValid = warranty.status === WarrantyStatus.ACTIVE && !isExpired;

    return {
      warrantyCode: warranty.warrantyCode,
      patientId: warranty.patientId,
      serviceCode: warranty.serviceCode,
      status: warranty.status,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      isExpired,
      isValid,
    };
  }

  findAll() {
    return this.prisma.warranty.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findByPatient(patientId: string) {
    return this.prisma.warranty.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
  }

  async removeWarranty(id: string, deletedById: string, dto: DeleteWarrantyDto) {
    const warranty = await this.prisma.warranty.findUnique({ where: { id } });
    if (!warranty) throw new NotFoundException('Warranty card not found');

    const archiveCode = `DEL_WRN#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${warranty.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.warrantyDeleted.create({
        data: {
          archiveCode,
          originalWarrantyId: warranty.id,
          warrantyCode: warranty.warrantyCode,
          patientId: warranty.patientId,
          visitId: warranty.visitId,
          serviceCode: warranty.serviceCode,
          status: warranty.status,
          startDate: warranty.startDate,
          endDate: warranty.endDate,
          originalCreatedAt: warranty.createdAt,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.warranty.delete({ where: { id } });
    });
  }
}
