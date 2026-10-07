import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { DeletePatientDto, UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePatientDto) {
    const duplicate = await this.prisma.patient.findFirst({
      where: {
        isDeleted: false,
        OR: [{ phone: dto.phone }, ...(dto.nationalId ? [{ nationalId: dto.nationalId }] : [])],
      },
    });
    if (duplicate) {
      throw new ConflictException(`Patient already exists: ${duplicate.patientCode}`);
    }

    const today = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const count = await this.prisma.patient.count();
    return this.prisma.patient.create({
      data: {
        patientCode: `BN#${today}#/${String(count + 1).padStart(4, '0')}`,
        fullName: dto.fullName.trim(),
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        nationalId: dto.nationalId,
        allergies: dto.allergies,
      },
    });
  }

  findAll() {
    return this.prisma.patient.findMany({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { visits: { orderBy: { createdAt: 'desc' } } },
    });
    if (!patient || patient.isDeleted) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.dateOfBirth ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.gender ? { gender: dto.gender } : {}),
        ...(dto.phone ? { phone: dto.phone } : {}),
        ...(dto.nationalId ? { nationalId: dto.nationalId } : {}),
        ...(dto.allergies !== undefined ? { allergies: dto.allergies } : {}),
      },
    });
  }

  async remove(id: string, deletedById: string, dto: DeletePatientDto) {
    const patient = await this.findOne(id);

    const archiveCode = `DEL_PAT#${new Date().toISOString().slice(0, 10).replaceAll('-', '')}#${patient.id.slice(0, 6)}`;
    return this.prisma.$transaction(async (transaction) => {
      await transaction.patientDeleted.create({
        data: {
          archiveCode,
          originalPatientId: patient.id,
          patientCode: patient.patientCode,
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone,
          nationalId: patient.nationalId,
          allergies: patient.allergies,
          deletedById,
          reason: dto.reason,
        },
      });

      return transaction.patient.update({
        where: { id },
        data: { isDeleted: true },
      });
    });
  }
}