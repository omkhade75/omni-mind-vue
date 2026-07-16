import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import bcrypt from "bcryptjs";
import { sendSystemEmail, EmailTemplates } from "./server-email";

export const registerCompanyServer = createServerFn({ method: "POST" })
  .validator((data: any) => data) // We could add Zod validation here
  .handler(async ({ data }) => {
    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // 2. Create Pending Registration
    const registration = await prisma.pendingRegistration.create({
      data: {
        companyName: data.companyName,
        businessType: data.businessType,
        industry: data.industry,
        gstNumber: data.gstNumber,
        companyWebsite: data.companyWebsite,
        ownerName: data.ownerName,
        ownerEmail: data.ownerEmail,
        mobileNumber: data.mobileNumber,
        designation: data.designation,
        country: data.country,
        state: data.state,
        city: data.city,
        address: data.address,
        employeeCount: data.employeeCount,
        branchCount: data.branchCount,
        revenueRange: data.revenueRange,
        timezone: data.timezone,
        currency: data.currency,
        passwordHash: passwordHash,
        status: "Pending",
      },
    });

    // 3. Send Email Notification
    try {
      const adminEmail = process.env.SYSTEM_ADMIN_EMAIL || "khade8915@gmail.com";
      const appUrl = process.env.APP_URL || "http://localhost:3000";

      await sendSystemEmail({
        to: adminEmail,
        subject: `New SaaS Registration: ${registration.companyName}`,
        body: EmailTemplates.NewRegistrationNotification({
          companyName: registration.companyName,
          ownerName: registration.ownerName,
          email: registration.ownerEmail,
          phone: registration.mobileNumber,
          businessType: registration.businessType,
          registrationTime: registration.createdAt,
          loginUrl: `${appUrl}/system-admin?reviewId=${registration.id}`,
        }),
      });
    } catch (err) {
      console.error("Failed to send admin email:", err);
      // We don't throw here so the registration still succeeds for the user
    }

    return { success: true, registrationId: registration.id };
  });
