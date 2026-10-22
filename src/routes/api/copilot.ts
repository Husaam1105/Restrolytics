import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/copilot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleCopilot } = await import("@/lib/copilot.server");
        return handleCopilot(request);
      },
    },
  },
});
