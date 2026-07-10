import { prisma } from "./server/prisma";
import { seedLedgerAccounts } from "./server-ledger";

async function main() {
  console.log("Running server function checks...");
  try {
    const accounts = await prisma.ledgerAccount.findMany({
      include: { entries: true },
    });
    console.log(`Found ${accounts.length} ledger accounts.`);
    
    const investments = await prisma.investment.findMany();
    console.log(`Found ${investments.length} investments.`);

    // Run seed check
    await prisma.$transaction(async (tx) => {
      await seedLedgerAccounts(tx);
    });
    console.log("seedLedgerAccounts completed successfully!");

    console.log("Checks finished successfully!");
  } catch (err) {
    console.error("Check failed with error:", err);
  }
}

main();
