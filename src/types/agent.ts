export type DeployTarget = "preview" | "local" | "vps";

export type UploadContext = {
  id: string;
  name: string;
  sizeLabel: string;
  excerpt: string;
};

export type UsageLedger = {
  cycleStartedAt: string;
  previewRuns: number;
  proUnlocked: boolean;
  upgradeEmail: string;
  checkoutStartedAt: string | null;
};

export type GateIntent = {
  target: DeployTarget;
  reason: string;
} | null;
