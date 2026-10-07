import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateDentalLabTicketDto, CreateLabReworkCycleDto, DeleteDentalLabTicketDto } from './dto/dental-lab.dto';
import { LabService } from './lab.service';

@Controller('lab')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('tickets')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  createTicket(@Body() dto: CreateDentalLabTicketDto) {
    return this.labService.createTicket(dto);
  }

  @Post('tickets/:id/receive')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.RECEPTIONIST)
  receiveTicket(@Param('id') id: string) {
    return this.labService.receiveTicket(id);
  }

  @Post('tickets/:id/fit')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  fitTicket(@Param('id') id: string) {
    return this.labService.fitTicket(id);
  }

  @Post('rework')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  addReworkCycle(@Body() dto: CreateLabReworkCycleDto) {
    return this.labService.addReworkCycle(dto);
  }

  @Get('tickets')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.RECEPTIONIST)
  findAll() {
    return this.labService.findAll();
  }

  @Get('tickets/:id')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.RECEPTIONIST)
  findOne(@Param('id') id: string) {
    return this.labService.findOne(id);
  }

  @Delete('tickets/:id')
  @Roles(UserRole.ADMIN)
  removeTicket(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteDentalLabTicketDto) {
    return this.labService.removeTicket(id, req.user?.id || 'SYSTEM', dto);
  }
}
