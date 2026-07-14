import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import bcrypt from "bcryptjs";
import { sendSystemEmail } from "./server-email";

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
    const adminEmail = process.env.SYSTEM_ADMIN_EMAIL || "khade8915@gmail.com";
    
    const emailBody = `
New Enterprise Registration Request
===================================
Company Name: ${data.companyName}
Industry: ${data.industry}

Owner Name: ${data.ownerName}
Owner Email: ${data.ownerEmail}
Phone: ${data.mobileNumber}

Time: ${new Date().toISOString()}

Please log in to the System Admin portal (/system-admin) to Review and Approve this request.
    `;

    try {
      await sendSystemEmail({
        to: adminEmail,
        subject: `New Registration Request: ${data.companyName}`,
        body: emailBody,
      });
    } catch (err) {
      console.error("Failed to send admin email:", err);
      // We don't throw here so the registration still succeeds for the user
    }

    return { success: true, registrationId: registration.id };
  });
