import { Crown, Lock } from "lucide-react";

import type { UsageLedger } from "../types/agent";

const FREE_PREVIEW_LIMIT = 3;
const BILLING_WINDOW_DAYS = 30;

type UsageCounterProps = {
  usage: UsageLedger;
  freePreviewsRemaining: number;
  usageProgress: number;
  onUpgradeClick: () => void;
};

export function UsageCounter({
  usage,
  freePreviewsRemaining,
  usageProgress,
  onUpgradeClick,
}: UsageCounterProps) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-amber-200/20 bg-amber-300/10 p-4 shadow-[0_0_80px_-36px_rgba(251,191,36,0.55)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-100/80">
            {usage.proUnlocked ? "Pro status" : "Free tier meter"}
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            {usage.proUnlocked
              ? "Claw Pro unlocked on this browser"
              : `${freePreviewsRemaining} of ${FREE_PREVIEW_LIMIT} previews left`}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {usage.proUnlocked
              ? "Unlimited previews, zip downloads, and VPS deploys are available now."
              : `Your meter resets every ${BILLING_WINDOW_DAYS} days. Upgrade before the next good idea gets blocked.`}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100/20 bg-black/25 p-2 text-amber-100">
          {usage.proUnlocked ? <Crown className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${usage.proUnlocked ? "bg-emerald-300" : "bg-amber-300"}`}
          style={{ width: `${usage.proUnlocked ? 100 : usageProgress}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onUpgradeClick}
          className="inline-flex items-center gap-2 rounded-2xl border border-amber-200/30 bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-200"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Pro
        </button>
        <span className="text-xs uppercase tracking-[0.2em] text-white/45">$29/mo removes limits</span>
      </div>
    </div>
  );
}
