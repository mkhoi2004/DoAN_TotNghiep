import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePatientDto } from './dto/create-patient.dto';
import { DeletePatientDto, UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.DOCTOR,
    UserRole.ASSISTANT,
    UserRole.ACCOUNTANT,
    UserRole.CHIEF_ACCOUNTANT,
  )
  findAll() {
    return this.patientsService.findAll();
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.RECEPTIONIST,
    UserRole.DOCTOR,
    UserRole.ASSISTANT,
    UserRole.ACCOUNTANT,
    UserRole.CHIEF_ACCOUNTANT,
  )
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req: any, @Body() dto: DeletePatientDto) {
    return this.patientsService.remove(id, req.user?.id || 'SYSTEM', dto);
  }
}