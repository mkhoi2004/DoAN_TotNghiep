import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CompleteSterilizationCycleDto,
  CreateSterilizationCycleDto,
  DeleteSterilizationCycleDto,
  PackInstrumentDto,
} from './dto/sterilization.dto';
import { SterilizationService } from './sterilization.service';

@Controller('sterilization')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SterilizationController {
  constructor(private readonly sterilizationService: SterilizationService) {}

  @Post('cycles')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ASSISTANT)
  createCycle(@Body() dto: CreateSterilizationCycleDto) {
    return this.sterilizationService.createCycle(dto);
  }

  @Post('cycles/:id/complete')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ASSISTANT)
  completeCycle(@Param('id') id: string, @Body() dto: CompleteSterilizationCycleDto) {
    return this.sterilizationService.completeCycle(id, dto);
  }

  @Post('packs')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ASSISTANT)
  packInstrument(@Body() dto: PackInstrumentDto) {
    return this.sterilizationService.packInstrument(dto);
  }

  @Get('packs/verify/:packCode')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.ASSISTANT, UserRole.INVENTORY_MANAGER)
  verifyPack(@Param('packCode') packCode: string) {
    return this.sterilizationService.verifyPack(packCode);
  }

  @Get('cycles')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ASSISTANT)
  findAllCycles() {
    return this.sterilizationService.findAllCycles();
  }

  @Get('packs')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ASSISTANT)
  findAllPacks() {
    return this.sterilizationService.findAllPacks();
  }

  @Delete('cycles/:id')
  @Roles(UserRole.ADMIN)
  removeCycle(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteSterilizationCycleDto) {
    return this.sterilizationService.removeCycle(id, req.user?.id || 'SYSTEM', dto);
  }
}
