import { Crown, LoaderCircle } from "lucide-react";

import type { GateIntent } from "../types/agent";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gateIntent: GateIntent;
  upgradeEmailDraft: string;
  onEmailChange: (email: string) => void;
  onStartCheckout: () => void;
  checkoutBusy: boolean;
};

export function UpgradeModal({
  open,
  onOpenChange,
  gateIntent,
  upgradeEmailDraft,
  onEmailChange,
  onStartCheckout,
  checkoutBusy,
}: UpgradeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#080d14] p-0 text-white shadow-[0_0_100px_-28px_rgba(251,191,36,0.55)] sm:max-w-2xl">
        <div className="relative overflow-hidden rounded-[inherit]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,240,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.18),transparent_34%)]" />
          <div className="relative p-6 md:p-8">
            <DialogHeader className="space-y-3 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-amber-100">
                <Crown className="h-3.5 w-3.5" />
                Upgrade to Claw Pro
              </div>
              <DialogTitle className="text-2xl font-semibold text-white md:text-3xl">
                Keep shipping while the free tier meter taps out
              </DialogTitle>
              <DialogDescription className="max-w-xl text-sm leading-6 text-white/60">
                {gateIntent?.reason ??
                  "Claw Pro removes the free-tier meter and unlocks the download plus deploy actions behind the paid gate."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-100/70">
                  What unlocks instantly
                </p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">
                      Unlimited preview generations
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Stop rationing experiments when a landing page finally gets interesting.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">
                      Local agent bundle downloads
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Pull a zip the moment the concept is working instead of rebuilding by hand.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">One-click VPS deploy handoff</p>
                    <p className="mt-1 text-sm text-white/55">
                      Push the polished version to your OpenClaw gateway without leaving the studio.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200/20 bg-amber-300/10 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-100/75">Checkout</p>
                <p className="mt-3 text-4xl font-semibold text-white">
                  $29<span className="text-base text-white/55">/mo</span>
                </p>
                <p className="mt-2 text-sm text-white/60">
                  Launch Stripe checkout with your work email prefilled.
                </p>

                <label
                  htmlFor="upgrade-email"
                  className="mt-5 block text-sm font-medium text-white/80"
                >
                  Work email
                </label>
                <Input
                  id="upgrade-email"
                  type="email"
                  value={upgradeEmailDraft}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="founder@yourcompany.com"
                  className="mt-2 h-11 rounded-2xl border-white/15 bg-black/30 px-4 text-white placeholder:text-white/30"
                />

                <p className="mt-3 text-xs leading-5 text-white/45">
                  After payment, return here using a Stripe success URL that appends{" "}
                  <span className="font-mono text-white/65">?claw_checkout=success</span> to unlock
                  Pro on this browser.
                </p>

                <DialogFooter className="mt-5 flex-col gap-3 sm:flex-col sm:space-x-0">
                  <button
                    type="button"
                    onClick={onStartCheckout}
                    disabled={checkoutBusy}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutBusy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crown className="h-4 w-4" />
                    )}
                    Continue to Stripe
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10"
                  >
                    Keep working on free tier
                  </button>
                </DialogFooter>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
