import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddTreatmentLineDto } from './dto/add-treatment-line.dto';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CreateEmrDto } from './dto/create-emr.dto';
import { SettleEmrDto } from './dto/settle-emr.dto';
import { EmrService } from './emr.service';

@Controller('emr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmrController {
  constructor(private readonly emrService: EmrService) {}

  @Post('visits/:visitId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT)
  createRecord(@Param('visitId') visitId: string, @Body() dto: CreateEmrDto) {
    return this.emrService.createRecord(visitId, dto);
  }

  @Post(':emrId/treatment-lines')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  addTreatmentLine(@Param('emrId') emrId: string, @Body() dto: AddTreatmentLineDto) {
    return this.emrService.addTreatmentLine(emrId, dto);
  }

  @Post(':emrId/consents')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createConsent(@Param('emrId') emrId: string, @Body() dto: CreateConsentDto) {
    return this.emrService.createConsent(emrId, dto);
  }

  @Patch('consents/:consentId/sign')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  signConsent(@Param('consentId') consentId: string) {
    return this.emrService.signConsent(consentId);
  }

  @Patch('consents/:consentId/revoke')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  revokeConsent(@Param('consentId') consentId: string) {
    return this.emrService.revokeConsent(consentId);
  }

  @Post(':emrId/settle')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  settle(@Param('emrId') emrId: string, @Body() dto: SettleEmrDto) {
    return this.emrService.settle(emrId, dto.idempotencyKey);
  }

  @Post('prescriptions')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createPrescription(@Body() dto: { visitId: string; patientId: string }) {
    return this.emrService.createPrescription(dto);
  }

  @Post('lab-orders')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createLabOrder(@Body() dto: { visitId: string; patientId: string; testName: string }) {
    return this.emrService.createLabOrder(dto);
  }

  @Patch('lab-orders/:id/complete')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT)
  completeLabOrder(@Param('id') id: string) {
    return this.emrService.completeLabOrder(id);
  }
}