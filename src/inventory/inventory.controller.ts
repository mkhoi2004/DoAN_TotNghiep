import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateItemDto } from './dto/create-item.dto';
import { ReceiveLotDto } from './dto/receive-lot.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('lots')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.DOCTOR, UserRole.ASSISTANT)
  listLots() { return this.inventoryService.listLots(); }

  @Post('items')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  createItem(@Body() dto: CreateItemDto) { return this.inventoryService.createItem(dto); }

  @Post('lots')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER)
  receiveLot(@Body() dto: ReceiveLotDto) { return this.inventoryService.receiveLot(dto); }

  @Post('reservations')
  @Roles(UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.DOCTOR, UserRole.ASSISTANT)
  reserve(@Body() dto: ReserveStockDto) { return this.inventoryService.reserve(dto); }

  @Post('reservations/:id/consume')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  consume(@Param('id') id: string) { return this.inventoryService.consume(id); }

  @Post('reservations/:id/release')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR, UserRole.INVENTORY_MANAGER)
  release(@Param('id') id: string) { return this.inventoryService.release(id); }
}