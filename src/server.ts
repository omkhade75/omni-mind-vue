import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      console.log(`📡 [Server] Incoming request: ${request.method} ${request.url}`);
      const url = new URL(request.url);
      if (url.pathname === "/api/vapi-webhook") {
        if (request.method === "GET") {
          return new Response(JSON.stringify({ status: "active", channel: "Vapi Webhook Adapter" }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (request.method === "POST") {
          try {
            const payload = await request.clone().json();
            console.log("📥 Vapi Webhook Received:", JSON.stringify(payload, null, 2));

            const messageType = payload.message?.type;
            const callData = payload.message?.call;

            if (messageType === "end-of-call-report" && callData) {
              const callId = callData.id;
              const transcript = callData.transcript || "";
              const summary = payload.message?.analysis?.summary || "";
              const duration = callData.duration || 0;
              const endedReason = callData.endedReason || "unknown";

              console.log(`📞 Vapi Call Ended. ID: ${callId}, Duration: ${duration}s, Reason: ${endedReason}`);

              const { prisma } = await import("./lib/server/prisma");
              const existingLog = await prisma.messageLog.findFirst({
                where: { providerId: callId },
              });

              if (existingLog) {
                const updatedBody = `${existingLog.body}\n\n--- AI CALL TRANSCRIPT (${duration}s, Reason: ${endedReason}) ---\nSummary: ${summary}\n\nTranscript: ${transcript}`;
                
                await prisma.messageLog.update({
                  where: { id: existingLog.id },
                  data: {
                    status: endedReason === "customer-hung-up" || endedReason === "assistant-completed-recording" || endedReason === "normal"
                      ? "DELIVERED"
                      : "FAILED",
                    body: updatedBody,
                    error: endedReason !== "normal" ? `Ended: ${endedReason}` : null,
                  },
                });
                console.log(`✅ MessageLog updated successfully for callId: ${callId}`);
              } else {
                console.warn(`⚠️ No matching MessageLog found for Vapi callId: ${callId}`);
              }
            }

            return new Response(JSON.stringify({ received: true }), {
              headers: { "Content-Type": "application/json" },
            });
          } catch (err: any) {
            console.error("❌ Error processing Vapi Webhook:", err);
            return new Response(JSON.stringify({ error: err.message || "Failed to process webhook" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      }

      console.log("📡 [Server] Resolving TanStack Start server entry...");
      const handler = await getServerEntry();
      console.log("📡 [Server] Server entry resolved. Calling handler.fetch...");
      const response = await handler.fetch(request, env, ctx);
      console.log(`📡 [Server] handler.fetch finished with status: ${response.status}`);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error("❌ [Server] Fatal server handler error:", error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
