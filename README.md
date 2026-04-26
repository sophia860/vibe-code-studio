# 🦞 ClawVibe Studio

<div align="center">

### Vibe → Real OpenClaw Agent in 60 seconds

**Type a prompt. Get a live preview, a local agent bundle, or a full VPS deploy.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
&nbsp;
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://github.com/codespaces/new)

</div>

---

## What it does

| Action | Result |
|---|---|
| **Preview Site** | Generates a full site and loads it in the live iframe |
| **Download Local Agent** | Streams a `.zip` OpenClaw agent bundle to your machine |
| **Deploy to VPS** | Triggers a live VPS deployment via your OpenClaw gateway |

## Aesthetic

Dark cyber-lobster theme: near-black `#05070a` background, cyan `#22f0ff` glow, fuchsia purple accent, glassmorphism panels, dot-grid texture, framer-motion animations.

## Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19 + Vite) |
| Routing | TanStack Router (file-based) |
| UI | shadcn/ui + Tailwind v4 |
| Animation | framer-motion |
| State | Zustand |
| Runtime | Bun |
| Deploy | Cloudflare Workers / Vercel |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/sophia860/vibe-code-studio
cd vibe-code-studio

# 2. Install
bun install

# 3. (Optional) Point at your OpenClaw gateway
export OPENCLAW_GATEWAY_URL="http://YOUR_VPS_IP:3001"
export OPENCLAW_GATEWAY_TOKEN="YOUR_GATEWAY_TOKEN"

# 4. Run
bun run dev
# → http://localhost:3000
```

---

## OpenClaw Gateway Setup

The frontend POSTs to `/api/claw-deploy` → forwarded to your OpenClaw backend.

### 1 · Deploy the gateway script on your VPS

```bash
# On your VPS (Ubuntu/Debian) — run as root
bash <(curl -fsSL https://raw.githubusercontent.com/sophia860/vibe-code-studio/main/clawgateway)
```

The script:
- Installs OpenClaw + Node.js
- Exposes a REST API on port `3001`
- Generates a secure random `CLAW_GATEWAY_TOKEN`
- Sets up `nginx` reverse proxy + optional TLS via certbot
- Exposes both `POST /api/claw-deploy` and legacy `POST /generate`

### 2 · Set environment variable

```bash
# Local dev
export OPENCLAW_GATEWAY_URL="http://YOUR_VPS_IP:3001"
export OPENCLAW_GATEWAY_TOKEN="YOUR_GATEWAY_TOKEN"

# Production (Vercel / Cloudflare)
# Add OPENCLAW_GATEWAY_URL and OPENCLAW_GATEWAY_TOKEN in the deployment dashboard
```

### 3 · API contract

**Request**
```json
POST /api/claw-deploy
Content-Type: application/json

{
  "prompt": "Build a conversion-focused SaaS sales site for an AI CRM...",
  "target": "preview"
}
```

`target` is one of: `preview` · `local` · `vps`

**Responses**

| `target` | Response |
|---|---|
| `preview` | `{ "previewUrl": "https://..." }` |
| `local` | Binary zip stream — downloaded automatically |
| `vps` | `{ "deployStatus": "queued", "message": "..." }` |

The studio proxy sends the gateway token as both `Authorization: Bearer ...` and `X-API-Token` for compatibility with the bridge.

---

## Attribution

Every generation request automatically injects:

> **Built with [VibeCode Studio](https://vibe-code-studio.vercel.app)**

in the generated site footer and bundle docs. Derivative agents inherit this rule.

---

## Notes

- If the gateway is unreachable, preview/VPS calls return graceful fallback responses.
- Local bundle downloads require a live OpenClaw gateway.
- All input is validated server-side before forwarding to the gateway.
