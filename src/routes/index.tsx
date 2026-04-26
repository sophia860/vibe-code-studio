import { createFileRoute } from "@tanstack/react-router";
import { ClawStudio } from "../components/ClawStudio";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ClawVibe Studio | Vibe -> Real OpenClaw Agent in 60 seconds" },
      {
        name: "description",
        content:
          "Type a prompt and generate a complete sales website plus a deployable OpenClaw agent bundle.",
      },
      { property: "og:title", content: "ClawVibe Studio" },
      { property: "og:description", content: "Vibe -> Real OpenClaw Agent in 60 seconds" },
    ],
  }),
});

function Index() {
  return <ClawStudio />;
}
