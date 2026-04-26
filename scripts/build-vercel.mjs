import { build } from "esbuild";
import { existsSync, mkdirSync, cpSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const vercelOut = join(root, ".vercel/output");
const staticDir = join(vercelOut, "static");
const funcDir = join(vercelOut, "functions/index.func");

async function main() {
  console.log("Building Vercel output structure...");

  mkdirSync(staticDir, { recursive: true });
  mkdirSync(funcDir, { recursive: true });

  // Copy static client assets
  const clientDist = join(root, "dist/client");
  if (existsSync(clientDist)) {
    cpSync(clientDist, staticDir, { recursive: true });
    console.log("✓ Copied static assets to .vercel/output/static/");
  }

  // Bundle server with esbuild - bundle all dependencies into a single file
  const serverEntry = join(root, "dist/server/server.js");
  if (existsSync(serverEntry)) {
    console.log("Bundling server with esbuild...");
    await build({
      entryPoints: [serverEntry],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "esm",
      outfile: join(funcDir, "server.js"),
      external: ["node:*"],
    });
    console.log("✓ Bundled server to function directory");
  }

  // Create the Vercel function entry point
  const funcEntry = `import server from "./server.js";

export default async function handler(req) {
  return server.fetch(req);
}

export const config = {
  runtime: "nodejs22.x",
};
`;
  writeFileSync(join(funcDir, "index.mjs"), funcEntry);
  console.log("✓ Created function entry: index.mjs");

  // Vercel function config
  writeFileSync(join(funcDir, ".vc-config.json"), JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: true,
  }, null, 2));
  console.log("✓ Created .vc-config.json");

  // Vercel routing config
  writeFileSync(join(vercelOut, "config.json"), JSON.stringify({
    version: 3,
    routes: [
      { src: "^/assets/(.*)$", headers: { "Cache-Control": "public, max-age=31536000, immutable" }, continue: true },
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
