import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting SaaS Multi-Tenancy Migration...");

  // 1. Create or ensure the GrandSquare Mall Workspace exists
  const workspaceId = "grandsquare-mall";
  const workspace = await prisma.workspace.upsert({
    where: { id: workspaceId },
    update: {},
    create: {
      id: workspaceId,
      name: "GrandSquare Mall",
      industry: "Retail Real Estate",
      businessType: "Mall Operator",
      timezone: "Asia/Kolkata",
      currency: "INR",
      status: "Active",
      settings: {
        create: {
          branding: JSON.stringify({ primaryColor: "#7c3aed" }),
          features: JSON.stringify({ aiEnabled: true }),
        }
      }
    },
  });

  console.log(`✅ Default Workspace initialized: ${workspace.name} (${workspace.id})`);

  // 2. Ensure the requested demo owner account exists
  const ownerEmail = "om123@gmail.com";
  const ownerPassword = "123456789";
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.upsert({
    where: { 
      email_workspaceId: { 
        email: ownerEmail, 
        workspaceId: workspace.id 
      } 
    },
    update: {
      passwordHash,
      role: "OWNER",
      isSystemAdmin: true,
      workspaceId: workspace.id,
      status: "Active"
    },
    create: {
      name: "Demo Login",
      email: ownerEmail,
      passwordHash,
      role: "OWNER",
      isSystemAdmin: true,
      workspaceId: workspace.id,
      status: "Active"
    },
  });

  console.log(`✅ System Admin / Owner provisioned: ${owner.email}`);

  // 3. Migrate all existing models to this workspace
  const modelsToMigrate = [
    'user',
    'product',
    'customer',
    'transaction',
    'inventoryStock',
    'inventoryLocation',
    'inventoryMovement',
    'supplier',
    'purchaseOrder',
    'department',
    'category',
    'expense',
    'expenseCategory',
    'incomeRecord',
    'goodsReceipt',
    'productBatch',
    'supplierProduct',
    'payment',
    'transactionItem',
    'purchaseOrderItem',
    'goodsReceiptItem',
    'utilityMeter',
    'utilityReading',
    'staff',
    'recommendation',
    'anomaly',
    'businessEvent',
    'auditLog',
    'footfallReading',
    'messageLog',
    'ledgerAccount',
    'ledgerEntry',
    'investment',
    'deliveryDispatch',
    'fixedDeposit',
    'corporateLoan'
  ];

  for (const model of modelsToMigrate) {
    try {
      // @ts-ignore (dynamic model access)
      const result = await prisma[model].updateMany({
        where: {
          workspaceId: null,
        },
        data: {
          workspaceId: workspace.id,
        },
      });
      if (result.count > 0) {
        console.log(`✅ Migrated ${result.count} records in ${model}`);
      }
    } catch (e) {
      console.warn(`⚠️ Skipping or failed migration for ${model}: ${e.message}`);
    }
  }

  console.log("🚀 SaaS Multi-Tenancy Migration Complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
