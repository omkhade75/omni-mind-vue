export interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  sendEmail(options: EmailOptions): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    console.log("=========================================");
    console.log(`[ConsoleEmailProvider] Sending Email`);
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:`);
    console.log(options.body);
    console.log("=========================================");
  }
}

export class SMTPEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    // Placeholder for actual SMTP implementation (e.g. Nodemailer)
    console.log(`[SMTPEmailProvider] would send to ${options.to}`);
    throw new Error("SMTPEmailProvider not fully implemented. Missing 'nodemailer' dependency.");
  }
}

export class ResendEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    // Placeholder for Resend integration
    console.log(`[ResendEmailProvider] would send to ${options.to}`);
    throw new Error("ResendEmailProvider not fully implemented. Missing 'resend' dependency.");
  }
}

export class SendGridEmailProvider implements EmailProvider {
  async sendEmail(options: EmailOptions): Promise<void> {
    // Placeholder for SendGrid integration
    console.log(`[SendGridEmailProvider] would send to ${options.to}`);
    throw new Error("SendGridEmailProvider not fully implemented. Missing '@sendgrid/mail' dependency.");
  }
}

// Factory function to get the appropriate provider based on .env
export function getEmailProvider(): EmailProvider {
  const providerName = process.env.EMAIL_PROVIDER?.toLowerCase() || "console";

  switch (providerName) {
    case "smtp":
      return new SMTPEmailProvider();
    case "resend":
      return new ResendEmailProvider();
    case "sendgrid":
      return new SendGridEmailProvider();
    case "console":
    default:
      return new ConsoleEmailProvider();
  }
}

export async function sendSystemEmail(options: EmailOptions): Promise<void> {
  const provider = getEmailProvider();
  await provider.sendEmail(options);
}
