const { execSync } = require("child_process");

module.exports = async function globalSetup() {
  console.log("\n[globalSetup] wiping & pushing schema…");
  
  // ensure we really reset
  const fs = require("fs");
  const { URL } = require("url");
  const url = new URL(process.env.DATABASE_URL);
  const file = url.pathname;
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }

  // recreate schema
  execSync("npx prisma db push --force-reset", { stdio: "inherit" });
  
  // SEED ONCE HERE, not per-worker
  console.log("[globalSetup] seeding test data…");
  execSync("npx tsx prisma/test-seed.ts", { stdio: "inherit" });
  
  console.log("[globalSetup] done");
};