import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import * as fs from "fs";
import * as path from "path";

interface VapiConfig {
  vapiPhoneId: string;
  vapiAgentId: string;
  vapiPublicKey: string;
  vapiPrivateKey: string;
}

// Memory fallback cache in case filesystem is read-only or serverless
let memoryConfigCache: VapiConfig = {
  vapiPhoneId: "e0cfb9a5-a9d8-4422-a09c-b87ef3a50c95",
  vapiAgentId: "294c5d56-74a9-472d-a0ba-5c626aca4747",
  vapiPublicKey: "4a80f4e1-29e2-4236-afd3-0d41c54d3793",
  vapiPrivateKey: "6ab6eb8f-0c48-4d51-9cdd-38caf3977158"
};

const getConfigPath = () => {
  return path.join(process.cwd(), "src", "lib", "vapi-config.json");
};

// Safe helper to read Vapi credentials
function readConfig(): VapiConfig {
  const envConfig: Partial<VapiConfig> = {};
  if (process.env.VAPI_PHONE_ID) envConfig.vapiPhoneId = process.env.VAPI_PHONE_ID;
  if (process.env.VAPI_AGENT_ID) envConfig.vapiAgentId = process.env.VAPI_AGENT_ID;
  if (process.env.VAPI_PUBLIC_KEY) envConfig.vapiPublicKey = process.env.VAPI_PUBLIC_KEY;
  if (process.env.VAPI_PRIVATE_KEY) envConfig.vapiPrivateKey = process.env.VAPI_PRIVATE_KEY;

  try {
    const configPath = getConfigPath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf8");
      const parsed = JSON.parse(raw);
      memoryConfigCache = { ...memoryConfigCache, ...parsed, ...envConfig };
    } else {
      memoryConfigCache = { ...memoryConfigCache, ...envConfig };
    }
  } catch (err) {
    console.warn("⚠️ Vapi Config File Read warning (using memory cache):", err);
    memoryConfigCache = { ...memoryConfigCache, ...envConfig };
  }
  return memoryConfigCache;
}

// Safe helper to write Vapi credentials
function writeConfig(config: VapiConfig) {
  memoryConfigCache = config;
  try {
    const configPath = getConfigPath();
    // Ensure dir exists
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("❌ Vapi Config File Write failed:", err);
    return false;
  }
}

/**
 * Fetch Vapi AI configurations.
 */
export const getVapiConfigServer = createServerFn({ method: "GET" })
  .handler(async () => {
    return readConfig();
  });

/**
 * Update Vapi AI configurations.
 */
export const updateVapiConfigServer = createServerFn({ method: "POST" })
  .validator((data: VapiConfig) => data)
  .handler(async ({ data }) => {
    const success = writeConfig(data);
    return { success, config: data };
  });

/**
 * Trigger an outbound Vapi AI phone call.
 */
export const initiateVapiCallServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      phoneNumber: string;
      recipientName: string;
      role: "supplier" | "customer" | "staff" | "general";
      messageContext: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const config = readConfig();

    if (!config.vapiPrivateKey || !config.vapiPhoneId || !config.vapiAgentId) {
      throw new Error("Vapi AI credentials are not fully configured in settings.");
    }

    // Format phone number to E.164 if COUNTRY_CODE prefix is missing
    let phone = data.phoneNumber.trim().replace(/\s+/g, "");
    if (!phone.startsWith("+")) {
      // Default to India country code if length suggests Indian number, else prepend +
      if (phone.length === 10) {
        phone = "+91" + phone;
      } else {
        phone = "+" + phone;
      }
    }

    console.log(`📞 [VAPI OUTBOUND CALL] Initiating call to ${data.recipientName} (${phone})`);
    console.log(`Context: ${data.messageContext}`);

    let logId = "";
    try {
      const log = await prisma.messageLog.create({
        data: {
          channel: "VOICE",
          recipientName: data.recipientName,
          recipientPhone: phone,
          messageType: "CRM_OUTREACH",
          body: data.messageContext,
          status: "PENDING",
        },
      });
      logId = log.id;
    } catch (dbErr) {
      console.warn("⚠️ Failed to write initial voice message log:", dbErr);
    }

    try {
      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.vapiPrivateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumberId: config.vapiPhoneId,
          assistantId: config.vapiAgentId,
          customer: {
            number: phone,
            name: data.recipientName
          },
          assistantOverrides: {
            firstMessage: data.role === "supplier" 
              ? `Hello, this is the automated procurement agent calling from GrandSquare Mall. May I speak with the representative of ${data.recipientName}?`
              : `Hello ${data.recipientName}, this is the AI assistant calling from GrandSquare Mall. I hope you're having a wonderful day!`,
            systemPrompt: `You are the official AI Voice Agent of GrandSquare Mall, a premium retail shopping center.
You speak in a polite, natural, professional, and friendly tone. Keep your responses concise (1-2 sentences max) to minimize latency and maintain natural conversation flow.

Your primary objective is:
- Identify yourself clearly as the AI Agent for GrandSquare Mall.
- Convey the following business context/offer in brief: "${data.messageContext}".
- If you are calling a customer, tell them about our premium shopping experience and our latest offers (such as our 20% loyalty discounts).
- If you are calling a supplier, discuss active purchase orders, stock delivery schedules, or procurement status.
- Keep the latency low by avoiding long explanations.`,
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "en"
            },
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              temperature: 0.7,
              maxTokens: 150
            },
            voice: {
              provider: "cartesia",
              voiceId: "ba2b95aa-2add-4c12-9c17-48f57242e20b",
              model: "sonic-english"
            }
          }
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Vapi API responded with error:", errText);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "FAILED", error: `Vapi Error: ${errText}` },
          });
        }
        return {
          success: false,
          error: `Vapi API error: ${response.statusText} (${response.status})`,
          details: errText,
        };
      }

      const resData = await response.json();
      console.log("✅ Vapi Call Triggered successfully:", resData);

      if (logId) {
        await prisma.messageLog.update({
          where: { id: logId },
          data: { status: "SENT", providerId: resData.id },
        });
      }

      return {
        success: true,
        callId: resData.id,
        status: resData.status,
        data: resData
      };
    } catch (err: any) {
      console.error("❌ Outbound Vapi Call trigger crash:", err);
      if (logId) {
        await prisma.messageLog.update({
          where: { id: logId },
          data: { status: "FAILED", error: err.message || "Network request failed" },
        });
      }
      return {
        success: false,
        error: err.message || "Failed to trigger outbound API request to Vapi.",
      };
    }
  });
