const { execSync } = require("child_process");

module.exports = async function globalSetup() {
  console.log("\n[globalSetup] wiping & pushing schema…");

  // For PostgreSQL, use Prisma's force-reset to drop and recreate schema
  execSync("npx prisma db push --force-reset", { stdio: "inherit" });

  // SEED ONCE HERE, not per-worker
  console.log("[globalSetup] seeding test data…");
  execSync("npx tsx prisma/test-seed.ts", { stdio: "inherit" });

  console.log("[globalSetup] done");
};