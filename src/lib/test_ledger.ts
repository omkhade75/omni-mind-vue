import { prisma } from "./server/prisma";

async function main() {
  console.log("Checking accounts and database schemas...");
  try {
    const fds = await prisma.fixedDeposit.findMany();
    console.log(`Found ${fds.length} FDs.`);

    const loans = await prisma.corporateLoan.findMany();
    console.log(`Found ${loans.length} loans.`);

    console.log("All DB tables accessible successfully!");
  } catch (err) {
    console.error("Database query failed with error:", err);
  }
}

main();
