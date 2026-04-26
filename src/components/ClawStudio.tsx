import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Download,
  LoaderCircle,
  Lock,
  MonitorPlay,
  Rocket,
  Sparkles,
  Terminal,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType } from "react";
import { create } from "zustand";

import { FileUpload } from "./FileUpload";
import { UpgradeModal } from "./UpgradeModal";
import { UsageCounter } from "./UsageCounter";
import type { DeployTarget, GateIntent, UploadContext, UsageLedger } from "../types/agent";
import { STRIPE_PAYMENT_LINK, buildStripeCheckoutUrl, isValidEmail } from "../lib/stripe";

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

const TARGETS: Array<{
  target: DeployTarget;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { target: "preview", label: "Preview Site", icon: MonitorPlay },
  { target: "local", label: "Download Local Agent", icon: Download },
  { target: "vps", label: "Deploy to VPS", icon: Rocket },
];

const FREE_PREVIEW_LIMIT = 3;
const BILLING_WINDOW_DAYS = 30;
const MAX_UPLOADS = 4;
const MAX_TEXT_ATTACHMENT_LENGTH = 2_400;
const USAGE_STORAGE_KEY = "claw-studio-usage-v1";

function createUsageLedger(): UsageLedger {
  return {
    cycleStartedAt: new Date().toISOString(),
    previewRuns: 0,
    proUnlocked: false,
    upgradeEmail: "",
    checkoutStartedAt: null,
  };
}

function shouldResetBillingWindow(cycleStartedAt: string): boolean {
  const started = new Date(cycleStartedAt).getTime();
  if (!Number.isFinite(started)) {
    return true;
  }

  const elapsed = Date.now() - started;
  return elapsed >= BILLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function normalizeUsageLedger(rawValue: unknown): UsageLedger {
  const fallback = createUsageLedger();
  if (!rawValue || typeof rawValue !== "object") {
    return fallback;
  }

  const candidate = rawValue as Partial<UsageLedger>;
  const normalized: UsageLedger = {
    cycleStartedAt:
      typeof candidate.cycleStartedAt === "string"
        ? candidate.cycleStartedAt
        : fallback.cycleStartedAt,
    previewRuns:
      typeof candidate.previewRuns === "number" && candidate.previewRuns >= 0
        ? candidate.previewRuns
        : 0,
    proUnlocked: candidate.proUnlocked === true,
    upgradeEmail: typeof candidate.upgradeEmail === "string" ? candidate.upgradeEmail : "",
    checkoutStartedAt:
      typeof candidate.checkoutStartedAt === "string" ? candidate.checkoutStartedAt : null,
  };

  if (shouldResetBillingWindow(normalized.cycleStartedAt)) {
    return {
      ...normalized,
      cycleStartedAt: fallback.cycleStartedAt,
      previewRuns: 0,
    };
  }

  return normalized;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isTextLikeFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    file.type.startsWith("text/") ||
    /\.(md|txt|json|csv|ts|tsx|js|jsx|css|html|svg)$/.test(lowerName)
  );
}

async function fileToUploadContext(file: File): Promise<UploadContext> {
  const sizeLabel = formatBytes(file.size);

  if (!isTextLikeFile(file)) {
    return {
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      sizeLabel,
      excerpt: `Attached visual reference: ${file.name} (${sizeLabel}). Infer layout, art direction, and styling cues from this asset when generating the experience.`,
    };
  }

  const rawText = await file.text();
  const condensedText = rawText.replace(/\s+/g, " ").trim();

  return {
    id: `${file.name}-${file.lastModified}`,
    name: file.name,
    sizeLabel,
    excerpt: condensedText.slice(0, MAX_TEXT_ATTACHMENT_LENGTH),
  };
}

function buildPromptWithUploads(prompt: string, uploads: UploadContext[]): string {
  if (uploads.length === 0) {
    return prompt;
  }

  const attachmentBlock = uploads
    .map(
      (upload, index) =>
        `Attachment ${index + 1}: ${upload.name} (${upload.sizeLabel})\n${upload.excerpt}`,
    )
    .join("\n\n");

  return `${prompt}\n\n[ATTACHMENT_CONTEXT]\nUse the uploaded references below to guide copy, structure, and visual direction.\n\n${attachmentBlock}`;
}

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
  const {
    prompt,
    previewUrl,
    loadingTarget,
    status,
    setPrompt,
    setPreviewUrl,
    setLoadingTarget,
    setStatus,
  } = useStudioStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [usage, setUsage] = useState<UsageLedger>(() => createUsageLedger());
  const [usageReady, setUsageReady] = useState(false);
  const [uploads, setUploads] = useState<UploadContext[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [gateIntent, setGateIntent] = useState<GateIntent>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [upgradeEmailDraft, setUpgradeEmailDraft] = useState("");

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && !loadingTarget,
    [prompt, loadingTarget],
  );
  const freePreviewsRemaining = useMemo(
    () => Math.max(FREE_PREVIEW_LIMIT - usage.previewRuns, 0),
    [usage.previewRuns],
  );
  const usageProgress = useMemo(
    () => Math.min((usage.previewRuns / FREE_PREVIEW_LIMIT) * 100, 100),
    [usage.previewRuns],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let nextUsage = createUsageLedger();
    const savedUsage = window.localStorage.getItem(USAGE_STORAGE_KEY);

    if (savedUsage) {
      try {
        nextUsage = normalizeUsageLedger(JSON.parse(savedUsage));
      } catch {
        nextUsage = createUsageLedger();
      }
    }

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("claw_checkout") === "success") {
      nextUsage = {
        ...nextUsage,
        proUnlocked: true,
      };
      currentUrl.searchParams.delete("claw_checkout");
      window.history.replaceState({}, "", currentUrl.toString());
      setStatus({
        type: "success",
        message: "Pro unlocked for this browser. Premium deploy actions are now live.",
      });
    }

    setUsage(nextUsage);
    setUpgradeEmailDraft(nextUsage.upgradeEmail);
    setUsageReady(true);
  }, [setStatus]);

  useEffect(() => {
    if (!usageReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(usage));
  }, [usage, usageReady]);

  const openUpgradeModal = (target: DeployTarget, reason: string) => {
    setGateIntent({ target, reason });
    setUpgradeModalOpen(true);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    if (uploads.length >= MAX_UPLOADS) {
      setStatus({
        type: "error",
        message: `Freeform context is capped at ${MAX_UPLOADS} attachments per run.`,
      });
      event.target.value = "";
      return;
    }

    try {
      const nextUploads = await Promise.all(
        selectedFiles.slice(0, MAX_UPLOADS - uploads.length).map(fileToUploadContext),
      );
      setUploads((currentUploads) => {
        const merged = [...currentUploads, ...nextUploads];
        const deduped = merged.filter(
          (upload, index, allUploads) =>
            allUploads.findIndex((candidate) => candidate.id === upload.id) === index,
        );
        return deduped.slice(0, MAX_UPLOADS);
      });
      setStatus({ type: "success", message: "Attachment context added to the generation prompt." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Attachment parsing failed.",
      });
    } finally {
      event.target.value = "";
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploads((currentUploads) => currentUploads.filter((upload) => upload.id !== uploadId));
  };

  const startUpgradeCheckout = () => {
    const email = upgradeEmailDraft.trim();
    if (!isValidEmail(email)) {
      setStatus({
        type: "error",
        message: "Enter a valid work email before opening Stripe checkout.",
      });
      return;
    }

    if (!STRIPE_PAYMENT_LINK) {
      setStatus({
        type: "error",
        message: "Set VITE_STRIPE_PAYMENT_LINK to enable live Stripe checkout.",
      });
      return;
    }

    try {
      setCheckoutBusy(true);
      const checkoutUrl = buildStripeCheckoutUrl(STRIPE_PAYMENT_LINK, email);
      setUsage((currentUsage) => ({
        ...currentUsage,
        upgradeEmail: email,
        checkoutStartedAt: new Date().toISOString(),
      }));
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
      setStatus({
        type: "success",
        message:
          "Stripe checkout opened in a new tab. Return here after payment to unlock Pro on this device.",
      });
    } catch {
      setStatus({
        type: "error",
        message: "Stripe checkout link is invalid. Update VITE_STRIPE_PAYMENT_LINK.",
      });
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleActionClick = (target: DeployTarget) => {
    if (!canSubmit) {
      return;
    }

    if (!usage.proUnlocked && target !== "preview") {
      openUpgradeModal(
        target,
        `${TARGETS.find((option) => option.target === target)?.label ?? "This action"} is part of Claw Pro.`,
      );
      return;
    }

    if (!usage.proUnlocked && target === "preview" && freePreviewsRemaining <= 0) {
      openUpgradeModal(
        target,
        `Free tier includes ${FREE_PREVIEW_LIMIT} preview launches every ${BILLING_WINDOW_DAYS} days.`,
      );
      return;
    }

    void runClawDeploy(target);
  };

  const runClawDeploy = async (target: DeployTarget) => {
    const cleanPrompt = buildPromptWithUploads(prompt.trim(), uploads);
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

      if (
        target === "local" &&
        (contentType.includes("application/zip") ||
          contentType.includes("application/octet-stream"))
      ) {
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
        if (!usage.proUnlocked) {
          setUsage((currentUsage) => ({
            ...currentUsage,
            previewRuns: Math.min(currentUsage.previewRuns + 1, FREE_PREVIEW_LIMIT),
          }));
        }
        setStatus({ type: "success", message: "Preview generated and loaded in the live frame." });
        return;
      }

      if (target === "vps") {
        setStatus({
          type: "success",
          message:
            data.message ??
            data.deployStatus ??
            "VPS deployment started. Monitor your OpenClaw logs.",
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
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Dark Cyber-Lobster Runtime</span>
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Vibe to website + agent bundle <span className="text-cyan-300">in one command</span>
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-white/50">
                Free tier gives you live preview launches. Pro unlocks unlimited previews, local
                bundle downloads, and one-click VPS deployment.
              </p>
            </div>

            <UsageCounter
              usage={usage}
              freePreviewsRemaining={freePreviewsRemaining}
              usageProgress={usageProgress}
              onUpgradeClick={() =>
                openUpgradeModal(
                  "preview",
                  "Unlock Claw Pro to remove free-tier friction and ship faster.",
                )
              }
            />
          </div>
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
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                  Prompt Composer
                </p>
                <h2 className="mt-1 text-xl font-semibold md:text-2xl">
                  Describe the sales site and agent behavior
                </h2>
              </div>
              <Bot className="h-7 w-7 text-cyan-300" />
            </div>

            <FileUpload
              uploads={uploads}
              fileInputRef={fileInputRef}
              onUploadClick={handleUploadClick}
              onUploadChange={handleUploadChange}
              onRemoveUpload={removeUpload}
            />

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
                const locked = !usage.proUnlocked && target !== "preview";
                return (
                  <button
                    key={target}
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => handleActionClick(target)}
                    className="group relative overflow-hidden rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-left transition hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-300/25 blur-2xl" />
                    </div>
                    {locked ? (
                      <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-amber-200/25 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                        <Lock className="h-3 w-3" />
                        Pro
                      </div>
                    ) : null}
                    <div className="relative flex items-center gap-2 text-sm font-medium">
                      {active ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span>{active ? "Vibing..." : label}</span>
                    </div>
                    <p className="relative mt-2 pr-12 text-xs text-white/45">
                      {target === "preview"
                        ? usage.proUnlocked
                          ? "Unlimited live previews enabled."
                          : `${freePreviewsRemaining} free preview runs remaining.`
                        : target === "local"
                          ? "Download the OpenClaw agent bundle as a zip."
                          : "Trigger the remote deploy handoff to your VPS gateway."}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Free</p>
                <p className="mt-2 text-sm font-medium text-white">
                  Live preview and basic generation
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Pro</p>
                <p className="mt-2 text-sm font-medium text-white">
                  Unlimited previews + zip download
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">Deploy</p>
                <p className="mt-2 text-sm font-medium text-white">
                  One-click VPS handoff for paid users
                </p>
              </div>
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

      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        gateIntent={gateIntent}
        upgradeEmailDraft={upgradeEmailDraft}
        onEmailChange={setUpgradeEmailDraft}
        onStartCheckout={startUpgradeCheckout}
        checkoutBusy={checkoutBusy}
      />
    </div>
  );
}
