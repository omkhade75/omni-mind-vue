import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";

export interface CustomerListItem {
  id: string;
  customerCode: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  joined: string;
  customerType: string;
  visits: number;
  spend: number;
  aov: number;
  favDept: string;
  segment: string;
  churn: number;
  status: string;
  lastVisit: string;
}

export interface Customer360Profile {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  joined: string;
  loyaltyTier: string;
  customerType: string;
  loyaltyPoints: number;
  status: string;
  notes: string | null;
  churnRisk: string;
  churn: number;
  visits: number;
  spend: number;
  aov: number;
  lastVisit: string;
  preferredDept: string;
  transactions: Array<{
    id: string;
    transactionNumber: string;
    date: string;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    itemCount: number;
  }>;
  recentProducts: Array<{
    id: string;
    name: string;
    brand: string;
    qty: number;
    lastPurchased: string;
  }>;
  spendingTrend: Array<{
    month: string;
    spend: number;
  }>;
  paymentPreferences: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  aiInsight: string;
}

// Reusable RBAC scope helper
export function getDepartmentScope(role: string, email?: string): string | null {
  const isManager = role === "manager" || email?.includes("manager") || email?.includes("rohan");
  if (isManager) {
    return "dept-fashion"; // Rohan Kulkarni is Fashion manager
  }
  return null;
}

// 1. Get Customers List
export const getCustomersServer = createServerFn({ method: "POST" })
  .validator((data: {
    search?: string;
    loyaltyTier?: string;
    segment?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    role: string;
    email: string;
  }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    // Build the query conditions
    const where: any = {};

    // Apply soft-delete status filter
    if (data.status && data.status !== "all") {
      where.status = data.status;
    } else {
      where.status = "Active"; // Default to only showing active customers
    }

    // Apply department scope (Rohan - MANAGER, Fashion)
    if (deptScope) {
      where.OR = [
        { preferredDepartmentId: deptScope },
        { transactions: { some: { departmentId: deptScope } } }
      ];
    }

    // Apply loyalty tier filter
    if (data.loyaltyTier && data.loyaltyTier !== "all") {
      where.loyaltyTier = data.loyaltyTier;
    }

    // Apply segment filter
    if (data.segment && data.segment !== "all") {
      if (data.segment === "VIP") {
        where.loyaltyTier = "VIP";
      } else if (data.segment === "Loyal") {
        where.loyaltyTier = "Loyal";
      } else if (data.segment === "At Risk") {
        where.churnRisk = "High";
      } else if (data.segment === "New") {
        // joined in last 90 days of our simulation calendar (March 1 - May 31, 2026)
        // or just joined since March 1, 2026
        where.joinDate = { gte: new Date("2026-03-01") };
      }
    }

    // Apply search query
    if (data.search) {
      const s = data.search.toLowerCase();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { firstName: { contains: s, mode: "insensitive" } },
            { lastName: { contains: s, mode: "insensitive" } },
            { email: { contains: s, mode: "insensitive" } },
            { phone: { contains: s, mode: "insensitive" } },
            { customerCode: { contains: s, mode: "insensitive" } }
          ]
        }
      ];
    }

    // Fetch customer rows
    const customers = await prisma.customer.findMany({
      where,
      include: {
        transactions: {
          include: {
            items: true,
            payments: true,
          }
        }
      }
    });

    // Map to the legacy list shape required by the UI adapter
    const mappedList: CustomerListItem[] = customers.map((c) => {
      // Calculate spend and visits
      const completedTx = c.transactions.filter(t => t.status === "Completed" || t.status === "Paid");
      const visits = completedTx.length;
      const spend = completedTx.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const aov = visits > 0 ? Math.round(spend / visits) : 0;
      
      // Determine favored department
      // Let's count departments in transaction history or use preferred department
      let favDeptName = "Fashion"; // fallback default
      if (c.preferredDepartmentId) {
        if (c.preferredDepartmentId === "dept-electronics") favDeptName = "Electronics";
        else if (c.preferredDepartmentId === "dept-grocery") favDeptName = "Grocery";
        else if (c.preferredDepartmentId === "dept-sports") favDeptName = "Sports";
        else if (c.preferredDepartmentId === "dept-beauty") favDeptName = "Beauty";
      } else if (completedTx.length > 0) {
        const deptCounts: Record<string, number> = {};
        completedTx.forEach(t => {
          deptCounts[t.departmentId] = (deptCounts[t.departmentId] || 0) + 1;
        });
        const topDeptId = Object.keys(deptCounts).sort((a, b) => deptCounts[b] - deptCounts[a])[0];
        if (topDeptId === "dept-electronics") favDeptName = "Electronics";
        else if (topDeptId === "dept-grocery") favDeptName = "Grocery";
        else if (topDeptId === "dept-sports") favDeptName = "Sports";
        else if (topDeptId === "dept-beauty") favDeptName = "Beauty";
      }

      // Convert churnRisk to numeric churn percent for UI mapping
      let churnPercent = 12;
      if (c.churnRisk === "High") churnPercent = 78;
      else if (c.churnRisk === "Medium") churnPercent = 42;

      const sortedTx = [...completedTx].sort((txA, txB) => txB.transactionDate.getTime() - txA.transactionDate.getTime());
      const lastVisitDate = sortedTx[0] ? sortedTx[0].transactionDate.toISOString().split("T")[0] : c.joinDate.toISOString().split("T")[0];

      return {
        id: c.id,
        customerCode: c.customerCode,
        name: `${c.firstName} ${c.lastName}`.trim(),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        joined: c.joinDate.toISOString().split("T")[0],
        visits,
        spend,
        aov,
        favDept: favDeptName,
        segment: c.loyaltyTier,
        customerType: c.customerType,
        churn: churnPercent,
        status: c.status,
        lastVisit: lastVisitDate,
      };
    });

    // Handle Sorting
    const sortBy = data.sortBy || "spend";
    const sortOrder = data.sortOrder || "desc";

    mappedList.sort((a: any, b: any) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (typeof valA === "string") {
        return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });

    return mappedList;
  });

// 2. Add Customer
export const addCustomerServer = createServerFn({ method: "POST" })
  .validator((data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    loyaltyTier: string;
    customerType?: string;
    preferredDepartmentId?: string | null;
    notes?: string;
    role: string;
    emailUser: string;
  }) => data)
  .handler(async ({ data }) => {
    // Validate email uniqueness
    const existingEmail = await prisma.customer.findUnique({
      where: { email: data.email }
    });
    if (existingEmail) {
      throw new Error(`A customer with email ${data.email} already exists.`);
    }

    // Validate phone uniqueness
    const existingPhone = await prisma.customer.findUnique({
      where: { phone: data.phone }
    });
    if (existingPhone) {
      throw new Error(`A customer with phone number ${data.phone} already exists.`);
    }

    const customerCode = `CUST-${Math.floor(10000 + Math.random() * 90000)}`;

    const newCust = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.create({
        data: {
          customerCode,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          loyaltyTier: data.loyaltyTier,
          customerType: data.customerType || "B2C",
          preferredDepartmentId: data.preferredDepartmentId || null,
          notes: data.notes || null,
          status: "Active",
          churnRisk: "Low",
          loyaltyPoints: 0,
        }
      });

      // Write AuditLog
      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "CUSTOMER_CREATED",
          entityType: "Customer",
          entityId: c.id,
          afterData: JSON.stringify(c),
        }
      });

      // Write BusinessEvent
      await tx.businessEvent.create({
        data: {
          eventType: "CUSTOMER_ACQUISITION",
          entityType: "Customer",
          entityId: c.id,
          title: `New Customer Registered: ${c.firstName} ${c.lastName}`,
          description: `Customer acquired under loyalty tier: ${c.loyaltyTier}. Registered globally.`,
          metadata: JSON.stringify({ code: c.customerCode, tier: c.loyaltyTier }),
        }
      });

      return c;
    });

    return newCust;
  });

// 3. Edit Customer
export const editCustomerServer = createServerFn({ method: "POST" })
  .validator((data: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    loyaltyTier: string;
    customerType?: string;
    preferredDepartmentId?: string | null;
    notes?: string;
    role: string;
    emailUser: string;
  }) => data)
  .handler(async ({ data }) => {
    // Validate uniqueness except for current customer
    const existingEmail = await prisma.customer.findUnique({
      where: { email: data.email }
    });
    if (existingEmail && existingEmail.id !== data.id) {
      throw new Error(`Email ${data.email} is already in use by another customer.`);
    }

    const existingPhone = await prisma.customer.findUnique({
      where: { phone: data.phone }
    });
    if (existingPhone && existingPhone.id !== data.id) {
      throw new Error(`Phone number ${data.phone} is already in use by another customer.`);
    }

    const beforeData = await prisma.customer.findUnique({ where: { id: data.id } });

    const updatedCust = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.update({
        where: { id: data.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          loyaltyTier: data.loyaltyTier,
          customerType: data.customerType || "B2C",
          preferredDepartmentId: data.preferredDepartmentId || null,
          notes: data.notes || null,
        }
      });

      // Write AuditLog
      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "CUSTOMER_UPDATED",
          entityType: "Customer",
          entityId: c.id,
          beforeData: JSON.stringify(beforeData),
          afterData: JSON.stringify(c),
        }
      });

      return c;
    });

    return updatedCust;
  });

// 4. Archive Customer (Soft delete)
export const archiveCustomerServer = createServerFn({ method: "POST" })
  .validator((data: {
    id: string;
    role: string;
    emailUser: string;
  }) => data)
  .handler(async ({ data }) => {
    const beforeData = await prisma.customer.findUnique({ where: { id: data.id } });

    const archived = await prisma.$transaction(async (tx) => {
      const c = await tx.customer.update({
        where: { id: data.id },
        data: { status: "Archived" }
      });

      // Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "CUSTOMER_ARCHIVED",
          entityType: "Customer",
          entityId: c.id,
          beforeData: JSON.stringify(beforeData),
          afterData: JSON.stringify(c),
        }
      });

      // Write BusinessEvent
      await tx.businessEvent.create({
        data: {
          eventType: "CUSTOMER_ARCHIVED",
          entityType: "Customer",
          entityId: c.id,
          title: `Customer Archived: ${c.firstName} ${c.lastName}`,
          description: `Customer account was set to Archived. Historical transaction logs preserved.`,
        }
      });

      return c;
    });

    return archived;
  });

// 5. Customer 360 detailed Profile
export const getCustomer360Server = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    // Apply RBAC department filter on transactions if Rohan
    const transactionFilter = deptScope ? { departmentId: deptScope } : {};

    const customer = await prisma.customer.findUnique({
      where: { id: data.id },
      include: {
        transactions: {
          where: transactionFilter,
          include: {
            items: {
              include: {
                product: true
              }
            },
            payments: true
          },
          orderBy: { transactionDate: "desc" }
        }
      }
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Calculations
    const completedTx = customer.transactions.filter(t => t.status === "Completed" || t.status === "Paid");
    const visits = completedTx.length;
    const spend = completedTx.reduce((sum, t) => sum + Number(t.totalAmount), 0);
    const aov = visits > 0 ? Math.round(spend / visits) : 0;
    const lastVisit = completedTx[0];

    // Transactions list
    const transactionsList = customer.transactions.map(t => ({
      id: t.id,
      transactionNumber: t.transactionNumber,
      date: t.transactionDate.toISOString().split("T")[0],
      totalAmount: Number(t.totalAmount),
      paymentMethod: t.payments[0]?.method || "UPI",
      status: t.status,
      itemCount: t.items.reduce((sum, item) => sum + item.quantity, 0)
    }));

    // Recent products purchased
    const productCounts: Record<string, { name: string; brand: string; qty: number; lastDate: string }> = {};
    customer.transactions.forEach(t => {
      t.items.forEach(item => {
        const prod = item.product;
        if (!productCounts[prod.id]) {
          productCounts[prod.id] = {
            name: prod.name,
            brand: prod.brand,
            qty: 0,
            lastDate: t.transactionDate.toISOString().split("T")[0]
          };
        }
        productCounts[prod.id].qty += item.quantity;
      });
    });

    const recentProducts = Object.keys(productCounts).map(id => ({
      id,
      name: productCounts[id].name,
      brand: productCounts[id].brand,
      qty: productCounts[id].qty,
      lastPurchased: productCounts[id].lastDate
    })).sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Spending Trend (by month in mock period)
    const monthSpends: Record<string, number> = {};
    completedTx.forEach(t => {
      const month = t.transactionDate.toLocaleString("en-US", { month: "short", year: "2-digit" });
      monthSpends[month] = (monthSpends[month] || 0) + Number(t.totalAmount);
    });
    
    // Sort chronologically (Mar, Apr, May 26)
    const monthsOrder = ["Mar 26", "Apr 26", "May 26"];
    const spendingTrend = monthsOrder.map(month => ({
      month,
      spend: Math.round(monthSpends[month] || 0)
    }));

    // Payment Preferences
    const payMethods: Record<string, { count: number; amount: number }> = {};
    completedTx.forEach(t => {
      const method = t.payments[0]?.method || "UPI";
      if (!payMethods[method]) {
        payMethods[method] = { count: 0, amount: 0 };
      }
      payMethods[method].count += 1;
      payMethods[method].amount += Number(t.totalAmount);
    });

    const paymentPreferences = Object.keys(payMethods).map(method => ({
      method,
      count: payMethods[method].count,
      amount: Math.round(payMethods[method].amount)
    })).sort((a, b) => b.count - a.count);

    // Preferred Department
    let preferredDept = "Fashion";
    if (customer.preferredDepartmentId) {
      const pDept = await prisma.department.findUnique({ where: { id: customer.preferredDepartmentId } });
      if (pDept) preferredDept = pDept.name;
    }

    // AI Churn Risk analysis and Insight
    let churnPercent = 12;
    let churnText = "low";
    if (customer.churnRisk === "High") {
      churnPercent = 78;
      churnText = "high";
    } else if (customer.churnRisk === "Medium") {
      churnPercent = 42;
      churnText = "medium";
    }

    const aiInsight = `Customer ${customer.firstName} ${customer.lastName} exhibits a ${churnText} risk of churn (${churnPercent}% metric score). Preferred department is ${preferredDept}. Highly responsive to targeted discounts. Loyalty Points: ${customer.loyaltyPoints} points. Recommended next CRM outreach: ${
      churnPercent > 50
        ? `Deploy Win-Back Campaign via SMS/Email offering 20% discount on preferred category (${preferredDept}).`
        : `Include in VIP preview listing for early arrivals.`
    }`;

    return {
      id: customer.id,
      customerCode: customer.customerCode,
      firstName: customer.firstName,
      lastName: customer.lastName,
      name: `${customer.firstName} ${customer.lastName}`.trim(),
      email: customer.email,
      phone: customer.phone,
      joined: customer.joinDate.toISOString().split("T")[0],
      loyaltyTier: customer.loyaltyTier,
      loyaltyPoints: customer.loyaltyPoints,
      status: customer.status,
      notes: customer.notes,
      churnRisk: customer.churnRisk,
      churn: churnPercent,
      visits,
      spend,
      aov,
      lastVisit: lastVisit ? lastVisit.transactionDate.toISOString().split("T")[0] : "Never",
      customerType: customer.customerType,
      preferredDept: preferredDept,
      transactions: transactionsList,
      recentProducts,
      spendingTrend,
      paymentPreferences,
      aiInsight
    } as Customer360Profile;
  });
