#!/usr/bin/env node
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const vaultDir = dirname(fileURLToPath(import.meta.url));
const script = join(vaultDir, "..", "scripts", "update-tables.mjs");

function run(dir) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [script, dir], { stdio: "inherit" });
    p.on("close", resolve);
  });
}

await run(join(vaultDir, "systemy"));
await run(join(vaultDir, "scenariusze"));
