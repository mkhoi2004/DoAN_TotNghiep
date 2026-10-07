import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApproveInsuranceClaimDto, CreateInsuranceClaimDto, DeleteInsuranceClaimDto } from './dto/insurance-claim.dto';
import { InsuranceService } from './insurance.service';

@Controller('insurance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('claims')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  createClaim(@Body() dto: CreateInsuranceClaimDto) {
    return this.insuranceService.createClaim(dto);
  }

  @Post('claims/:id/submit')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  submitClaim(@Param('id') id: string) {
    return this.insuranceService.submitClaim(id);
  }

  @Post('claims/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  approveClaim(@Param('id') id: string, @Body() dto: ApproveInsuranceClaimDto) {
    return this.insuranceService.approveClaim(id, dto);
  }

  @Get('claims/:id/xml')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  exportXml(@Param('id') id: string) {
    return this.insuranceService.exportXml4210(id);
  }

  @Get('claims')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  findAll() {
    return this.insuranceService.findAll();
  }

  @Get('claims/:id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  findOne(@Param('id') id: string) {
    return this.insuranceService.findOne(id);
  }

  @Delete('claims/:id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteInsuranceClaimDto) {
    return this.insuranceService.remove(id, req.user?.id || 'SYSTEM', dto);
  }
}
