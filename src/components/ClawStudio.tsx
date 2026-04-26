import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Download,
  LoaderCircle,
  MonitorPlay,
  Rocket,
  Sparkles,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { useMemo, type ComponentType } from "react";
import { create } from "zustand";

type DeployTarget = "preview" | "local" | "vps";

type StudioState = {
  prompt: string;
  previewUrl: string;
  loadingTarget: DeployTarget | null;
  status: { type: "success" | "error"; message: string } | null;
  setPrompt: (prompt: string) => void;
  setPreviewUrl: (previewUrl: string) => void;
  setLoadingTarget: (target: DeployTarget | null) => void;
  setStatus: (status: StudioState["status"]) => void;
};

const useStudioStore = create<StudioState>((set) => ({
  prompt:
    "Build a premium SaaS sales site for an AI workflow tool with pricing cards, testimonials, and a conversion-focused hero. Include a bold cyber-lobster visual theme.",
  previewUrl: "https://example.com",
  loadingTarget: null,
  status: null,
  setPrompt: (prompt) => set({ prompt }),
  setPreviewUrl: (previewUrl) => set({ previewUrl }),
  setLoadingTarget: (loadingTarget) => set({ loadingTarget }),
  setStatus: (status) => set({ status }),
}));

const TARGETS: Array<{ target: DeployTarget; label: string; icon: ComponentType<{ className?: string }> }> = [
  { target: "preview", label: "Preview Site", icon: MonitorPlay },
  { target: "local", label: "Download Local Agent", icon: Download },
  { target: "vps", label: "Deploy to VPS", icon: Rocket },
];

async function parseApiError(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    if (data?.error) {
      return data.error;
    }
  }

  const text = await response.text().catch(() => "");
  return text || "Claw deploy request failed.";
}

function fileNameWithTimestamp(base: string, extension: string): string {
  const stamp = new Date().toISOString().replace(/[.:]/g, "-");
  return `${base}-${stamp}.${extension}`;
}

export function ClawStudio() {
  const { prompt, previewUrl, loadingTarget, status, setPrompt, setPreviewUrl, setLoadingTarget, setStatus } =
    useStudioStore();

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !loadingTarget, [prompt, loadingTarget]);

  const runClawDeploy = async (target: DeployTarget) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setStatus({ type: "error", message: "Prompt is required before vibing the lobster agent." });
      return;
    }

    setLoadingTarget(target);
    setStatus(null);

    try {
      const response = await fetch("/api/claw-deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, application/zip, application/octet-stream",
        },
        body: JSON.stringify({ prompt: cleanPrompt, target }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (target === "local" && (contentType.includes("application/zip") || contentType.includes("application/octet-stream"))) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = downloadUrl;
        anchor.download = fileNameWithTimestamp("clawvibe-agent", "zip");
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        setStatus({ type: "success", message: "Local OpenClaw agent bundle downloaded." });
        return;
      }

      const data = (await response.json()) as {
        previewUrl?: string;
        deployStatus?: string;
        message?: string;
      };

      if (target === "preview") {
        if (!data.previewUrl) {
          throw new Error("Gateway did not return a preview URL.");
        }
        setPreviewUrl(data.previewUrl);
        setStatus({ type: "success", message: "Preview generated and loaded in the live frame." });
        return;
      }

      if (target === "vps") {
        setStatus({
          type: "success",
          message: data.message ?? data.deployStatus ?? "VPS deployment started. Monitor your OpenClaw logs.",
        });
        return;
      }

      throw new Error("Unexpected API response.");
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown deployment error.",
      });
    } finally {
      setLoadingTarget(null);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-49px)] overflow-hidden bg-[#05070a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-cyan-400/30 blur-[160px]" />
        <div className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/25 blur-[170px]" />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-49px)] w-full max-w-[1800px] flex-col px-4 py-6 md:px-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Dark Cyber-Lobster Runtime</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Vibe to website + agent bundle{" "}
            <span className="text-cyan-300">in one command</span>
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Type a prompt, click a button — get a live preview, a local bundle, or a live VPS deploy.
          </p>
        </motion.div>

        <div className="grid min-h-[70vh] flex-1 gap-4 md:gap-6 lg:grid-cols-[1.1fr_1fr]">
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
            className="flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_0_90px_-35px_rgba(45,212,191,0.65)] backdrop-blur-2xl md:p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Prompt Composer</p>
                <h2 className="mt-1 text-xl font-semibold md:text-2xl">Describe the sales site and agent behavior</h2>
              </div>
              <Bot className="h-7 w-7 text-cyan-300" />
            </div>

            <label htmlFor="claw-prompt" className="mb-2 text-sm text-white/70">
              Prompt
            </label>
            <textarea
              id="claw-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Create a conversion-optimized site for..."
              className="min-h-[220px] w-full flex-1 resize-y rounded-2xl border border-white/15 bg-black/35 px-4 py-3 font-mono text-sm leading-relaxed text-white outline-none ring-0 transition focus:border-cyan-300/65 focus:shadow-[0_0_0_3px_rgba(34,211,238,0.18)]"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {TARGETS.map(({ target, label, icon: Icon }) => {
                const active = loadingTarget === target;
                return (
                  <button
                    key={target}
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => runClawDeploy(target)}
                    className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-left transition hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-300/25 blur-2xl" />
                    </div>
                    <div className="relative flex items-center gap-2 text-sm font-medium">
                      {active ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                      <span>{active ? "Vibing..." : label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {status ? (
                <motion.div
                  key={status.message}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`mt-4 flex items-start gap-2 rounded-2xl border px-3 py-2 text-sm ${
                    status.type === "success"
                      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
                      : "border-rose-300/45 bg-rose-500/10 text-rose-100"
                  }`}
                >
                  {status.type === "success" ? (
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <p>{status.message}</p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-black/30 shadow-[0_0_90px_-38px_rgba(167,139,250,0.75)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-5">
              <div className="flex items-center gap-2 text-sm text-cyan-100">
                <Terminal className="h-4 w-4" />
                <span>Live Sales Site Preview</span>
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs uppercase tracking-[0.16em] text-cyan-300/90 transition hover:text-cyan-100"
              >
                Open Full Tab
              </a>
            </div>

            <div className="relative flex-1 bg-black/70">
              <iframe
                title="ClawVibe Live Preview"
                src={previewUrl}
                className="h-full min-h-[420px] w-full"
                loading="lazy"
              />
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
