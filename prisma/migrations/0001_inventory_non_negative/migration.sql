ALTER TABLE [StockLot] ADD CONSTRAINT [CK_StockLot_QuantityOnHand_NonNegative] CHECK ([quantityOnHand] >= 0);
ALTER TABLE [StockLot] ADD CONSTRAINT [CK_StockLot_QuantityReserved_NonNegative] CHECK ([quantityReserved] >= 0);
ALTER TABLE [StockLot] ADD CONSTRAINT [CK_StockLot_ReservedNotAboveOnHand] CHECK ([quantityReserved] <= [quantityOnHand]);
ALTER TABLE [StockLot] ADD CONSTRAINT [CK_StockLot_UnitCost_NonNegative] CHECK ([unitCost] >= 0);
ALTER TABLE [StockReservation] ADD CONSTRAINT [CK_StockReservation_Quantity_Positive] CHECK ([quantity] > 0);