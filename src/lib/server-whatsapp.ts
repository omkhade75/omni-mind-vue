import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { readWhatsAppConfig } from "./server-whatsapp-config";

/**
 * WhatsApp Notification Service (Mock / Real Twilio Integration)
 * 
 * This service handles sending WhatsApp notifications for the OmniMind platform.
 * To enable real Twilio WhatsApp delivery:
 * 1. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the .env file.
 * 2. Set TWILIO_WHATSAPP_SENDER to your registered WhatsApp business number (e.g. "whatsapp:+14155238886").
 */

// Format INR correctly for notifications
const fmtINR = (amount: number | string | any) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

export async function sendCustomerBillWhatsApp(
  customerPhone: string,
  transaction: {
    transactionNumber: string;
    totalAmount: any;
    itemsCount: number;
    customerName: string;
  }
) {
  const formattedPhone = customerPhone.startsWith("+") ? customerPhone : `+91${customerPhone}`;
  const messageBody = `*OmniMind POS Receipt* 🧾\n\nHi ${transaction.customerName},\nThank you for shopping with us! Here are your transaction details:\n\n*Receipt No:* ${transaction.transactionNumber}\n*Items Purchased:* ${transaction.itemsCount}\n*Total Amount Paid:* ${fmtINR(transaction.totalAmount)}\n\nHave a great day!`;

  console.log("==========================================");
  console.log("📱 [WHATSAPP OUTBOUND: CUSTOMER RECEIPT]");
  console.log(`To: ${formattedPhone}`);
  console.log(`Message:\n${messageBody}`);
  console.log("==========================================");

  // Initialize DB Log
  let logId = "";
  try {
    const log = await prisma.messageLog.create({
      data: {
        channel: "WHATSAPP",
        recipientName: transaction.customerName,
        recipientPhone: formattedPhone,
        messageType: "BILL",
        body: messageBody,
        status: "PENDING",
      },
    });
    logId = log.id;
  } catch (dbErr) {
    console.error("⚠️ Failed to write initial message log to DB:", dbErr);
  }

  const config = readWhatsAppConfig();
  const accountSid = config.twilioAccountSid;
  const authToken = config.twilioAuthToken;
  const senderNumber = config.twilioWhatsAppSender || "whatsapp:+14155238886";

  if (accountSid && authToken) {
    const params = new URLSearchParams({
      To: `whatsapp:${formattedPhone}`,
      From: senderNumber,
      Body: messageBody,
    });

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Twilio WhatsApp Error:", errText);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "FAILED", error: `Twilio Error: ${errText}` },
          });
        }
      } else {
        const resData = await response.json();
        console.log("✅ Twilio message dispatched successfully:", resData.sid);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "SENT", providerId: resData.sid },
          });
        }
      }
    } catch (err: any) {
      console.error("❌ Failed to dispatch Twilio WhatsApp message:", err);
      if (logId) {
        await prisma.messageLog.update({
          where: { id: logId },
          data: { status: "FAILED", error: err.message || "Network request failed" },
        });
      }
    }
  } else {
    // If not configured, complete simulation
    console.log("⚠️ Twilio credentials missing - message log marked as SENT (Simulated)");
    if (logId) {
      await prisma.messageLog.update({
        where: { id: logId },
        data: { status: "SENT", error: "Simulated sending (Twilio credentials missing)" },
      });
    }
  }
}

export async function sendOwnerStockAlertWhatsApp(
  productName: string,
  remainingStock: number,
  reorderLevel: number,
  sku: string
) {
  const ownerPhone = process.env.OWNER_WHATSAPP_NUMBER || "+919876543210"; 
  const messageBody = `🚨 *EMERGENCY LOW STOCK ALERT* 🚨\n\n*Product:* ${productName}\n*SKU:* ${sku}\n\n*Current Stock:* ${remainingStock}\n*Reorder Threshold:* ${reorderLevel}\n\nThis product has fallen below the safety threshold. Please generate a Purchase Order immediately to avoid a complete stockout.`;

  console.log("==========================================");
  console.log("🚨 [WHATSAPP OUTBOUND: OWNER ALERT]");
  console.log(`To: ${ownerPhone}`);
  console.log(`Message:\n${messageBody}`);
  console.log("==========================================");

  let logId = "";
  try {
    const log = await prisma.messageLog.create({
      data: {
        channel: "WHATSAPP",
        recipientName: "Aarav Mehra (Owner)",
        recipientPhone: ownerPhone,
        messageType: "LOW_STOCK_ALERT",
        body: messageBody,
        status: "PENDING",
      },
    });
    logId = log.id;
  } catch (dbErr) {
    console.error("⚠️ Failed to write initial message log to DB:", dbErr);
  }

  const config = readWhatsAppConfig();
  const accountSid = config.twilioAccountSid;
  const authToken = config.twilioAuthToken;
  const senderNumber = config.twilioWhatsAppSender || "whatsapp:+14155238886";

  if (accountSid && authToken) {
    const params = new URLSearchParams({
      To: `whatsapp:${ownerPhone}`,
      From: senderNumber,
      Body: messageBody,
    });

    try {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error("❌ Twilio WhatsApp Error:", errText);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "FAILED", error: `Twilio Error: ${errText}` },
          });
        }
      } else {
        const resData = await response.json();
        console.log("✅ Twilio stock alert dispatched successfully:", resData.sid);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "SENT", providerId: resData.sid },
          });
        }
      }
    } catch (err: any) {
      console.error("❌ Failed to dispatch Twilio WhatsApp owner alert:", err);
      if (logId) {
        await prisma.messageLog.update({
          where: { id: logId },
          data: { status: "FAILED", error: err.message || "Network request failed" },
        });
      }
    }
  } else {
    console.log("⚠️ Twilio credentials missing - stock alert marked as SENT (Simulated)");
    if (logId) {
      await prisma.messageLog.update({
        where: { id: logId },
        data: { status: "SENT", error: "Simulated sending (Twilio credentials missing)" },
      });
    }
  }
}

export async function sendEodReportWhatsApp(
  stats: {
    date: string;
    revenue: number;
    profit: number;
    orders: number;
    anomalies: number;
  },
  recipients: string[]
) {
  const messageBody = `📊 *OmniMind End of Day Report* 📊\n\n*Date:* ${stats.date}\n\n*Gross Revenue:* ${fmtINR(stats.revenue)}\n*Net Profit:* ${fmtINR(stats.profit)}\n*Total Orders:* ${stats.orders}\n*Active Anomalies:* ${stats.anomalies}\n\nGreat work today! Open OmniMind Command Center for detailed analytics.`;

  for (const phone of recipients) {
    const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    console.log("==========================================");
    console.log("📈 [WHATSAPP OUTBOUND: EOD REPORT]");
    console.log(`To: ${formattedPhone}`);
    console.log(`Message:\n${messageBody}`);
    console.log("==========================================");

    let logId = "";
    try {
      const log = await prisma.messageLog.create({
        data: {
          channel: "WHATSAPP",
          recipientName: phone.includes("9876543210") ? "Aarav Mehra (Owner)" : "Priya Nair (Admin)",
          recipientPhone: formattedPhone,
          messageType: "EOD_REPORT",
          body: messageBody,
          status: "PENDING",
        },
      });
      logId = log.id;
    } catch (dbErr) {
      console.error("⚠️ Failed to write initial message log to DB:", dbErr);
    }

    const config = readWhatsAppConfig();
    const accountSid = config.twilioAccountSid;
    const authToken = config.twilioAuthToken;
    const senderNumber = config.twilioWhatsAppSender || "whatsapp:+14155238886";

    if (accountSid && authToken) {
      const params = new URLSearchParams({
        To: `whatsapp:${formattedPhone}`,
        From: senderNumber,
        Body: messageBody,
      });

      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            },
            body: params.toString(),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          console.error("❌ Twilio WhatsApp Error:", errText);
          if (logId) {
            await prisma.messageLog.update({
              where: { id: logId },
              data: { status: "FAILED", error: `Twilio Error: ${errText}` },
            });
          }
        } else {
          const resData = await response.json();
          console.log("✅ Twilio EOD report dispatched successfully:", resData.sid);
          if (logId) {
            await prisma.messageLog.update({
              where: { id: logId },
              data: { status: "SENT", providerId: resData.sid },
            });
          }
        }
      } catch (err: any) {
        console.error("❌ Failed to dispatch Twilio WhatsApp EOD report:", err);
        if (logId) {
          await prisma.messageLog.update({
            where: { id: logId },
            data: { status: "FAILED", error: err.message || "Network request failed" },
          });
        }
      }
    } else {
      console.log("⚠️ Twilio credentials missing - EOD report marked as SENT (Simulated)");
      if (logId) {
        await prisma.messageLog.update({
          where: { id: logId },
          data: { status: "SENT", error: "Simulated sending (Twilio credentials missing)" },
        });
      }
    }
  }
}
