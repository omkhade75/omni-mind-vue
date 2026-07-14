import { createServerFn } from "@tanstack/react-start";
import { getTenantPrisma } from "./server/prisma";
import { requireAuth } from "./server-auth";
import { recordDoubleEntry } from "./server-ledger";

export interface ExpenseListItem {
  id: string;
  expenseNumber: string;
  date: string;
  category: string;
  description: string;
  vendor: string;
  amount: number;
  departmentId: string | null;
  status: string;
  paymentMethod: string;
}

export const getExpensesServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async () => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    const expenses = await prisma.expense.findMany({
      include: { category: true },
      orderBy: { date: "desc" },
    });

    return expenses.map((e) => ({
      id: e.id,
      expenseNumber: e.expenseNumber,
      date: e.date.toISOString().split("T")[0],
      category: e.category.name,
      description: e.description,
      vendor: e.vendor,
      amount: Number(e.amount),
      departmentId: e.departmentId,
      status: e.status,
      paymentMethod: e.paymentMethod,
    }));
  });

export const addExpenseServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      category: string;
      description: string;
      vendor: string;
      amount: number;
      date: string;
      paymentMethod: string;
      departmentId?: string | null;
      role: string;
      email: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return await prisma.$transaction(async (tx) => {
      let category = // @ts-ignore
 await tx.expenseCategory.findUnique({
        where: { name: data.category } as any,
      });
      if (!category) {
        category = // @ts-ignore
 await tx.expenseCategory.create({
          data: { name: data.category } as any,
        });
      }

      const expense = // @ts-ignore
 await tx.expense.create({
        data: {
                  expenseNumber: `EXP-${Math.floor(100000 + Math.random() * 900000)}`,
                  date: new Date(data.date),
                  categoryId: category.id,
                  description: data.description,
                  vendor: data.vendor,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                  departmentId: data.departmentId || null,
                  createdBy: data.email,
                  status: "Paid",
                } as any,
      });

      let expenseCode = "5400"; // default Procurement/General
      if (
        data.category.toLowerCase().includes("utility") ||
        data.category.toLowerCase().includes("electricity") ||
        data.category.toLowerCase().includes("water")
      ) {
        expenseCode = "5100";
      } else if (
        data.category.toLowerCase().includes("salary") ||
        data.category.toLowerCase().includes("payroll")
      ) {
        expenseCode = "5200";
      } else if (
        data.category.toLowerCase().includes("rent") ||
        data.category.toLowerCase().includes("lease")
      ) {
        expenseCode = "5300";
      } else if (
        data.category.toLowerCase().includes("tax") ||
        data.category.toLowerCase().includes("compliance")
      ) {
        expenseCode = "5600";
      }

      await recordDoubleEntry(tx, {
        journalId: `JNL-EXP-${expense.id}`,
        referenceType: "Expense",
        referenceId: expense.id,
        description: `Recorded expense: ${data.description} (Vendor: ${data.vendor})`,
        debits: [{ code: expenseCode, amount: data.amount }],
        credits: [{ code: "1000", amount: data.amount }],
      });

      return expense;
    });
  });

export const editExpenseServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      category: string;
      description: string;
      vendor: string;
      amount: number;
      date: string;
      paymentMethod: string;
      departmentId?: string | null;
      role: string;
      email: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return await prisma.$transaction(async (tx) => {
      let category = // @ts-ignore
 await tx.expenseCategory.findUnique({
        where: { name: data.category } as any,
      });
      if (!category) {
        category = // @ts-ignore
 await tx.expenseCategory.create({
          data: { name: data.category } as any,
        });
      }

      const expense = // @ts-ignore
 await tx.expense.update({
        where: { id: data.id } as any,
        data: {
                  date: new Date(data.date),
                  categoryId: category.id,
                  description: data.description,
                  vendor: data.vendor,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                  departmentId: data.departmentId || null,
                } as any,
      });

      return expense;
    });
  });

export const archiveExpenseServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const user = await requireAuth();
    const prisma = getTenantPrisma(user.workspaceId);
    return // @ts-ignore
 await prisma.expense.update({
      where: { id: data.id } as any,
      data: { status: "Voided" } as any,
    });
  });
