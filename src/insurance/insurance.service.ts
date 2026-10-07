import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InsuranceClaimStatus } from '../domain/enums';
import { PrismaService } from '../database/prisma.service';
import { ApproveInsuranceClaimDto, CreateInsuranceClaimDto, DeleteInsuranceClaimDto } from './dto/insurance-claim.dto';

@Injectable()
export class InsuranceService {
  constructor(private readonly prisma: PrismaService) {}

  async createClaim(dto: CreateInsuranceClaimDto) {
    const [visit, patient] = await Promise.all([
      this.prisma.visit.findUnique({ where: { id: dto.visitId } }),
      this.prisma.patient.findUnique({ where: { id: dto.patientId } }),
    ]);

    if (!visit) throw new NotFoundException('Visit not found');
    if (!patient || patient.isDeleted) throw new NotFoundException('Patient not found');

    const coverage = dto.coveragePercentage ?? 80;
    const grossCharge = visit.grossCharge;
    const approvedEstimate = grossCharge.mul(coverage).div(100);
    const patientEstimate = grossCharge.minus(approvedEstimate);

    const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.insuranceClaim.count();
    const claimCode = `CLM#${dateStr}#/${String(count + 1).padStart(4, '0')}`;

    return this.prisma.insuranceClaim.create({
      data: {
        claimCode,
        visitId: dto.visitId,
        patientId: dto.patientId,
        payerName: dto.payerName,
        status: InsuranceClaimStatus.DRAFT,
        approvedAmount: approvedEstimate,
        patientAmount: patientEstimate,
      },
    });
  }

  async submitClaim(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Insurance claim not found');
    if (claim.status !== InsuranceClaimStatus.DRAFT) {
      throw new BadRequestException(`Only DRAFT claims can be submitted. Current status: ${claim.status}`);
    }

    return this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        status: InsuranceClaimStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  async approveClaim(id: string, dto: ApproveInsuranceClaimDto) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Insurance claim not found');
    if (claim.status !== InsuranceClaimStatus.SUBMITTED) {
      throw new BadRequestException(`Only SUBMITTED claims can be approved. Current status: ${claim.status}`);
    }

    return this.prisma.insuranceClaim.update({
      where: { id },
      data: {
        status: InsuranceClaimStatus.APPROVED,
        approvedAmount: new Prisma.Decimal(dto.approvedAmount),
        patientAmount: new Prisma.Decimal(dto.patientAmount),
      },
    });
  }

  async exportXml4210(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Insurance claim not found');

    const visit = await this.prisma.visit.findUnique({
      where: { id: claim.visitId },
      include: { patient: true, emr: { include: { treatmentLines: true } } },
    });

    const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<CHI_TIET_BHXH_QDEC_4210>
  <BANG_TONG_HOP_MA_4210>
    <MA_LK>${claim.claimCode}</MA_LK>
    <MA_BN>${visit?.patient.patientCode || ''}</MA_BN>
    <HO_TEN>${visit?.patient.fullName || ''}</HO_TEN>
    <MA_DOITUONG_BHYT>${claim.payerName}</MA_DOITUONG_BHYT>
    <TONG_CHI>${claim.approvedAmount.plus(claim.patientAmount).toFixed(2)}</TONG_CHI>
    <BHXH_THANH_TOAN>${claim.approvedAmount.toFixed(2)}</BHXH_THANH_TOAN>
    <BN_THANH_TOAN>${claim.patientAmount.toFixed(2)}</BN_THANH_TOAN>
    <TRANG_THAI>${claim.status}</TRANG_THAI>
  </BANG_TONG_HOP_MA_4210>
  <BANG_CHITET_DICHVU_MA_4210>
    ${(visit?.emr?.treatmentLines || [])
      .map(
        (line, idx) => `
    <DICH_VU_LINE_NUM="${idx + 1}">
      <MA_DICH_VU>${line.serviceCode}</MA_DICH_VU>
      <TEN_DICH_VU>${line.serviceName}</TEN_DICH_VU>
      <SO_LUONG>${line.quantity}</SO_LUONG>
      <DON_GIA>${line.unitPrice.toFixed(2)}</DON_GIA>
    </DICH_VU_LINE_NUM>`,
      )
      .join('')}
  </BANG_CHITET_DICHVU_MA_4210>
</CHI_TIET_BHXH_QDEC_4210>`;

    return { claimCode: claim.claimCode, xmlContent: xmlPayload };
  }

  findAll() {
    return this.prisma.insuranceClaim.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const claim = await this.prisma.insuranceClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Insurance claim not found');
    return claim;
  }

  async remove(id: string, deletedById: string, dto: DeleteInsuranceClaimDto) {
    const claim = await this.findOne(id);
    const archiveCode = `DEL_CLM#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${claim.id.slice(0, 6)}`;

    return this.prisma.$transaction(async (transaction) => {
      await transaction.insuranceClaimDeleted.create({
        data: {
          archiveCode,
          originalInsuranceClaimId: claim.id,
          claimCode: claim.claimCode,
          visitId: claim.visitId,
          patientId: claim.patientId,
          payerName: claim.payerName,
          status: claim.status,
          submittedAt: claim.submittedAt,
          approvedAmount: claim.approvedAmount,
          patientAmount: claim.patientAmount,
          originalCreatedAt: claim.createdAt,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.insuranceClaim.delete({ where: { id } });
    });
  }
}
