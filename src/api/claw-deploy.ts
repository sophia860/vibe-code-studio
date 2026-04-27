
import { DEPLOY_TARGETS, type DeployTarget } from "../types/agent";

export interface ClawDeployRequest {
  prompt: string;
  target: DeployTarget;
  files?: File[];
}

function normalizeGatewayUrl(rawUrl: string): string {
  return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

export async function requestClawGateway(
  req: ClawDeployRequest,
  origin?: string
) {
  const gatewayUrl = import.meta.env.VITE_OPENCLAW_GATEWAY_URL;

  if (!gatewayUrl) {
    throw new Error(
      "VITE_OPENCLAW_GATEWAY_URL is not configured. Please set it in your Vercel environment variables."
    );
  }

  console.log("Forwarding request to OpenClaw Gateway:", gatewayUrl);

  const formData = new FormData();
  formData.append("prompt", req.prompt);
  formData.append("target", req.target);
  
  if (req.files) {
    req.files.forEach((file, index) => {
      formData.append(`file_${index}`, file);
    });
  }

  const response = await fetch(`${normalizeGatewayUrl(gatewayUrl)}/generate`, {
    method: "POST",
    body: formData,
    headers: origin ? { "X-Original-Origin": origin } : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gateway error:", errorText);
    throw new Error(`Gateway returned ${response.status}: ${errorText || "Unknown error"}`);
  }

  const data = await response.json();
  return {
    kind: req.target === "local" ? "local" : "vps",
    data: data,
  };
}

export async function fallbackDeploy(req: ClawDeployRequest) {
  // Simple fallback logic if gateway is completely unreachable
  return {
    status: 503,
    body: { error: "OpenClaw Gateway is currently unreachable." }
  };
}

export function parseDeployRequest(body: any): ClawDeployRequest {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be a JSON object.");
  }
  return {
    prompt: body.prompt || "",
    target: body.target || "local",
    files: body.files
  };
}

