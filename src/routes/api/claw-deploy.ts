
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { 
  parseDeployRequest, 
  requestClawGateway, 
  fallbackDeploy 
} from "../../api/claw-deploy";

export const APIRoute = createAPIFileRoute("/api/claw-deploy")({
  POST: async ({ request }) => {
    try {
      const payload = await request.json();
      const parsed = parseDeployRequest(payload);
      
      try {
        const gatewayResult = await requestClawGateway(
          parsed, 
          request.headers.get("origin") ?? undefined
        );

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
          status: gatewayResult.kind === "vps" ? 201 : 200,
        });
      } catch (error: any) {
        console.error("API Route Error:", error);
        const fallback = await fallbackDeploy(parsed);
        return Response.json(fallback.body, { status: fallback.status });
      }
    } catch (e) {
      return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
    }
  },
});

