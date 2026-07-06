/**
 * WhatsApp Notification Service (Mock / Sandbox)
 * 
 * This service handles sending WhatsApp notifications for the OmniMind platform.
 * To enable real Twilio WhatsApp delivery:
 * 1. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the .env file.
 * 2. Set TWILIO_WHATSAPP_SENDER to your registered WhatsApp business number (e.g. "whatsapp:+14155238886").
 * 3. Uncomment the Twilio fetch logic inside the functions.
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
  // Format phone to E.164 if necessary (assuming Indian numbers for this demo)
  const formattedPhone = customerPhone.startsWith("+") ? customerPhone : `+91${customerPhone}`;
  
  const messageBody = `*OmniMind POS Receipt* 🧾\n\nHi ${transaction.customerName},\nThank you for shopping with us! Here are your transaction details:\n\n*Receipt No:* ${transaction.transactionNumber}\n*Items Purchased:* ${transaction.itemsCount}\n*Total Amount Paid:* ${fmtINR(transaction.totalAmount)}\n\nHave a great day!`;

  // --- MOCK LOGGING FOR DEMO ---
  console.log("==========================================");
  console.log("📱 [WHATSAPP OUTBOUND: CUSTOMER RECEIPT]");
  console.log(`To: ${formattedPhone}`);
  console.log(`Message:\n${messageBody}`);
  console.log("==========================================");
  
  // --- PRODUCTION TWILIO IMPLEMENTATION ---
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderNumber = process.env.TWILIO_WHATSAPP_SENDER;

  if (accountSid && authToken && senderNumber) {
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
        console.error("Twilio WhatsApp Error:", await response.text());
      }
    } catch (err) {
      console.error("Failed to dispatch Twilio WhatsApp message:", err);
    }
  }
  */
}

export async function sendOwnerStockAlertWhatsApp(
  productName: string,
  remainingStock: number,
  reorderLevel: number,
  sku: string
) {
  const ownerPhone = process.env.OWNER_WHATSAPP_NUMBER || "+919876543210"; 
  
  const messageBody = `🚨 *EMERGENCY LOW STOCK ALERT* 🚨\n\n*Product:* ${productName}\n*SKU:* ${sku}\n\n*Current Stock:* ${remainingStock}\n*Reorder Threshold:* ${reorderLevel}\n\nThis product has fallen below the safety threshold. Please generate a Purchase Order immediately to avoid a complete stockout.`;

  // --- MOCK LOGGING FOR DEMO ---
  console.log("==========================================");
  console.log("🚨 [WHATSAPP OUTBOUND: OWNER ALERT]");
  console.log(`To: ${ownerPhone}`);
  console.log(`Message:\n${messageBody}`);
  console.log("==========================================");

  // --- PRODUCTION TWILIO IMPLEMENTATION ---
  /*
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const senderNumber = process.env.TWILIO_WHATSAPP_SENDER;

  if (accountSid && authToken && senderNumber) {
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
        console.error("Twilio WhatsApp Error:", await response.text());
      }
    } catch (err) {
      console.error("Failed to dispatch Twilio WhatsApp owner alert:", err);
    }
  }
  */
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

    // --- MOCK LOGGING FOR DEMO ---
    console.log("==========================================");
    console.log("📈 [WHATSAPP OUTBOUND: EOD REPORT]");
    console.log(`To: ${formattedPhone}`);
    console.log(`Message:\n${messageBody}`);
    console.log("==========================================");

    // --- PRODUCTION TWILIO IMPLEMENTATION ---
    /*
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const senderNumber = process.env.TWILIO_WHATSAPP_SENDER;

    if (accountSid && authToken && senderNumber) {
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
          console.error("Twilio WhatsApp Error:", await response.text());
        }
      } catch (err) {
        console.error("Failed to dispatch Twilio WhatsApp EOD report:", err);
      }
    }
    */
  }
}
