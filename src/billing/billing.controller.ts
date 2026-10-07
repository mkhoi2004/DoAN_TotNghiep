import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../domain/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BillingService } from './billing.service';
import { CloseShiftDto } from './dto/close-shift.dto';
import { OpenShiftDto } from './dto/open-shift.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('shifts/:cashierId/open')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  openShift(@Param('cashierId') cashierId: string, @Body() dto: OpenShiftDto) {
    return this.billingService.openShift(cashierId, dto);
  }

  @Post('payments')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT)
  recordPayment(@Body() dto: RecordPaymentDto) {
    return this.billingService.recordPayment(dto);
  }

  @Post('shifts/:shiftId/close')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  closeShift(@Param('shiftId') shiftId: string, @Body() dto: CloseShiftDto) {
    return this.billingService.closeShift(shiftId, dto);
  }
}