process.env.JWT_SECRET ??= "test-only-jwt-secret-not-for-production-00000000";
process.env.PII_ENCRYPTION_KEY ??= "1".repeat(64);
process.env.PII_HASH_KEY ??= "2".repeat(64);
process.env.DB_SERVER ??= "test-server";
process.env.DB_DATABASE ??= "test-database";
