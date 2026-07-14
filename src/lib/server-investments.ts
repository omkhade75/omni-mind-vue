import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";
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
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
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
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure Ledger accounts exist
      await seedLedgerAccounts(tx);

      // 2. Verify cash balance in General Ledger (code: 1000)
      const cashAccount = // @ts-ignore
 await tx.ledgerAccount.findUnique({
        where: { code: "1000" } as any,
        include: { entries: true },
      });

      const cashBalance = cashAccount
        ? cashAccount.entries.reduce(
            (sum, e) => sum + Number(e.debitAmount) - Number(e.creditAmount),
            0,
          )
        : 0;

      if (cashBalance < data.totalCost) {
        throw new Error(
          `Insufficient corporate cash balance in General Ledger. Available: ₹${cashBalance.toFixed(0)}, Required: ₹${data.totalCost.toFixed(0)}`,
        );
      }

      // 3. Create Investment entry
      const investment = // @ts-ignore
 await tx.investment.create({
        data: {
                  assetName: data.assetName,
                  symbol: data.symbol,
                  purchasePrice: data.purchasePrice,
                  quantity: data.quantity,
                  totalCost: data.totalCost,
                  currentValue: data.totalCost, // Initial currentValue equals totalCost
                  status: "Active",
                } as any,
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
      // @ts-ignore
      await tx.businessEvent.create({
        data: {
                  eventType: "INVESTMENT_PURCHASED",
                  entityType: "Investment",
                  entityId: investment.id,
                  title: `Asset Purchased: ${data.assetName}`,
                  description: `Acquired ${data.quantity} units of ${data.symbol} for a total of ₹${data.totalCost.toFixed(0)}.`,
                  metadata: JSON.stringify({
                    asset: data.assetName,
                    cost: data.totalCost,
                    qty: data.quantity,
                  }),
                } as any,
      });

      // 6. Audit log
      // @ts-ignore
      await tx.auditLog.create({
        data: {
                  userId:
                    data.role === "admin"
                      ? "priya-nair"
                      : data.role === "manager"
                        ? "rohan-kulkarni"
                        : "aarav-mehra",
                  action: "INVESTMENT_CREATE",
                  entityType: "Investment",
                  entityId: investment.id,
                  afterData: JSON.stringify(investment),
                } as any,
      });

      return investment;
    });

    return { success: true, investmentId: result.id };
  });

export const liquidateInvestmentServer = createServerFn({ method: "POST" })
  .validator(
    (data: { investmentId: string; liquidatedPrice: number; role: string; emailUser: string }) =>
      data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current investment
      const investment = // @ts-ignore
 await tx.investment.findUnique({
        where: { id: data.investmentId } as any,
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
      const updatedInvestment = // @ts-ignore
 await tx.investment.update({
        where: { id: data.investmentId } as any,
        data: {
                  status: "Liquidated",
                  liquidatedAt: new Date(),
                  liquidatedPrice: data.liquidatedPrice,
                  liquidatedAmount: liquidatedAmount,
                  currentValue: liquidatedAmount,
                } as any,
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
      // @ts-ignore
      await tx.businessEvent.create({
        data: {
                  eventType: "INVESTMENT_LIQUIDATED",
                  entityType: "Investment",
                  entityId: investment.id,
                  title: `Asset Liquidated: ${investment.assetName}`,
                  description: `Sold ${quantity} units of ${investment.symbol} for ₹${liquidatedAmount.toFixed(0)}, resulting in a ${gainLoss >= 0 ? "gain" : "loss"} of ₹${Math.abs(gainLoss).toFixed(0)}.`,
                  metadata: JSON.stringify({
                    asset: investment.assetName,
                    amount: liquidatedAmount,
                    gainLoss,
                  }),
                } as any,
      });

      // 5. Audit log
      // @ts-ignore
      await tx.auditLog.create({
        data: {
                  userId:
                    data.role === "admin"
                      ? "priya-nair"
                      : data.role === "manager"
                        ? "rohan-kulkarni"
                        : "aarav-mehra",
                  action: "INVESTMENT_LIQUIDATE",
                  entityType: "Investment",
                  entityId: investment.id,
                  afterData: JSON.stringify(updatedInvestment),
                } as any,
      });

      return updatedInvestment;
    });

    return { success: true, investment: result };
  });

export const getLiveMarketDataServer = createServerFn({ method: "POST" })
  .validator((data: {}) => data)
  .handler(async () => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    // Base fallback mock data
    const commodities = [
      { name: "Gold (XAU)", symbol: "XAU", price: 74200, unit: "10g", trend: 1.2, color: "#eab308" },
      { name: "Silver (XAG)", symbol: "XAG", price: 89000, unit: "kg", trend: -0.4, color: "#94a3b8" },
      { name: "Bitcoin (BTC)", symbol: "BTC", price: 5500000, unit: "coin", trend: 2.1, color: "#f7931a" },
      { name: "Retail Industry Index (RTL)", symbol: "RTL", price: 12800, unit: "share", trend: 0.8, color: "#10b981" },
      { name: "Crude Oil (WTI)", symbol: "WTI", price: 6450, unit: "barrel", trend: -1.5, color: "#f97316" },
    ];

    try {
      // 1. Fetch live gold & silver rates for India
      const res = await fetch("https://goldratetodaylive.in/api/v1/rates/today.json");
      if (res.ok) {
        const data = await res.json();
        const gold999 = data.rates?.gold?.["999"];
        if (gold999) commodities[0].price = Math.round(Number(gold999));
        
        const silver999 = data.rates?.silver?.["999"];
        if (silver999) commodities[1].price = Math.round(Number(silver999));
      }
    } catch (e) {
      console.error("Failed to fetch live gold rates", e);
    }

    try {
      // 2. Fetch live Bitcoin rate (Coindesk public API)
      const btcRes = await fetch("https://api.coindesk.com/v1/bpi/currentprice/INR.json");
      if (btcRes.ok) {
        const data = await btcRes.json();
        const btcInr = data.bpi?.INR?.rate_float;
        if (btcInr) commodities[2].price = Math.round(btcInr);
      }
    } catch (e) {
       console.error("Failed to fetch live BTC rate", e);
    }

    return commodities;
  });
