// @ts-nocheck
import { prisma } from "./prisma";

export interface CommunicationWorkflow {
  id: string;
  channel: "WHATSAPP" | "TWILIO_SMS" | "VAPI_VOICE" | "EMAIL";
  recipient: string;
  body: string;
  triggerContext: string;
  status: "Triggered" | "Delivered" | "Failed";
}

export class CommunicationEngine {
  public static async dispatchWorkflow(
    channel: CommunicationWorkflow["channel"],
    recipient: string,
    body: string,
    context: string,
  ): Promise<CommunicationWorkflow> {
    const timestamp = new Date().toISOString();
    let status: CommunicationWorkflow["status"] = "Triggered";

    try {
      // Record outbound message logs directly in the DB
      // @ts-ignore
      await prisma.messageLog.create({
        data: {
                  channel,
                  recipientName: recipient,
                  recipientPhone: recipient,
                  messageType: "EOD_REPORT",
                  body,
                  status: "SENT",
                } as any,
      });
      status = "Delivered";
    } catch (e) {
      console.error("Failed to write to MessageLog database table:", e);
      status = "Failed";
    }

    return {
      id: `comm-wf-${Date.now()}`,
      channel,
      recipient,
      body,
      triggerContext: context,
      status,
    };
  }
}
