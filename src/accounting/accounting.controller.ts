import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateJournalEntryDto, CreateVoucherDto, DeleteAccountingVoucherDto } from './dto/accounting.dto';
import { AccountingService } from './accounting.service';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('vouchers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  createVoucher(@Request() req: any, @Body() dto: CreateVoucherDto) {
    return this.accountingService.createVoucher(req.user?.id || 'SYSTEM', dto);
  }

  @Post('vouchers/:id/approve')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT)
  approveVoucher(@Param('id') id: string, @Request() req: any) {
    return this.accountingService.approveVoucher(id, req.user?.id || 'SYSTEM');
  }

  @Post('journal-entries')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  postJournalEntry(@Request() req: any, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.postJournalEntry(req.user?.id || 'SYSTEM', dto);
  }

  @Get('ledger')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  getGeneralLedger() {
    return this.accountingService.getGeneralLedger();
  }

  @Get('vouchers')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  findAllVouchers() {
    return this.accountingService.findAllVouchers();
  }

  @Get('journal-entries')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.CHIEF_ACCOUNTANT)
  findAllJournalEntries() {
    return this.accountingService.findAllJournalEntries();
  }

  @Delete('vouchers/:id')
  @Roles(UserRole.ADMIN)
  removeVoucher(@Param('id') id: string, @Request() req: any, @Body() dto: DeleteAccountingVoucherDto) {
    return this.accountingService.removeVoucher(id, req.user?.id || 'SYSTEM', dto);
  }
}
