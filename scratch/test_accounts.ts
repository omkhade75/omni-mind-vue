import { getTenantPrisma } from "../src/lib/server/prisma";
import { seedLedgerAccounts } from "../src/lib/server-ledger";

async function main() {
  const prisma = getTenantPrisma("grandsquare-mall");
  
  console.log("1. Accounts Receivable query...");
  const receivables = await prisma.transaction.findMany({
    where: {
      paymentStatus: { in: ["Pending", "Failed"] },
    } as any,
    include: {
      customer: true,
    },
    orderBy: { transactionDate: "desc" },
  });
  console.log(`Receivables count: ${receivables.length}`);

  console.log("2. Accounts Payable ledger entry query...");
  const paidEntries = await prisma.ledgerEntry.findMany({
    where: {
      referenceType: "PurchaseOrderPayment",
    } as any,
    select: {
      referenceId: true,
    },
  });
  console.log(`Paid entries count: ${paidEntries.length}`);

  console.log("3. Purchase Order query...");
  const payables = await prisma.purchaseOrder.findMany({
    where: {
      status: { in: ["Submitted", "Ordered", "Partially_Received", "Sent", "Received"] },
    } as any,
    include: {
      supplier: true,
    },
    orderBy: { orderDate: "desc" },
  });
  console.log(`Payables count: ${payables.length}`);

  console.log("4. Fixed Deposit query...");
  let fds = await prisma.fixedDeposit.findMany({
    orderBy: { startDate: "desc" },
  });
  console.log(`FDs count: ${fds.length}`);

  console.log("5. Corporate Loan query...");
  let loans = await prisma.corporateLoan.findMany({
    orderBy: { takenDate: "desc" },
  });
  console.log(`Loans count: ${loans.length}`);

  console.log("6. Ledger Accounts seed...");
  await seedLedgerAccounts(prisma);

  console.log("7. Ledger Account cash Balance query...");
  const cashAccount = await prisma.ledgerAccount.findFirst({
    where: { code: "1000" } as any,
    include: { entries: true },
  });
  console.log(`Cash account found: ${!!cashAccount}`);
  if (cashAccount) {
    console.log(`Cash entries count: ${cashAccount.entries.length}`);
  }
}

main()
  .catch((e) => {
    console.error("ERROR HAPPENED:");
    console.error(e);
  });
