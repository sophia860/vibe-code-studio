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

  const clientDist = join(root, "dist/client");
  if (existsSync(clientDist)) {
    cpSync(clientDist, staticDir, { recursive: true });
    console.log("✓ Copied static assets to .vercel/output/static/");
  }

  const serverEntry = join(root, "dist/server/server.js");
  if (existsSync(serverEntry)) {
    console.log("Bundling server with esbuild (CJS)...");
    await build({
      entryPoints: [serverEntry],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "cjs",
      outfile: join(funcDir, "server.cjs"),
      external: ["node:*"],
    });
    console.log("✓ Bundled server to function directory (server.cjs)");
  }

  // index.mjs - properly convert Node.js IncomingMessage to web Request
  const funcEntry = `import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serverModule = require("./server.cjs");
const server = serverModule.default || serverModule;

export default async function handler(req, res) {
  // Build full URL from Node.js IncomingMessage
  const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const url = \`\${proto}://\${host}\${req.url || '/'}\`;

  // Build headers
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val);
  }

  // Read body for POST/PUT/PATCH
  let body = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
    if (body.length === 0) body = undefined;
  }

  const webReq = new Request(url, {
    method: req.method,
    headers,
    body,
    duplex: body ? 'half' : undefined,
  });

  const webRes = await server.fetch(webReq);

  res.statusCode = webRes.status;
  for (const [key, val] of webRes.headers.entries()) {
    res.setHeader(key, val);
  }
  const buf = await webRes.arrayBuffer();
  res.end(Buffer.from(buf));
}

export const config = {
  runtime: "nodejs22.x",
};
`;
  writeFileSync(join(funcDir, "index.mjs"), funcEntry);
  console.log("✓ Created function entry: index.mjs");

  writeFileSync(join(funcDir, ".vc-config.json"), JSON.stringify({
    runtime: "nodejs22.x",
    handler: "index.mjs",
    launcherType: "Nodejs",
    shouldAddHelpers: false,
  }, null, 2));
  console.log("✓ Created .vc-config.json");

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
}

main().catch((err) => {
  console.error("Vercel build script failed:", err);
  process.exit(1);
});
