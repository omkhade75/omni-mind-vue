import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { recordDoubleEntry, seedLedgerAccounts } from "./server-ledger";

export interface InvestmentItem {
  id: string;
  assetName: string;
  symbol: string;
  purchasePrice: number;
  quantity: number;
  totalCost: number;
  currentValue: number;
  status: string;
  purchasedAt: string;
  liquidatedAt?: string | null;
  liquidatedPrice?: number | null;
  liquidatedAmount?: number | null;
}

export const getInvestmentsServer = createServerFn({ method: "POST" })
  .validator((data: {}) => data)
  .handler(async () => {
    const investments = await prisma.investment.findMany({
      orderBy: { purchasedAt: "desc" },
    });

    return investments.map((inv) => ({
      id: inv.id,
      assetName: inv.assetName,
      symbol: inv.symbol,
      purchasePrice: Number(inv.purchasePrice),
      quantity: Number(inv.quantity),
      totalCost: Number(inv.totalCost),
      currentValue: Number(inv.currentValue),
      status: inv.status,
      purchasedAt: inv.purchasedAt.toISOString(),
      liquidatedAt: inv.liquidatedAt ? inv.liquidatedAt.toISOString() : null,
      liquidatedPrice: inv.liquidatedPrice ? Number(inv.liquidatedPrice) : null,
      liquidatedAmount: inv.liquidatedAmount ? Number(inv.liquidatedAmount) : null,
    })) as InvestmentItem[];
  });

export const investCorporateCashServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      assetName: string;
      symbol: string;
      purchasePrice: number;
      quantity: number;
      totalCost: number;
      role: string;
      emailUser: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure Ledger accounts exist
      await seedLedgerAccounts(tx);

      // 2. Verify cash balance in General Ledger (code: 1000)
      const cashAccount = await tx.ledgerAccount.findUnique({
        where: { code: "1000" },
        include: { entries: true },
      });

      const cashBalance = cashAccount
        ? cashAccount.entries.reduce((sum, e) => sum + Number(e.debitAmount) - Number(e.creditAmount), 0)
        : 0;

      if (cashBalance < data.totalCost) {
        throw new Error(
          `Insufficient corporate cash balance in General Ledger. Available: ₹${cashBalance.toFixed(0)}, Required: ₹${data.totalCost.toFixed(0)}`
        );
      }

      // 3. Create Investment entry
      const investment = await tx.investment.create({
        data: {
          assetName: data.assetName,
          symbol: data.symbol,
          purchasePrice: data.purchasePrice,
          quantity: data.quantity,
          totalCost: data.totalCost,
          currentValue: data.totalCost, // Initial currentValue equals totalCost
          status: "Active",
        },
      });

      // 4. Record Double-Entry Journal Entry
      // Debit Investment Assets (Asset account +1400)
      // Credit Cash (Asset account -1000)
      await recordDoubleEntry(tx, {
        journalId: `JNL-INVEST-${investment.id}`,
        referenceType: "Investment",
        referenceId: investment.id,
        description: `Corporate investment in ${data.assetName} (${data.quantity} units @ ₹${data.purchasePrice}/unit)`,
        debits: [{ code: "1400", amount: data.totalCost }],
        credits: [{ code: "1000", amount: data.totalCost }],
      });

      // 5. Register Business Event
      await tx.businessEvent.create({
        data: {
          eventType: "INVESTMENT_PURCHASED",
          entityType: "Investment",
          entityId: investment.id,
          title: `Asset Purchased: ${data.assetName}`,
          description: `Acquired ${data.quantity} units of ${data.symbol} for a total of ₹${data.totalCost.toFixed(0)}.`,
          metadata: JSON.stringify({ asset: data.assetName, cost: data.totalCost, qty: data.quantity }),
        },
      });

      // 6. Audit log
      await tx.auditLog.create({
        data: {
          userId: data.role === "admin" ? "priya-nair" : data.role === "manager" ? "rohan-kulkarni" : "aarav-mehra",
          action: "INVESTMENT_CREATE",
          entityType: "Investment",
          entityId: investment.id,
          afterData: JSON.stringify(investment),
        },
      });

      return investment;
    });

    return { success: true, investmentId: result.id };
  });

export const liquidateInvestmentServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      investmentId: string;
      liquidatedPrice: number;
      role: string;
      emailUser: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current investment
      const investment = await tx.investment.findUnique({
        where: { id: data.investmentId },
      });

      if (!investment) {
        throw new Error("Investment not found.");
      }
      if (investment.status !== "Active") {
        throw new Error("This investment has already been liquidated.");
      }

      const totalCost = Number(investment.totalCost);
      const quantity = Number(investment.quantity);
      const liquidatedAmount = data.liquidatedPrice * quantity;
      const gainLoss = liquidatedAmount - totalCost;

      // 2. Update Investment status to liquidated
      const updatedInvestment = await tx.investment.update({
        where: { id: data.investmentId },
        data: {
          status: "Liquidated",
          liquidatedAt: new Date(),
          liquidatedPrice: data.liquidatedPrice,
          liquidatedAmount: liquidatedAmount,
          currentValue: liquidatedAmount,
        },
      });

      // 3. Record Double-Entry Journal Entry
      // Debit Cash (Asset +1000) -> liquidatedAmount
      // Credit Investment Assets (Asset -1400) -> totalCost
      // If Gain: Credit Investment Revenues & Gains (Revenue +4100) -> gainLoss
      // If Loss: Debit Investment Losses (Expense +5500) -> abs(gainLoss)
      const debits: Array<{ code: string; amount: number }> = [];
      const credits: Array<{ code: string; amount: number }> = [];

      debits.push({ code: "1000", amount: liquidatedAmount });
      credits.push({ code: "1400", amount: totalCost });

      if (gainLoss > 0) {
        credits.push({ code: "4100", amount: gainLoss });
      } else if (gainLoss < 0) {
        debits.push({ code: "5500", amount: Math.abs(gainLoss) });
      }

      await recordDoubleEntry(tx, {
        journalId: `JNL-LIQUID-${investment.id}`,
        referenceType: "Investment",
        referenceId: investment.id,
        description: `Corporate investment liquidation of ${investment.assetName} (${quantity} units @ ₹${data.liquidatedPrice}/unit)`,
        debits,
        credits,
      });

      // 4. Register Business Event
      await tx.businessEvent.create({
        data: {
          eventType: "INVESTMENT_LIQUIDATED",
          entityType: "Investment",
          entityId: investment.id,
          title: `Asset Liquidated: ${investment.assetName}`,
          description: `Sold ${quantity} units of ${investment.symbol} for ₹${liquidatedAmount.toFixed(0)}, resulting in a ${gainLoss >= 0 ? "gain" : "loss"} of ₹${Math.abs(gainLoss).toFixed(0)}.`,
          metadata: JSON.stringify({ asset: investment.assetName, amount: liquidatedAmount, gainLoss }),
        },
      });

      // 5. Audit log
      await tx.auditLog.create({
        data: {
          userId: data.role === "admin" ? "priya-nair" : data.role === "manager" ? "rohan-kulkarni" : "aarav-mehra",
          action: "INVESTMENT_LIQUIDATE",
          entityType: "Investment",
          entityId: investment.id,
          afterData: JSON.stringify(updatedInvestment),
        },
      });

      return updatedInvestment;
    });

    return { success: true, investment: result };
  });
