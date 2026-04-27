import { DEPLOY_TARGETS, type DeployTarget } from "../types/agent";

export interface ClawDeployRequest {
  prompt: string;
  target: DeployTarget;
  files?: File[];
}

export interface GatewayResult {
  kind: string;
  data: Record<string, unknown>;
}

function normalizeGatewayUrl(rawUrl: string): string {
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

// Resolve gateway URL — works in both dev (import.meta.env) and
// Vercel server functions (process.env).  Set VITE_OPENCLAW_GATEWAY_URL
// in Vercel project settings.
function getGatewayUrl(): string | undefined {
  // Server-side: process.env is always available
  if (typeof process !== "undefined" && process.env?.VITE_OPENCLAW_GATEWAY_URL) {
    return process.env.VITE_OPENCLAW_GATEWAY_URL;
  }
  // Client/SSR build: Vite replaces import.meta.env at build time
  try {
    const url = import.meta.env?.VITE_OPENCLAW_GATEWAY_URL;
    if (url) return url;
  } catch {
    // ignore
  }
  return undefined;
}

export async function requestClawGateway(
  req: ClawDeployRequest,
  origin?: string
): Promise<GatewayResult> {
  const gatewayUrl = getGatewayUrl();

  if (!gatewayUrl) {
    throw new Error(
      "OpenClaw Gateway is not configured. Add VITE_OPENCLAW_GATEWAY_URL to your Vercel environment variables and redeploy."
    );
  }

  // Build FormData so the gateway receives the standard multipart payload
  const formData = new FormData();
  formData.append("prompt", req.prompt);
  formData.append("target", req.target);

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      formData.append("files", file);
    }
  }

  const headers: Record<string, string> = {};
  if (origin) {
    headers["Origin"] = origin;
  }

  const response = await fetch(`${normalizeGatewayUrl(gatewayUrl)}/generate`, {
    method: "POST",
    body: formData,
    headers,
    signal: AbortSignal.timeout(55_000), // 55 s — stay under Vercel 60 s limit
  });

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `OpenClaw Gateway returned ${response.status}: ${errText || response.statusText}`
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/zip") || contentType.includes("octet-stream")) {
    // Binary bundle response — wrap for the route handler
    const arrayBuffer = await response.arrayBuffer();
    return { kind: "vps", data: { bundle: arrayBuffer } as unknown as Record<string, unknown> };
  }

  const json = await response.json();
  return json as GatewayResult;
}

export async function fallbackDeploy(
  req: ClawDeployRequest
): Promise<{ status: number; body: Record<string, unknown> }> {
  const gatewayUrl = getGatewayUrl();
  return {
    status: 503,
    body: {
      error: gatewayUrl
        ? "OpenClaw Gateway is currently unreachable. Please try again in a moment."
        : "OpenClaw Gateway is not connected. Set VITE_OPENCLAW_GATEWAY_URL in your Vercel environment variables.",
      gateway_configured: !!gatewayUrl,
      target: req.target,
    },
  };
}

export async function parseDeployRequest(
  request: Request
): Promise<ClawDeployRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    // Handle real FormData (e.g. future file-upload path)
    const form = await request.formData();
    return {
      prompt: (form.get("prompt") as string) ?? "",
      target: ((form.get("target") as string) ?? "local") as DeployTarget,
      // Files in FormData come as Blob/File — collect them
      files: form.getAll("files").filter((f) => f instanceof File) as File[],
    };
  }

  // Default: JSON body (the current frontend sends application/json)
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid request body — expected JSON or multipart/form-data");
  }

  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }

  return {
    prompt: (body.prompt as string) ?? "",
    target: ((body.target as string) ?? "local") as DeployTarget,
    // JSON cannot carry File objects — files field is omitted here
    files: [],
  };
}
