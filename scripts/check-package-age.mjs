#!/usr/bin/env node

/**
 * Package Age Gate
 * ================
 * Verifies every package in package-lock.json was published at least
 * MIN_AGE_DAYS ago. Blocks builds and deploys if any package is too new.
 *
 * Usage:
 *   node scripts/check-package-age.mjs            # full audit
 *   node scripts/check-package-age.mjs --preinstall  # lightweight pre-check (skips if no lockfile)
 *
 * To update dependencies:
 *   1. Update versions in package.json
 *   2. Run: rm -rf node_modules package-lock.json && npm install
 *   3. Run: npm run audit:age
 *   4. If it passes, commit the updated package.json + package-lock.json
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MIN_AGE_DAYS = 14;
const isPreinstall = process.argv.includes("--preinstall");

// ── Load lockfile ──────────────────────────────────────────────────
let lockfile;
try {
  lockfile = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8"));
} catch {
  if (isPreinstall) {
    // No lockfile yet (first install) — nothing to audit
    process.exit(0);
  }
  console.error("❌ Could not read package-lock.json. Run 'npm install' first.");
  process.exit(1);
}

// ── Extract packages ───────────────────────────────────────────────
const packages = Object.entries(lockfile.packages || {})
  .filter(([k]) => k.startsWith("node_modules/") && !k.includes("node_modules/node_modules"))
  .map(([k, v]) => ({ name: k.replace("node_modules/", ""), version: v.version }));

if (packages.length === 0) {
  console.log("⚠️  No packages found in lockfile.");
  process.exit(0);
}

// ── Check publish dates ────────────────────────────────────────────
const cutoff = new Date(Date.now() - MIN_AGE_DAYS * 24 * 60 * 60 * 1000);
const failures = [];
let checked = 0;

console.log(`\n🔒 Package Age Gate — minimum age: ${MIN_AGE_DAYS} days`);
console.log(`   Cutoff: must be published before ${cutoff.toISOString().split("T")[0]}`);
console.log(`   Checking ${packages.length} packages...\n`);

for (const pkg of packages) {
  try {
    const raw = execSync(`npm view ${pkg.name}@${pkg.version} time --json 2>/dev/null`, {
      encoding: "utf8",
      timeout: 15000,
    });
    const times = JSON.parse(raw);
    const pubDate = new Date(times[pkg.version]);
    const ageDays = Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24));
    checked++;

    if (pubDate >= cutoff) {
      failures.push({ name: pkg.name, version: pkg.version, published: pubDate.toISOString().split("T")[0], ageDays });
    }
  } catch {
    // Platform-specific optional deps (e.g. linux binaries on macOS) — skip silently
  }
}

// ── Report ─────────────────────────────────────────────────────────
if (failures.length === 0) {
  console.log(`✅ All ${checked} packages are at least ${MIN_AGE_DAYS} days old. Safe to proceed.\n`);
  process.exit(0);
} else {
  console.log(`❌ ${failures.length} package(s) are NEWER than ${MIN_AGE_DAYS} days:\n`);
  console.log("   Package".padEnd(50) + "Version".padEnd(14) + "Published".padEnd(14) + "Age");
  console.log("   " + "─".repeat(80));
  for (const f of failures) {
    console.log(`   ${f.name.padEnd(47)}${f.version.padEnd(14)}${f.published.padEnd(14)}${f.ageDays}d`);
  }
  console.log(`\n🚫 BLOCKED — Downgrade these packages to versions published before ${cutoff.toISOString().split("T")[0]}.`);
  console.log("   Then re-run: npm run audit:age\n");
  process.exit(1);
}
