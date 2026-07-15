import { Resend } from "resend";
import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

export interface EmailOptions {
  to: string;
  subject: string;
  body: string; // The HTML body
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
    console.log(`Body (HTML):`);
    console.log(options.body);
    console.log("=========================================");
  }
}

export class SMTPEmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is not configured.");
    
    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || '"OmniMind AI" <noreply@omnimind.ai>',
      to: options.to,
      subject: options.subject,
      html: options.body,
    });
  }
}

export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured.");

    console.log(`Using provider: ResendEmailProvider`);

    try {
      const response = await this.resend.emails.send({
        from: process.env.EMAIL_FROM || "OmniMind AI <onboarding@resend.dev>",
        to: options.to,
        subject: options.subject,
        html: options.body,
      });

      if (response.error) {
        console.error("Resend API returned an error:", response.error);
        throw new Error(`Resend Error: ${response.error.message}`);
      }

      console.log(`[ResendEmailProvider] Successfully sent email. Response ID: ${response.data?.id}`);
    } catch (err: any) {
      console.error("[ResendEmailProvider] Exception thrown during sendEmail:");
      console.error(err);
      if (err.stack) console.error(err.stack);
      throw err;
    }
  }
}

export class SendGridEmailProvider implements EmailProvider {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!process.env.SENDGRID_API_KEY) throw new Error("SENDGRID_API_KEY is not configured.");

    await sgMail.send({
      from: process.env.EMAIL_FROM || "noreply@omnimind.ai",
      to: options.to,
      subject: options.subject,
      html: options.body,
    });
  }
}

// Factory function to get the appropriate provider based on .env
export function getEmailProvider(): EmailProvider {
  const envProvider = process.env.EMAIL_PROVIDER;
  console.log(`[EmailProviderFactory] process.env.EMAIL_PROVIDER = "${envProvider}"`);

  const providerName = envProvider?.toLowerCase().trim();

  if (providerName === "resend") {
    console.log(`[EmailProviderFactory] Selected provider: ResendEmailProvider`);
    return new ResendEmailProvider();
  }

  if (providerName === "smtp") {
    console.log(`[EmailProviderFactory] Selected provider: SMTPEmailProvider`);
    return new SMTPEmailProvider();
  }

  if (providerName === "sendgrid") {
    console.log(`[EmailProviderFactory] Selected provider: SendGridEmailProvider`);
    return new SendGridEmailProvider();
  }

  if (process.env.NODE_ENV === "development" || !providerName || providerName === "console") {
    console.log(`[EmailProviderFactory] Selected provider: ConsoleEmailProvider`);
    return new ConsoleEmailProvider();
  }

  throw new Error(`Invalid EMAIL_PROVIDER configured in production: "${envProvider}". Cannot silently fallback to ConsoleEmailProvider.`);
}

export async function sendSystemEmail(options: EmailOptions): Promise<void> {
  const provider = getEmailProvider();
  await provider.sendEmail(options);
}

// ==========================================
// EMAIL TEMPLATES
// ==========================================

export const EmailTemplates = {
  NewRegistrationNotification: (data: {
    companyName: string;
    ownerName: string;
    email: string;
    phone: string;
    businessType: string;
    registrationTime: Date;
    loginUrl: string;
  }) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #0f172a;">New Registration Request</h2>
      <p style="color: #475569;">A new enterprise registration has been submitted for OmniMind AI.</p>
      
      <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p><strong>Company:</strong> ${data.companyName}</p>
        <p><strong>Owner:</strong> ${data.ownerName}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone}</p>
        <p><strong>Type:</strong> ${data.businessType}</p>
        <p><strong>Requested At:</strong> ${data.registrationTime.toLocaleString()}</p>
      </div>

      <a href="${data.loginUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Review in System Admin Portal
      </a>
    </div>
  `,

  ApprovalEmail: (data: {
    companyName: string;
    ownerEmail: string;
    workspaceName: string;
    loginUrl: string;
  }) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #059669;">Welcome to OmniMind AI!</h2>
      <p style="color: #475569;">Hello,</p>
      <p style="color: #475569;">Your registration for <strong>${data.companyName}</strong> has been successfully approved.</p>
      
      <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #bbf7d0;">
        <p style="margin:0; color: #166534;">Your isolated enterprise workspace (<strong>${data.workspaceName}</strong>) has been automatically provisioned and is ready for use.</p>
      </div>

      <p style="color: #475569;">You can now log in using your registered credentials:</p>
      <p><strong>Email:</strong> ${data.ownerEmail}</p>

      <a href="${data.loginUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">
        Access Your Workspace
      </a>
    </div>
  `,

  RejectionEmail: (data: {
    companyName: string;
    reason?: string;
    contactEmail: string;
  }) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #dc2626;">Registration Update</h2>
      <p style="color: #475569;">Hello,</p>
      <p style="color: #475569;">Thank you for your interest in OmniMind AI for <strong>${data.companyName}</strong>.</p>
      
      <p style="color: #475569;">Unfortunately, we are unable to approve your registration at this time.</p>
      
      ${data.reason ? `
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin:0; color: #991b1b;"><strong>Reason:</strong> ${data.reason}</p>
      </div>
      ` : ''}

      <p style="color: #475569;">If you believe this is a mistake or need further assistance, please contact us at <a href="mailto:${data.contactEmail}">${data.contactEmail}</a>.</p>
    </div>
  `
};
