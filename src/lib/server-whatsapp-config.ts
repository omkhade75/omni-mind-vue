import { createServerFn } from "@tanstack/react-start";
import * as fs from "fs";
import * as path from "path";

export interface WhatsAppConfig {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioWhatsAppSender: string;
  ownerWhatsAppNumber: string;
  managerWhatsAppNumber: string;
}

let memoryConfigCache: WhatsAppConfig = {
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioWhatsAppSender: "whatsapp:+14155238886",
  ownerWhatsAppNumber: "+919876543210",
  managerWhatsAppNumber: "+919876543211",
};

const getConfigPath = () => {
  return path.join(process.cwd(), "src", "lib", "whatsapp-config.json");
};

export function readWhatsAppConfig(): WhatsAppConfig {
  const envConfig: Partial<WhatsAppConfig> = {};
  if (process.env.TWILIO_ACCOUNT_SID) envConfig.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  if (process.env.TWILIO_AUTH_TOKEN) envConfig.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  if (process.env.TWILIO_WHATSAPP_SENDER)
    envConfig.twilioWhatsAppSender = process.env.TWILIO_WHATSAPP_SENDER;
  if (process.env.OWNER_WHATSAPP_NUMBER)
    envConfig.ownerWhatsAppNumber = process.env.OWNER_WHATSAPP_NUMBER;
  if (process.env.MANAGER_WHATSAPP_NUMBER)
    envConfig.managerWhatsAppNumber = process.env.MANAGER_WHATSAPP_NUMBER;

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
    console.warn("⚠️ WhatsApp Config File Read warning (using memory cache):", err);
    memoryConfigCache = { ...memoryConfigCache, ...envConfig };
  }
  return memoryConfigCache;
}

export function writeWhatsAppConfig(config: WhatsAppConfig) {
  memoryConfigCache = config;
  try {
    const configPath = getConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("❌ WhatsApp Config File Write failed:", err);
    return false;
  }
}

export const getWhatsAppConfigServer = createServerFn({ method: "GET" }).handler(async () => {
  return readWhatsAppConfig();
});

export const updateWhatsAppConfigServer = createServerFn({ method: "POST" })
  .validator((data: { data: WhatsAppConfig }) => data)
  .handler(async ({ data }) => {
    writeWhatsAppConfig(data.data);
    return { success: true };
  });
