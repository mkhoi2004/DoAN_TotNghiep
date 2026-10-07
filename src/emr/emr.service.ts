import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConsentStatus, VisitStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { AddTreatmentLineDto } from './dto/add-treatment-line.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CreateEmrDto } from './dto/create-emr.dto';

@Injectable()
export class EmrService {
  constructor(private readonly prisma: PrismaService) {}

  async createRecord(visitId: string, dto: CreateEmrDto) {
    const visit = await this.prisma.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status === VisitStatus.CANCELLED || visit.status === VisitStatus.COMPLETED) {
      throw new BadRequestException('EMR cannot be opened for a closed visit');
    }

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.emrRecord.findUnique({ where: { visitId } });
      if (existing) return existing;

      const emr = await transaction.emrRecord.create({ data: { visitId, clinicalNote: dto.clinicalNote } });
      if (visit.status === VisitStatus.NEW) {
        await transaction.visit.update({ where: { id: visitId }, data: { status: VisitStatus.IN_PROGRESS } });
      }
      return emr;
    });
  }

  async addTreatmentLine(emrId: string, dto: AddTreatmentLineDto) {
    const emr = await this.prisma.emrRecord.findUnique({ where: { id: emrId } });
    if (!emr) throw new NotFoundException('EMR not found');
    if (emr.lockedAt) throw new BadRequestException('EMR is locked after settlement');

    return this.prisma.treatmentLine.create({
      data: {
        emrId,
        serviceCode: dto.serviceCode,
        serviceName: dto.serviceName,
        unitPrice: dto.unitPrice,
        quantity: dto.quantity,
        requiresConsent: dto.requiresConsent,
      },
    });
  }

  async createConsent(emrId: string, dto: CreateConsentDto) {
    const emr = await this.prisma.emrRecord.findUnique({ where: { id: emrId } });
    if (!emr) throw new NotFoundException('EMR not found');
    if (emr.lockedAt) throw new BadRequestException('EMR is locked after settlement');
    const count = await this.prisma.consent.count({ where: { emrId } });

    return this.prisma.consent.create({
      data: {
        emrId,
        serviceCode: dto.serviceCode,
        consentCode: `CST#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#/${String(count + 1).padStart(4, '0')}`,
      },
    });
  }

  async signConsent(consentId: string, signedDocumentUrl?: string) {
    const consent = await this.prisma.consent.findUnique({ where: { id: consentId } });
    if (!consent) throw new NotFoundException('Consent not found');
    if (consent.status !== ConsentStatus.PENDING_SIGNATURE) {
      throw new BadRequestException('Only pending consent can be signed');
    }
    return this.prisma.consent.update({
      where: { id: consentId },
      data: { status: ConsentStatus.SIGNED, signedAt: new Date(), signedDocumentUrl },
    });
  }

  async revokeConsent(consentId: string) {
    const consent = await this.prisma.consent.findUnique({
      where: { id: consentId },
      include: { emr: { include: { visit: true } } },
    });
    if (!consent) throw new NotFoundException('Consent not found');
    if (consent.status !== ConsentStatus.SIGNED) {
      throw new BadRequestException('Only signed consent can be revoked');
    }

    return this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.consent.update({
        where: { id: consentId },
        data: { status: ConsentStatus.REVOKED, revokedAt: new Date() },
      });
      if (consent.emr.visit.status === VisitStatus.WAITING_PROCESSING) {
        await transaction.visit.update({
          where: { id: consent.emr.visitId },
          data: { status: VisitStatus.IN_PROGRESS },
        });
        await transaction.emrRecord.update({ where: { id: consent.emrId }, data: { lockedAt: null } });
      }
      return revoked;
    });
  }

  async settle(emrId: string, idempotencyKey: string) {
    const emr = await this.prisma.emrRecord.findUnique({
      where: { id: emrId },
      include: { visit: true, treatmentLines: true, consents: true, settlement: true },
    });
    if (!emr) throw new NotFoundException('EMR not found');
    if (emr.settlement) {
      if (emr.settlement.idempotencyKey === idempotencyKey) return emr.settlement;
      throw new ConflictException('EMR has already been settled');
    }
    if (emr.lockedAt) throw new BadRequestException('EMR is already locked');
    if (emr.visit.status !== VisitStatus.IN_PROGRESS) {
      throw new BadRequestException('Visit must be in progress before settlement');
    }

    const requiredCodes = emr.treatmentLines
      .filter((line) => line.requiresConsent)
      .map((line) => line.serviceCode);
    const signedCodes = new Set(
      emr.consents.filter((consent) => consent.status === ConsentStatus.SIGNED).map((consent) => consent.serviceCode),
    );
    const missingCode = requiredCodes.find((code) => !signedCodes.has(code));
    if (missingCode) {
      throw new BadRequestException(`Consent SIGNED is required for service ${missingCode}`);
    }

    const grossCharge = emr.treatmentLines.reduce(
      (total, line) => total.plus(new Prisma.Decimal(line.unitPrice).mul(line.quantity)),
      new Prisma.Decimal(0),
    );
    const settlementCode = `SET#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${emrId.slice(0, 8)}`;

    return this.prisma.$transaction(async (transaction) => {
      const settlement = await transaction.settlement.create({
        data: { settlementCode, emrId, idempotencyKey, grossCharge },
      });
      await transaction.emrRecord.update({ where: { id: emrId }, data: { lockedAt: new Date() } });
      await transaction.visit.update({
        where: { id: emr.visitId },
        data: { status: grossCharge.isZero() ? VisitStatus.COMPLETED : VisitStatus.WAITING_PAYMENT, grossCharge },
      });
      return settlement;
    });
  }

  async createPrescription(dto: { visitId: string; patientId: string }) {
    const [visit, patient] = await Promise.all([
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
    ]);

    if (!visit) throw new NotFoundException('Visit not found');
    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.prescription.count();
    const prescriptionCode = `RX#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.prescription.create({
      data: {
        prescriptionCode,
        visitId: dto.visitId,
        patientId: dto.patientId,
        status: 'ISSUED',
        issuedAt: new Date(),
      },
    });
  }

  async createLabOrder(dto: { visitId: string; patientId: string; testName: string }) {
    const [visit, patient] = await Promise.all([
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
    ]);

    if (!visit) throw new NotFoundException('Visit not found');
    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.labOrder.count();
    const orderCode = `ORD#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.labOrder.create({
      data: {
        orderCode,
        visitId: dto.visitId,
        patientId: dto.patientId,
        testName: dto.testName,
        status: 'ORDERED',
        orderedAt: new Date(),
      },
    });
  }

  async completeLabOrder(id: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    return this.prisma.labOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  async removePrescription(id: string, deletedById: string, reason: string) {
    const rx = await this.prisma.prescription.findUnique({ where: { id } });
    if (!rx) throw new NotFoundException('Prescription not found');

    const archiveCode = `DEL_RX#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${rx.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.prescriptionDeleted.create({
        data: {
          archiveCode,
          originalPrescriptionId: rx.id,
          prescriptionCode: rx.prescriptionCode,
          visitId: rx.visitId,
          patientId: rx.patientId,
          status: rx.status,
          issuedAt: rx.issuedAt,
          deletedById,
          reason,
        },
      });

      return transaction.prescription.delete({ where: { id } });
    });
  }

  async removeLabOrder(id: string, deletedById: string, reason: string) {
    const order = await this.prisma.labOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Lab order not found');

    const archiveCode = `DEL_ORD#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${order.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.labOrderDeleted.create({
        data: {
          archiveCode,
          originalLabOrderId: order.id,
          orderCode: order.orderCode,
          visitId: order.visitId,
          patientId: order.patientId,
          testName: order.testName,
          status: order.status,
          orderedAt: order.orderedAt,
          completedAt: order.completedAt,
          deletedById,
          reason,
        },
      });

      return transaction.labOrder.delete({ where: { id } });
    });
  }
}