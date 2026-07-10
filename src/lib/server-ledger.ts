import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash", type: "ASSET" },
  { code: "1200", name: "Accounts Receivable", type: "ASSET" },
  { code: "1300", name: "Inventory Asset", type: "ASSET" },
  { code: "1400", name: "Investment Assets", type: "ASSET" },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
  { code: "4000", name: "Sales Revenue", type: "REVENUE" },
  { code: "4100", name: "Investment Revenues & Gains", type: "REVENUE" },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
  { code: "5100", name: "Utility Expense", type: "EXPENSE" },
  { code: "5200", name: "Salaries Expense", type: "EXPENSE" },
  { code: "5300", name: "Rent & Lease Expense", type: "EXPENSE" },
  { code: "5400", name: "Procurement Expense", type: "EXPENSE" },
  { code: "5500", name: "Investment Losses", type: "EXPENSE" },
];

/**
 * Seed default ledger accounts if none exist in the database yet.
 */
export async function seedLedgerAccounts(tx: any) {
  // 1. Fetch all existing accounts in a single batch query
  const existingAccounts = await tx.ledgerAccount.findMany();
  const existingCodes = new Set(existingAccounts.map((a: any) => a.code));

  // 2. Sequentially create only the missing accounts
  for (const ac of DEFAULT_ACCOUNTS) {
    if (!existingCodes.has(ac.code)) {
      await tx.ledgerAccount.create({
        data: {
          code: ac.code,
          name: ac.name,
          type: ac.type,
        },
      });
    }
  }

  // 3. Seed initial cash reserves if Cash account exists but has no ledger entries recorded
  const cashAc = existingAccounts.find((a: any) => a.code === "1000") || 
                 await tx.ledgerAccount.findUnique({ where: { code: "1000" } });
                 
  if (cashAc) {
    const entriesCount = await tx.ledgerEntry.count({
      where: { accountId: cashAc.id },
    });
    if (entriesCount === 0) {
      await tx.ledgerEntry.create({
        data: {
          journalId: "JNL-INIT-CAPITAL",
          accountId: cashAc.id,
          debitAmount: 5000000,
          creditAmount: 0,
          description: "Initial owner equity capital deposit for treasury operations",
        },
      });
    }
  }
}

/**
 * Record a double-entry journal entry atomically inside a transaction.
 */
export async function recordDoubleEntry(
  tx: any,
  data: {
    journalId: string;
    referenceType: string;
    referenceId: string;
    description: string;
    debits: Array<{ code: string; amount: number }>;
    credits: Array<{ code: string; amount: number }>;
  }
) {
  // 1. Verify debits sum equals credits sum
  const debitsSum = data.debits.reduce((sum, d) => sum + d.amount, 0);
  const creditsSum = data.credits.reduce((sum, c) => sum + c.amount, 0);
  if (Math.abs(debitsSum - creditsSum) > 0.01) {
    throw new Error(`Double-entry balance mismatch! Debits: ₹${debitsSum}, Credits: ₹${creditsSum}`);
  }

  // 2. Ensure accounts exist
  await seedLedgerAccounts(tx);

  // 3. Create Entries
  for (const db of data.debits) {
    const account = await tx.ledgerAccount.findUnique({ where: { code: db.code } });
    if (!account) throw new Error(`Ledger account ${db.code} not found.`);

    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        journalId: data.journalId,
        debitAmount: db.amount,
        creditAmount: 0,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
      },
    });
  }

  for (const cr of data.credits) {
    const account = await tx.ledgerAccount.findUnique({ where: { code: cr.code } });
    if (!account) throw new Error(`Ledger account ${cr.code} not found.`);

    await tx.ledgerEntry.create({
      data: {
        accountId: account.id,
        journalId: data.journalId,
        debitAmount: 0,
        creditAmount: cr.amount,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        description: data.description,
      },
    });
  }
}

/**
 * Fetch trial balance and total debit/credit totals.
 */
export const getLedgerBalancesServer = createServerFn({ method: "GET" })
  .handler(async () => {
    await prisma.$transaction(async (tx) => {
      await seedLedgerAccounts(tx);
    });

    const accounts = await prisma.ledgerAccount.findMany({
      include: {
        entries: true,
      },
    });

    const trialBalance = accounts.map((ac) => {
      const totalDebits = ac.entries.reduce((sum, e) => sum + Number(e.debitAmount), 0);
      const totalCredits = ac.entries.reduce((sum, e) => sum + Number(e.creditAmount), 0);

      // Debit Normal: Assets & Expenses
      // Credit Normal: Liabilities, Equity, Revenues
      let balance = 0;
      if (ac.type === "ASSET" || ac.type === "EXPENSE") {
        balance = totalDebits - totalCredits;
      } else {
        balance = totalCredits - totalDebits;
      }

      return {
        id: ac.id,
        code: ac.code,
        name: ac.name,
        type: ac.type,
        debits: totalDebits,
        credits: totalCredits,
        balance,
      };
    });

    const totalDebits = trialBalance.reduce((sum, a) => sum + a.debits, 0);
    const totalCredits = trialBalance.reduce((sum, a) => sum + a.credits, 0);

    return {
      trialBalance,
      totalDebits,
      totalCredits,
    };
  });
