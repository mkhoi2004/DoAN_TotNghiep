require('dotenv/config');

const bcrypt = require('bcrypt');
const { PrismaMssql } = require('@prisma/adapter-mssql');
const { PrismaClient } = require('@prisma/client');

const accounts = [
  { username: 'Admin', displayName: 'Quản trị viên', role: 'ADMIN', password: 'Admin1234@' },
  { username: 'TiepNhan', displayName: 'Nhân viên tiếp nhận', role: 'RECEPTIONIST', password: 'TiepNhan1234@' },
  { username: 'BacSi', displayName: 'Bác sĩ điều trị', role: 'DOCTOR', password: 'BacSi1234@' },
  { username: 'PhuTa', displayName: 'Phụ tá điều dưỡng', role: 'ASSISTANT', password: 'PhuTa1234@' },
  { username: 'Ketoan', displayName: 'Kế toán viên', role: 'ACCOUNTANT', password: 'Ketoan1234@' },
  { username: 'KeToanTruong', displayName: 'Kế toán trưởng', role: 'CHIEF_ACCOUNTANT', password: 'KeToanTruong1234@' },
  { username: 'Kho', displayName: 'Quản lý kho', role: 'INVENTORY_MANAGER', password: 'Kho12345@' },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaMssql(process.env.DATABASE_URL) });
  try {
    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, 12);
      await prisma.user.upsert({
        where: { username: account.username },
        update: { displayName: account.displayName, role: account.role },
        create: { username: account.username, displayName: account.displayName, role: account.role, passwordHash },
      });
    }
    console.log(`Seeded ${accounts.length} role accounts.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});