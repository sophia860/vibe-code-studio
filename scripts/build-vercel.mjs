#!/usr/bin/env node
/**
 * Post-build script: converts TanStack Start dist/ output into
 * Vercel Build Output API v3 format (.vercel/output/).
 * 
 * The dist/server/server.js default export has a .fetch(request) method
 * (Web Fetch API compatible), so we can use it directly.
 */
import { mkdir, cp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const vercelOut = path.join(root, ".vercel/output");
const staticDir = path.join(vercelOut, "static");
const funcDir = path.join(vercelOut, "functions/index.func");

async function main() {
  console.log("Building Vercel output structure...");

  await mkdir(staticDir, { recursive: true });
  await mkdir(funcDir, { recursive: true });

  // Copy static client assets
  const clientDist = path.join(root, "dist/client");
  if (existsSync(clientDist)) {
    await cp(clientDist, staticDir, { recursive: true });
    console.log("✓ Copied static assets to .vercel/output/static/");
  }

  // Copy server bundle
  const serverDist = path.join(root, "dist/server");
  if (existsSync(serverDist)) {
    await cp(serverDist, funcDir, { recursive: true });
    console.log("✓ Copied server bundle to function directory");
  }

  // Create the Vercel function entry point
  // server.js default export has a .fetch(Request) => Response method
  const funcEntry = `
import server from "./server.js";

export default async function handler(req) {
  return server.fetch(req);
}

export const config = {
  runtime: "nodejs22.x",
};
`.trim();

  await writeFile(path.join(funcDir, "index.mjs"), funcEntry);
  console.log("✓ Created function entry: index.mjs");

  // Vercel function config
  await writeFile(path.join(funcDir, ".vc-config.json"), JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
  }, null, 2));
  console.log("✓ Created .vc-config.json");

  // Vercel routing config - serve static assets, route everything else to function
  await writeFile(path.join(vercelOut, "config.json"), JSON.stringify({
    version: 3,
    routes: [
      {
        src: "^/assets/(.*)$",
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      { handle: "filesystem" },
      { src: "/(.*)", dest: "/index" },
    ],
  }, null, 2));
  console.log("✓ Created .vercel/output/config.json");

  console.log("\n✅ Vercel output ready at .vercel/output/");
  console.log("   Static: .vercel/output/static/");
  console.log("   Function: .vercel/output/functions/index.func/");
}

main().catch((err) => {
  console.error("Vercel build script failed:", err);
  process.exit(1);
});
