import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

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
  .handler(async ({ data }) => {
    const expenses = await prisma.expense.findMany({
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    return expenses.map(e => ({
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
