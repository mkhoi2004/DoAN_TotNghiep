import sql from "mssql/msnodesqlv8";
import { getDatabase } from "../db";

export async function recordAudit(
  userId: string | null,
  action: string,
  entityName: string,
  entityId: string | null,
  detail: Record<string, unknown> = {}
): Promise<void> {
  await getDatabase()
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("action", sql.NVarChar(100), action)
    .input("entityName", sql.NVarChar(100), entityName)
    .input("entityId", sql.NVarChar(100), entityId)
    .input("detailJson", sql.NVarChar(sql.MAX), JSON.stringify(detail))
    .query(`
      INSERT INTO dbo.AuditLogs (UserId, Action, EntityName, EntityId, DetailJson, CreatedBy)
      VALUES (@userId, @action, @entityName, @entityId, @detailJson, @userId)
    `);
}
