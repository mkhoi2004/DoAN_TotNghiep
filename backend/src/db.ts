import sql from "mssql/msnodesqlv8";
import { config } from "./config";

const poolConfiguration = {
  server: config.DB_SERVER,
  database: config.DB_DATABASE,
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: config.DB_TRUST_SERVER_CERTIFICATE === "true"
  }
} satisfies sql.config;

Object.assign(poolConfiguration, {
  connectionString: [
    `Driver=${config.DB_DRIVER}`,
    `Server=${config.DB_SERVER}`,
    `Database=${config.DB_DATABASE}`,
    "Trusted_Connection=Yes",
    `TrustServerCertificate=${config.DB_TRUST_SERVER_CERTIFICATE === "true" ? "Yes" : "No"}`
  ].join(";")
});

const pool = new sql.ConnectionPool(poolConfiguration);

export async function connectDatabase(): Promise<sql.ConnectionPool> {
  if (!pool.connected) {
    await pool.connect();
  }
  return pool;
}

export function getDatabase(): sql.ConnectionPool {
  if (!pool.connected) {
    throw new Error("Database connection has not been established");
  }
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool.connected) {
    await pool.close();
  }
}
