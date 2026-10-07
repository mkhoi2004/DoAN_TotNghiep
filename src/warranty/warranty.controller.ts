import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateWarrantyDto, DeleteWarrantyDto } from './dto/warranty.dto';
import { WarrantyService } from './warranty.service';

@Controller('warranty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WarrantyController {
  constructor(private readonly warrantyService: WarrantyService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  createWarranty(@Body() dto: CreateWarrantyDto) {
    return this.warrantyService.createWarranty(dto);
  }

  @Get('check/:warrantyCode')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT)
  checkWarranty(@Param('warrantyCode') warrantyCode: string) {
    return this.warrantyService.checkWarranty(warrantyCode);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT)
  findAll() {
    return this.warrantyService.findAll();
  }

  @Get('patient/:patientId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.RECEPTIONIST)
  findByPatient(@Param('patientId') patientId: string) {
    return this.warrantyService.findByPatient(patientId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  removeWarranty(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteWarrantyDto) {
    return this.warrantyService.removeWarranty(id, req.user?.id || 'SYSTEM', dto);
  }
}
