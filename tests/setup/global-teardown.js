const { PrismaClient } = require("@prisma/client");

module.exports = async function globalTeardown() {
  console.log("\n[globalTeardown] cleaning up test database…");
  if (!process.env.DATABASE_URL) return;

  try {
    const prisma = new PrismaClient();

    // For PostgreSQL, we'll disconnect from the database
    // You can also drop all tables or truncate them if needed
    await prisma.$disconnect();

    console.log("[globalTeardown] done");
  } catch (e) {
    console.error("[globalTeardown] error:", e);
  }
};