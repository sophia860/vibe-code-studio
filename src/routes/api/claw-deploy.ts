import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  parseDeployRequest,
  requestClawGateway,
  fallbackDeploy,
} from "../../api/claw-deploy";

export const APIRoute = createAPIFileRoute("/api/claw-deploy")({
  POST: async ({ request }) => {
    // ---------------------------------------------------------------
    // 1. Parse the incoming request (JSON or multipart/form-data)
    // ---------------------------------------------------------------
    let parsed;
    try {
      parsed = await parseDeployRequest(request);
    } catch {
      return Response.json(
        { error: "Invalid request payload. Expected JSON with { prompt, target }." },
        { status: 400 }
      );
    }

    if (!parsed.prompt || !parsed.prompt.trim()) {
      return Response.json(
        { error: "prompt is required." },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------------
    // 2. Forward to OpenClaw Gateway
    // ---------------------------------------------------------------
    try {
      const origin = request.headers.get("origin") ?? undefined;
      const gatewayResult = await requestClawGateway(parsed, origin);

      // Binary bundle (zip) download response
      if (
        gatewayResult.kind === "vps" &&
        gatewayResult.data?.bundle instanceof ArrayBuffer
      ) {
        return new Response(gatewayResult.data.bundle as ArrayBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="clawvibe-agent-bundle.zip"',
            "Cache-Control": "no-store",
          },
        });
      }

      // JSON result (preview URL, agent ID, etc.)
      return Response.json(gatewayResult.data, {
        status: gatewayResult.kind === "vps" ? 200 : 200,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown error contacting OpenClaw Gateway.";

      console.error("[claw-deploy] Gateway error:", message);

      // Surface a user-friendly fallback so the UI can display it
      const fallback = await fallbackDeploy(parsed);
      return Response.json(
        { ...fallback.body, gateway_error: message },
        { status: fallback.status }
      );
    }
  },
});
