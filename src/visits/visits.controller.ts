import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole, VisitStatus } from '../domain/enums';
import { IsEnum } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitsService } from './visits.service';

class TransitionVisitDto {
  @IsEnum(VisitStatus)
  status!: VisitStatus;
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

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)
  transition(@Param('id') id: string, @Body() dto: TransitionVisitDto) {
    return this.visitsService.transition(id, dto.status);
  }
}