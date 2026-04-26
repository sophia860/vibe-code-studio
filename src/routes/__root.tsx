import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070a] px-4 text-white">
      <div className="max-w-md text-center">
        <span className="text-6xl" aria-hidden="true">🦞</span>
        <h1 className="mt-4 text-7xl font-bold text-cyan-300">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-white/60">
          This claw reached too far. The page doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/40 bg-cyan-300/10 px-5 py-2.5 text-sm font-medium text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-300/20"
          >
            Back to Studio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClawNavbar() {
  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#05070a]/80 px-4 py-3 backdrop-blur-xl md:px-8"
      aria-label="ClawVibe Studio navigation"
    >
      <Link to="/" className="flex items-center gap-2.5 no-underline" aria-label="ClawVibe Studio home">
        <span className="text-xl" aria-hidden="true">🦞</span>
        <span className="text-sm font-semibold tracking-wide text-white">
          ClawVibe<span className="text-cyan-300"> Studio</span>
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-white/50 sm:flex">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"
            aria-hidden="true"
          />
          OpenClaw Gateway
        </span>
        <a
          href="https://github.com/sophia860/vibe-code-studio"
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-cyan-300/40 hover:text-cyan-200"
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClawVibe Studio" },
      { name: "description", content: "Vibe -> Real OpenClaw Agent in 60 seconds" },
      { name: "author", content: "ClawVibe Studio" },
      { property: "og:title", content: "ClawVibe Studio" },
      { property: "og:description", content: "Vibe -> Real OpenClaw Agent in 60 seconds" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@OpenClaw" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[#05070a] font-mono text-white antialiased">
        <ClawNavbar />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
