import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @lovable.dev/vite-tanstack-config already includes TanStack Start + React + Tailwind + TS paths.
// cloudflare: false prevents the Cloudflare worker plugin from being injected during Vercel builds.
// The Nitro deployment preset is controlled via NITRO_PRESET env var (set in vercel.json build command).
export default defineConfig({
  cloudflare: false,
});
