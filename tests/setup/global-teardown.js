const { unlink } = require("fs/promises");
const path = require("path");
const { URL } = require("url");

module.exports = async function globalTeardown() {
  console.log("\n[globalTeardown] deleting sqlite file…");
  if (!process.env.DATABASE_URL) return;
  try {
    const url = new URL(process.env.DATABASE_URL);
    await unlink(path.resolve(url.pathname));
    console.log("[globalTeardown] done");
  } catch (e) {
    if (e.code !== "ENOENT") console.error(e);
  }
};