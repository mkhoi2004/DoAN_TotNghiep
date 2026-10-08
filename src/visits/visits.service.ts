import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { VisitStatus } from '../domain/enums';
import { CreateVisitDto } from './dto/create-visit.dto';

const transitions = {
  NEW: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PROCESSING', 'CANCELLED'],
  WAITING_PROCESSING: ['IN_PROGRESS', 'WAITING_PAYMENT', 'COMPLETED'],
  WAITING_PAYMENT: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
} as const;

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVisitDto) {
    const [patient, doctor] = await Promise.all([
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
      this.prisma.user.findUnique({ where: { id: dto.doctorId } }),
    ]);
    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');
    if (!doctor) throw new NotFoundException('Doctor not found');

    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.visit.count({
      where: { createdAt: { gte: new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6)}T00:00:00.000Z`) } },
    });

    return this.prisma.visit.create({
      data: {
        visitCode: `STN#${today}#/${String(count + 1).padStart(4, '0')}`,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        type: dto.type,
        grossCharge: dto.grossCharge,
      },
    });
  }

  findAll() {
    return this.prisma.visit.findMany({
      include: { patient: true, doctor: true, emr: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const visit = await this.prisma.visit.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
        emr: { include: { treatmentLines: true, consents: true, settlement: true } },
        payments: true,
      },
    });
    if (!visit) throw new NotFoundException(`Visit with ID ${id} not found`);
    return visit;
  }

  async transition(id: string, nextStatus: keyof typeof transitions) {
    const visit = await this.prisma.visit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (!(transitions[visit.status as VisitStatus] as readonly string[]).includes(nextStatus)) {
      throw new BadRequestException(`Invalid visit transition: ${visit.status} -> ${nextStatus}`);
    }
    if (nextStatus === 'COMPLETED' && visit.grossCharge.isZero() && visit.status === 'WAITING_PROCESSING') {
      return this.prisma.visit.update({ where: { id }, data: { status: 'COMPLETED' } });
    }
    return this.prisma.visit.update({ where: { id }, data: { status: nextStatus } });
  }

  async remove(id: string, deletedById: string, reason: string) {
    const visit = await this.findOne(id);
    const archiveCode = `DEL_STN#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${visit.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.visitDeleted.create({
        data: {
          archiveCode,
          originalVisitId: visit.id,
          visitCode: visit.visitCode,
          patientId: visit.patientId,
          doctorId: visit.doctorId,
          visitType: visit.type,
          visitStatus: visit.status,
          grossCharge: visit.grossCharge,
          originalCreatedAt: visit.createdAt,
          deletedById,
          reason,
        },
      });

      return transaction.visit.delete({ where: { id } });
    });
  }
}