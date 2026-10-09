import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { closeDatabase, connectDatabase } from "./db";
import { errorHandler } from "./middleware/errors";
import authRoutes from "./features/auth/routes";
import cashierRoutes from "./features/cashier/routes";
import clinicalRoutes from "./features/emr/routes";
import erpRoutes from "./features/erp/routes";
import operationsRoutes from "./features/operations/routes";
import reservationRoutes from "./features/inventory/reservations";

async function start(): Promise<void> {
  await connectDatabase();
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: false }));
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes);
  app.use("/api", clinicalRoutes);
  app.use("/api", cashierRoutes);
  app.use("/api", operationsRoutes);
  app.use("/api", reservationRoutes);
  app.use("/api", erpRoutes);
  app.use(errorHandler);

  const server = app.listen(config.PORT, () => {
    console.log(`ERP API listening on port ${config.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error: unknown) => {
  console.error("Failed to start ERP API", error);
  process.exitCode = 1;
});
