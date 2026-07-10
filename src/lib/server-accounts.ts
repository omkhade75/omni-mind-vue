import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { recordDoubleEntry, seedLedgerAccounts } from "./server-ledger";

export interface FixedDepositItem {
  id: string;
  bankName: string;
  principal: number;
  interestRate: number;
  duration: number;
  status: string;
  startDate: string;
  matureDate: string;
}

export interface CorporateLoanItem {
  id: string;
  bankName: string;
  principal: number;
  interestRate: number;
  balance: number;
  duration: number;
  status: string;
  takenDate: string;
}

export const getAccountsDataServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    // 1. Accounts Receivable (Customer owes us)
    const receivables = await prisma.transaction.findMany({
      where: {
        paymentStatus: { in: ["Pending", "Failed"] }
      },
      include: {
        customer: true
      },
      orderBy: { transactionDate: "desc" }
    });

    // 2. Accounts Payable (We owe Supplier)
    const payables = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: ["Ordered", "Draft"] }
      },
      include: {
        supplier: true
      },
      orderBy: { orderDate: "desc" }
    });

    // 3. Fixed Deposits
    let fds = await prisma.fixedDeposit.findMany({
      orderBy: { startDate: "desc" }
    });

    // Seed mock active FDs if empty
    if (fds.length === 0) {
      await prisma.fixedDeposit.createMany({
        data: [
          {
            bankName: "HDFC Treasury FD",
            principal: 300000,
            interestRate: 7.25,
            duration: 12,
            status: "Active",
            startDate: new Date(Date.now() - 90 * 24 * 3600 * 1000), // 3 months ago
            matureDate: new Date(Date.now() + 270 * 24 * 3600 * 1000), // 9 months left
          },
          {
            bankName: "SBI Corporate Bond",
            principal: 200000,
            interestRate: 6.90,
            duration: 24,
            status: "Active",
            startDate: new Date(Date.now() - 180 * 24 * 3600 * 1000), // 6 months ago
            matureDate: new Date(Date.now() + 540 * 24 * 3600 * 1000), // 18 months left
          }
        ]
      });
      fds = await prisma.fixedDeposit.findMany({
        orderBy: { startDate: "desc" }
      });
    }

    // 4. Corporate Loans
    let loans = await prisma.corporateLoan.findMany({
      orderBy: { takenDate: "desc" }
    });

    // Seed mock active Loans if empty
    if (loans.length === 0) {
      await prisma.corporateLoan.createMany({
        data: [
          {
            bankName: "SBI Business Expansion Loan",
            principal: 1200000,
            interestRate: 9.50,
            balance: 850000,
            duration: 36,
            status: "Active",
            takenDate: new Date(Date.now() - 365 * 24 * 3600 * 1000), // 1 year ago
          },
          {
            bankName: "ICICI Equipment Line",
            principal: 300000,
            interestRate: 11.20,
            balance: 240000,
            duration: 12,
            status: "Active",
            takenDate: new Date(Date.now() - 60 * 24 * 3600 * 1000), // 2 months ago
          }
        ]
      });
      loans = await prisma.corporateLoan.findMany({
        orderBy: { takenDate: "desc" }
      });
    }

    // 5. Fetch General Cash Ledger Account Balance (Code 1000)
    await seedLedgerAccounts(prisma);
    const cashAccount = await prisma.ledgerAccount.findUnique({
      where: { code: "1000" },
      include: { entries: true }
    });
    let cashBalance = 0;
    if (cashAccount) {
      const totalDebits = cashAccount.entries.reduce((sum, e) => sum + Number(e.debitAmount), 0);
      const totalCredits = cashAccount.entries.reduce((sum, e) => sum + Number(e.creditAmount), 0);
      cashBalance = totalDebits - totalCredits;
    }

    return {
      cashBalance,
      receivables: receivables.map(r => ({
        id: r.id,
        transactionNumber: r.transactionNumber,
        date: r.transactionDate.toISOString(),
        amount: Number(r.totalAmount),
        status: r.paymentStatus,
        customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}`.trim() : "Walk-in Customer",
        customerId: r.customerId
      })),
      payables: payables.map(p => ({
        id: p.id,
        poNumber: p.poNumber,
        date: p.orderDate.toISOString(),
        amount: Number(p.totalAmount),
        status: p.status,
        supplierName: p.supplier ? p.supplier.name : "Unknown Supplier",
        supplierId: p.supplierId
      })),
      fds: fds.map(f => ({
        id: f.id,
        bankName: f.bankName,
        principal: Number(f.principal),
        interestRate: Number(f.interestRate),
        duration: f.duration,
        status: f.status,
        startDate: f.startDate.toISOString(),
        matureDate: f.matureDate.toISOString(),
      })) as FixedDepositItem[],
      loans: loans.map(l => ({
        id: l.id,
        bankName: l.bankName,
        principal: Number(l.principal),
        interestRate: Number(l.interestRate),
        balance: Number(l.balance),
        duration: l.duration,
        status: l.status,
        takenDate: l.takenDate.toISOString(),
      })) as CorporateLoanItem[],
    };
  });

export const createFixedDepositServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      bankName: string;
      principal: number;
      interestRate: number;
      duration: number;
      role: string;
      emailUser: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      await seedLedgerAccounts(tx);

      // Verify cash balance
      const cashAccount = await tx.ledgerAccount.findUnique({
        where: { code: "1000" },
        include: { entries: true },
      });
      const cashBalance = cashAccount
        ? cashAccount.entries.reduce((sum, e) => sum + Number(e.debitAmount) - Number(e.creditAmount), 0)
        : 0;

      if (cashBalance < data.principal) {
        throw new Error(`Insufficient cash balance (₹${cashBalance.toFixed(0)}) to create FD of ₹${data.principal.toFixed(0)}.`);
      }

      const matureDate = new Date(Date.now() + data.duration * 30 * 24 * 3600 * 1000);

      const fd = await tx.fixedDeposit.create({
        data: {
          bankName: data.bankName,
          principal: data.principal,
          interestRate: data.interestRate,
          duration: data.duration,
          status: "Active",
          matureDate,
        },
      });

      // Record GL Double-Entry (Debit 1400 Investment Asset, Credit 1000 Cash Asset)
      await recordDoubleEntry(tx, {
        journalId: `JNL-FD-${fd.id}`,
        referenceType: "FixedDeposit",
        referenceId: fd.id,
        description: `Created Bank Fixed Deposit at ${data.bankName} (Principal: ₹${data.principal.toFixed(0)}, Rate: ${data.interestRate}%)`,
        debits: [{ code: "1400", amount: data.principal }],
        credits: [{ code: "1000", amount: data.principal }],
      });

      return fd;
    });

    return { success: true, fdId: result.id };
  });

export const createCorporateLoanServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      bankName: string;
      principal: number;
      interestRate: number;
      duration: number;
      role: string;
      emailUser: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      await seedLedgerAccounts(tx);

      const loan = await tx.corporateLoan.create({
        data: {
          bankName: data.bankName,
          principal: data.principal,
          interestRate: data.interestRate,
          balance: data.principal,
          duration: data.duration,
          status: "Active",
        },
      });

      // Record GL Double-Entry (Debit 1000 Cash Asset, Credit 2000 Accounts Payable/Liability)
      await recordDoubleEntry(tx, {
        journalId: `JNL-LOAN-${loan.id}`,
        referenceType: "CorporateLoan",
        referenceId: loan.id,
        description: `Disbursed Corporate Loan from ${data.bankName} (Principal: ₹${data.principal.toFixed(0)}, Rate: ${data.interestRate}%)`,
        debits: [{ code: "1000", amount: data.principal }],
        credits: [{ code: "2000", amount: data.principal }],
      });

      return loan;
    });

    return { success: true, loanId: result.id };
  });

export const repayLoanServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      loanId: string;
      amount: number;
      role: string;
      emailUser: string;
    }) => data
  )
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      await seedLedgerAccounts(tx);

      const loan = await tx.corporateLoan.findUnique({
        where: { id: data.loanId },
      });

      if (!loan) {
        throw new Error("Loan record not found.");
      }

      // Verify cash balance
      const cashAccount = await tx.ledgerAccount.findUnique({
        where: { code: "1000" },
        include: { entries: true },
      });
      const cashBalance = cashAccount
        ? cashAccount.entries.reduce((sum, e) => sum + Number(e.debitAmount) - Number(e.creditAmount), 0)
        : 0;

      if (cashBalance < data.amount) {
        throw new Error(`Insufficient cash balance (₹${cashBalance.toFixed(0)}) to make repayment of ₹${data.amount.toFixed(0)}.`);
      }

      const newBalance = Math.max(0, Number(loan.balance) - data.amount);
      const newStatus = newBalance <= 0 ? "Paid" : "Active";

      const updated = await tx.corporateLoan.update({
        where: { id: data.loanId },
        data: {
          balance: newBalance,
          status: newStatus,
        },
      });

      // Record GL Double-Entry (Debit 2000 Liability, Credit 1000 Cash Asset)
      await recordDoubleEntry(tx, {
        journalId: `JNL-REPAY-${loan.id}-${Date.now()}`,
        referenceType: "CorporateLoan",
        referenceId: loan.id,
        description: `Corporate Loan Repayment to ${loan.bankName} (Amount: ₹${data.amount.toFixed(0)}, Remaining balance: ₹${newBalance.toFixed(0)})`,
        debits: [{ code: "2000", amount: data.amount }],
        credits: [{ code: "1000", amount: data.amount }],
      });

      return updated;
    });

    return { success: true, loanId: result.id };
  });

export const payPurchaseOrderServer = createServerFn({ method: "POST" })
  .validator((data: { poId: string; role: string; emailUser: string }) => data)
  .handler(async ({ data }) => {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ensure Ledger accounts exist
      await seedLedgerAccounts(tx);

      // 2. Fetch the Purchase Order
      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.poId },
      });

      if (!po) throw new Error("Purchase Order not found.");

      // 3. Check if already paid by looking for existing payment journal entry
      const existingPayment = await tx.ledgerEntry.findFirst({
        where: {
          referenceType: "PurchaseOrderPayment",
          referenceId: po.id,
        },
      });

      if (existingPayment) {
        throw new Error("This Purchase Order has already been paid.");
      }

      // 4. Verify cash balance in General Ledger
      const cashAccount = await tx.ledgerAccount.findUnique({
        where: { code: "1000" },
        include: { entries: true },
      });

      const cashBalance = cashAccount
        ? cashAccount.entries.reduce((sum, e) => sum + Number(e.debitAmount) - Number(e.creditAmount), 0)
        : 0;

      const poAmount = Number(po.totalAmount);
      if (cashBalance < poAmount) {
        throw new Error(
          `Insufficient cash reserves. Available: ₹${cashBalance.toLocaleString("en-IN")}, Required: ₹${poAmount.toLocaleString("en-IN")}`
        );
      }

      // 5. Record Double-Entry Journal Entry
      // Debit Procurement Expense (5400) — cost of goods purchased
      // Credit Cash (1000) — cash paid out
      await recordDoubleEntry(tx, {
        journalId: `JNL-PAY-PO-${po.id}`,
        referenceType: "PurchaseOrderPayment",
        referenceId: po.id,
        description: `Paid supplier invoice for PO #${po.poNumber} (₹${poAmount.toLocaleString("en-IN")})`,
        debits: [{ code: "5400", amount: poAmount }],
        credits: [{ code: "1000", amount: poAmount }],
      });

      // 6. Record Business Event
      await tx.businessEvent.create({
        data: {
          eventType: "PURCHASE_ORDER_PAID",
          entityType: "PurchaseOrder",
          entityId: po.id,
          title: `PO Paid: #${po.poNumber}`,
          description: `Disbursed ₹${poAmount.toLocaleString("en-IN")} from cash reserves to pay supplier.`,
          metadata: JSON.stringify({ poId: po.id, amount: poAmount }),
        },
      });

      return po.id;
    });

    return { success: true, poId: result };
  });

