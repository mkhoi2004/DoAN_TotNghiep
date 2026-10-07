import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DentalLabStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { CreateDentalLabTicketDto, CreateLabReworkCycleDto, DeleteDentalLabTicketDto } from './dto/dental-lab.dto';

@Injectable()
export class LabService {
  constructor(private readonly prisma: PrismaService) {}

  async createTicket(dto: CreateDentalLabTicketDto) {
    const [visit, patient] = await Promise.all([
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
    ]);

    if (!visit) throw new NotFoundException('Visit not found');
    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.dentalLabTicket.count();
    const ticketCode = `LAB#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.dentalLabTicket.create({
      data: {
        ticketCode,
        visitId: dto.visitId,
        patientId: dto.patientId,
        labName: dto.labName,
        restorationType: dto.restorationType,
        status: DentalLabStatus.SENT,
        sentAt: dto.sentAt ? new Date(dto.sentAt) : new Date(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      },
    });
  }

  async receiveTicket(id: string) {
    const ticket = await this.prisma.dentalLabTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Dental lab ticket not found');

    return this.prisma.dentalLabTicket.update({
      where: { id },
      data: {
        status: DentalLabStatus.RECEIVED,
        receivedAt: new Date(),
      },
    });
  }

  async fitTicket(id: string) {
    const ticket = await this.prisma.dentalLabTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Dental lab ticket not found');

    return this.prisma.dentalLabTicket.update({
      where: { id },
      data: { status: DentalLabStatus.FITTED },
    });
  }

  async addReworkCycle(dto: CreateLabReworkCycleDto) {
    const ticket = await this.prisma.dentalLabTicket.findUnique({ where: { id: dto.labTicketId } });
    if (!ticket) throw new NotFoundException('Dental lab ticket not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.labReworkCycle.count({ where: { labTicketId: dto.labTicketId } });
    const reworkCode = `RWK#${dateStr}#/${String(count + 1).padStart(3, '0')}`;

    return this.prisma.$transaction(async (transaction) => {
      const rework = await transaction.labReworkCycle.create({
        data: {
          reworkCode,
          labTicketId: dto.labTicketId,
          reason: dto.reason,
          responsibility: dto.responsibility,
          charge: new Prisma.Decimal(dto.charge),
          status: 'OPEN',
        },
      });

      await transaction.dentalLabTicket.update({
        where: { id: dto.labTicketId },
        data: { status: DentalLabStatus.REWORK_REQUESTED },
      });

      return rework;
    });
  }

  findAll() {
    return this.prisma.dentalLabTicket.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const ticket = await this.prisma.dentalLabTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Dental lab ticket not found');
    return ticket;
  }

  async removeTicket(id: string, deletedById: string, dto: DeleteDentalLabTicketDto) {
    const ticket = await this.findOne(id);
    const archiveCode = `DEL_LAB#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${ticket.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.dentalLabTicketDeleted.create({
        data: {
          archiveCode,
          originalDentalLabTicketId: ticket.id,
          ticketCode: ticket.ticketCode,
          visitId: ticket.visitId,
          patientId: ticket.patientId,
          labName: ticket.labName,
          restorationType: ticket.restorationType,
          status: ticket.status,
          sentAt: ticket.sentAt,
          dueAt: ticket.dueAt,
          receivedAt: ticket.receivedAt,
          originalCreatedAt: ticket.createdAt,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.dentalLabTicket.delete({ where: { id } });
    });
  }
}
