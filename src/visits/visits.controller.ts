import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole, VisitStatus } from '../domain/enums';
import { IsEnum, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitsService } from './visits.service';

class TransitionVisitDto {
  @IsEnum(VisitStatus)
  status!: VisitStatus;
}

class DeleteVisitDto {
  @IsString()
  reason!: string;
}

@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  create(@Body() dto: CreateVisitDto) {
    return this.visitsService.create(dto);
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
    return this.visitsService.findAll();
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
    return this.visitsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  transition(@Param('id') id: string, @Body() dto: TransitionVisitDto) {
    return this.visitsService.transition(id, dto.status);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteVisitDto) {
    return this.visitsService.remove(id, req.user?.id || 'SYSTEM', dto.reason);
  }
}