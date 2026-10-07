import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountingModule } from './accounting/accounting.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { PrismaModule } from './database/prisma.module';
import { EmrModule } from './emr/emr.module';
import { InsuranceModule } from './insurance/insurance.module';
import { InventoryModule } from './inventory/inventory.module';
import { LabModule } from './lab/lab.module';
import { PatientsModule } from './patients/patients.module';
import { SterilizationModule } from './sterilization/sterilization.module';
import { VisitsModule } from './visits/visits.module';
import { WarrantyModule } from './warranty/warranty.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EmrModule,
    BillingModule,
    InventoryModule,
    PatientsModule,
    VisitsModule,
    InsuranceModule,
    LabModule,
    SterilizationModule,
    AccountingModule,
    WarrantyModule,
  ],
})
export class AppModule {}