import { createAPIFileRoute } from "@tanstack/react-start/api";
import { fallbackDeploy, parseDeployRequest, requestClawGateway } from "../../api/claw-deploy";

export const APIRoute = createAPIFileRoute("/api/claw-deploy")({
  POST: async ({ request }) => {
    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    let parsed;
    try {
      parsed = parseDeployRequest(payload);
    } catch (error) {
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Invalid request payload.",
        },
        { status: 400 },
      );
    }

    try {
      const gatewayResult = await requestClawGateway(parsed, request.headers.get("origin") ?? undefined);

      if (gatewayResult.kind === "local") {
        return new Response(gatewayResult.data, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": 'attachment; filename="clawvibe-agent-bundle.zip"',
            "Cache-Control": "no-store",
          },
        });
      }

      return Response.json(gatewayResult.data, {
        status: gatewayResult.kind === "vps" ? 202 : 200,
      });
    } catch {
      const fallback = await fallbackDeploy(parsed);
      return Response.json(fallback.body, { status: fallback.status });
    }
  },
});
