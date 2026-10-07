import { Module } from '@nestjs/common';
import { SterilizationController } from './sterilization.controller';
import { SterilizationService } from './sterilization.service';

@Module({
  controllers: [SterilizationController],
  providers: [SterilizationService],
  exports: [SterilizationService],
})
export class SterilizationModule {}
