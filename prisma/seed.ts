import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/db.js";

const prisma = new PrismaClient();

async function main() {
  const startTime = Date.now();
  console.log("Starting database seed diagnostics...");

  try {
    await prisma.$connect();
    console.log("Successfully connected to PostgreSQL database.");
  } catch (err) {
    console.error("PostgreSQL Connection Error: Failed to connect to database.", err);
    process.exit(1);
  }

  // Fetch mock data from simulation
  const rawSeed = seedDatabase();

  // [SEED 1/12] Core entities (Mall, Users, Departments)
  {
    const phaseStart = Date.now();
    console.log("[SEED 1/12] Seeding Core entities...");

    // Mall
    const mallCount = await prisma.mall.count();
    if (mallCount === 0) {
      await prisma.mall.create({
        data: {
          id: "grand-square-mall",
          name: "GrandSquare Mall",
          location: "Pune, Maharashtra",
          timezone: "Asia/Kolkata",
          currency: "INR",
        },
      });
      console.log("Seeded Mall: GrandSquare Mall");
    } else {
      console.log("Mall already seeded, skipping.");
    }

    // Users
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const usersToSeed = [
        {
          id: "user-owner",
          name: "Aarav Mehra",
          email: "aarav@grandsquare.com",
          role: "OWNER",
          status: "Active",
        },
        {
          id: "user-admin",
          name: "Priya Nair",
          email: "priya@grandsquare.com",
          role: "ADMIN",
          status: "Active",
        },
        {
          id: "user-manager",
          name: "Rohan Kulkarni",
          email: "rohan@grandsquare.com",
          role: "MANAGER",
          departmentId: "dept-fashion",
          status: "Active",
        },
      ];
      await prisma.user.createMany({ data: usersToSeed });
      console.log(`Seeded ${usersToSeed.length} Users.`);
    } else {
      console.log("Users already seeded, skipping.");
    }

    // Departments
    const deptCount = await prisma.department.count();
    const deptsToSeed = [
      {
        id: "dept-fashion",
        name: "Fashion",
        code: "FASHION",
        floor: "1st Floor",
        targetRevenue: 5000000,
        status: "Active",
      },
      {
        id: "dept-electronics",
        name: "Electronics",
        code: "ELECTRONICS",
        floor: "2nd Floor",
        targetRevenue: 8000000,
        status: "Active",
      },
      {
        id: "dept-grocery",
        name: "Grocery",
        code: "GROCERY",
        floor: "Ground Floor",
        targetRevenue: 4000000,
        status: "Active",
      },
      {
        id: "dept-sports",
        name: "Sports & Outdoors",
        code: "SPORTS",
        floor: "3rd Floor",
        targetRevenue: 3000000,
        status: "Active",
      },
      {
        id: "dept-beauty",
        name: "Beauty & Cosmetics",
        code: "BEAUTY",
        floor: "1st Floor",
        targetRevenue: 2000000,
        status: "Active",
      },
      {
        id: "dept-others",
        name: "Others",
        code: "OTHERS",
        floor: "Various",
        targetRevenue: 1000000,
        status: "Active",
      },
    ];
    if (deptCount === 0) {
      await prisma.department.createMany({ data: deptsToSeed });
      console.log(`Seeded ${deptsToSeed.length} Departments.`);
    } else {
      console.log("Departments already seeded, skipping.");
    }

    console.log(`[SEED 1/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 2/12] Products & Categories (and Locations, Stocks, SupplierProducts)
  {
    const phaseStart = Date.now();
    console.log("[SEED 2/12] Seeding Categories, Products, and stock setups...");

    // Categories
    const categoriesMap = new Map<string, string>();
    const categoriesList = Array.from(new Set(rawSeed.products.map((p) => p.category)));
    for (const catName of categoriesList) {
      const matchedProduct = rawSeed.products.find((p) => p.category === catName)!;
      const deptCode = matchedProduct.dept.toUpperCase();
      const depts = await prisma.department.findMany();
      const dept =
        depts.find((d) => d.code === deptCode || d.name === matchedProduct.dept) ||
        depts[depts.length - 1];

      const catId = `cat-${catName.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      await prisma.category.upsert({
        where: { id: catId },
        update: { name: catName, departmentId: dept.id },
        create: {
          id: catId,
          name: catName,
          departmentId: dept.id,
        },
      });
      categoriesMap.set(catName, catId);
    }
    console.log(`Synced ${categoriesList.length} Categories.`);

    // Products
    const depts = await prisma.department.findMany();
    for (const p of rawSeed.products) {
      const deptCode = p.dept.toUpperCase();
      const dept =
        depts.find((d) => d.code === deptCode || d.name === p.dept) || depts[depts.length - 1];
      const catId = categoriesMap.get(p.category) || "cat-others";

      await prisma.product.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          brand: p.brand,
          categoryId: catId,
          departmentId: dept.id,
          sellingPrice: p.price,
          costPrice: p.cost,
          reorderLevel: p.reorder,
          reorderQuantity: p.reorder * 2,
        },
        create: {
          id: p.id,
          sku: p.id,
          barcode: `BAR-${p.id.split("-")[1]}`,
          name: p.name,
          brand: p.brand,
          categoryId: catId,
          departmentId: dept.id,
          sellingPrice: p.price,
          costPrice: p.cost,
          taxRate: 18.0,
          reorderLevel: p.reorder,
          reorderQuantity: p.reorder * 2,
          status: "Active",
        },
      });
    }
    console.log(`Synced ${rawSeed.products.length} Products.`);

    // Inventory Locations
    const locCount = await prisma.inventoryLocation.count();
    if (locCount === 0) {
      await prisma.inventoryLocation.create({
        data: {
          id: "loc-warehouse",
          name: "Central Warehouse",
          type: "WAREHOUSE",
          floor: "Basement 1",
        },
      });
      await prisma.inventoryLocation.create({
        data: {
          id: "loc-retail",
          name: "Retail Floor",
          type: "RETAIL_FLOOR",
          floor: "Ground Floor",
        },
      });
      console.log("Seeded Central Warehouse & Retail Floor locations.");
    } else {
      console.log("Inventory locations already seeded.");
    }

    // Inventory Stocks
    for (const p of rawSeed.products) {
      const whStock = await prisma.inventoryStock.findFirst({
        where: { productId: p.id, locationId: "loc-warehouse" },
      });
      if (!whStock) {
        await prisma.inventoryStock.create({
          data: {
            productId: p.id,
            locationId: "loc-warehouse",
            quantityOnHand: p.stock,
            availableQty: p.stock,
          },
        });
      }

      const retStock = await prisma.inventoryStock.findFirst({
        where: { productId: p.id, locationId: "loc-retail" },
      });
      if (!retStock) {
        await prisma.inventoryStock.create({
          data: {
            productId: p.id,
            locationId: "loc-retail",
            quantityOnHand: Math.floor(p.stock * 0.2),
            availableQty: Math.floor(p.stock * 0.2),
          },
        });
      }
    }
    console.log("Synced Inventory Stocks.");

    // Supplier Product relation
    for (const p of rawSeed.products) {
      const supplier = rawSeed.suppliers.find((s) => s.name === p.supplier);
      if (supplier) {
        const relationId = `sp-${supplier.id}-${p.id}`;
        const relationExists = await prisma.supplierProduct.findUnique({
          where: { id: relationId },
        });
        if (!relationExists) {
          await prisma.supplierProduct.create({
            data: {
              id: relationId,
              supplierId: supplier.id,
              productId: p.id,
              supplierPrice: p.cost,
              minimumOrderQuantity: p.reorder,
              leadTimeDays: Math.round(supplier.lead),
              preferred: true,
            },
          });
        }
      }
    }
    console.log("Synced Supplier-Product relations.");

    console.log(`[SEED 2/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 3/12] Customers
  {
    const phaseStart = Date.now();
    console.log("[SEED 3/12] Seeding Customers...");
    const customerCount = await prisma.customer.count();
    if (customerCount === 0) {
      const depts = await prisma.department.findMany();
      for (const cust of rawSeed.customers) {
        const email = `${cust.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@grandsquare.com`;
        const phone = `+91 99900 ${cust.id.split("-")[1] || Math.floor(10000 + Math.random() * 90000)}`;
        const dept = depts.find(
          (d) => d.name === cust.favDept || d.code === cust.favDept.toUpperCase(),
        );

        await prisma.customer.create({
          data: {
            id: cust.id,
            customerCode: cust.id,
            firstName: cust.name.split(" ")[0] || "Customer",
            lastName: cust.name.split(" ").slice(1).join(" ") || "",
            email,
            phone,
            loyaltyTier:
              cust.segment === "VIP" ? "VIP" : cust.segment === "Loyal" ? "Loyal" : "Regular",
            loyaltyPoints: Math.floor((cust.spend || 0) * 0.01),
            joinDate: new Date(cust.joined),
            status: "Active",
            churnRisk:
              cust.churn && cust.churn > 20
                ? "High"
                : cust.churn && cust.churn > 10
                  ? "Medium"
                  : "Low",
            preferredDepartmentId: dept ? dept.id : null,
          },
        });
      }
      console.log(`Seeded ${rawSeed.customers.length} Customers.`);
    } else {
      console.log("Customers already seeded, skipping.");
    }
    console.log(`[SEED 3/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // Setup variables for transactions bulk inserts
  const transactionsData: any[] = [];
  const itemsData: any[] = [];
  const movementsData: any[] = [];
  const paymentsData: any[] = [];

  const depts = await prisma.department.findMany();

  // Parse simulated transactions (only do this if transaction count is 0)
  const transactionCount = await prisma.transaction.count();
  if (transactionCount === 0) {
    for (const tx of rawSeed.transactions) {
      const mainItem = tx.items[0];
      const product = rawSeed.products.find((p) => p.id === mainItem.productId)!;
      const deptCode = product.dept.toUpperCase();
      const dept =
        depts.find((d) => d.code === deptCode || d.name === product.dept) ||
        depts[depts.length - 1];
      const customer = rawSeed.customers.find((c) => c.id === tx.customerId);
      const occurredAt = new Date(`${tx.date}T${tx.time}:00`);

      transactionsData.push({
        id: tx.id,
        transactionNumber: tx.id,
        customerId: customer ? customer.id : null,
        departmentId: dept.id,
        cashierId: "cashier-01",
        transactionDate: occurredAt,
        subtotal: tx.subtotal,
        discountAmount: tx.discount,
        taxAmount: tx.tax,
        totalAmount: tx.total,
        paymentStatus: tx.status === "Refunded" ? "Refunded" : "Paid",
        status: tx.status === "Refunded" ? "Refunded" : "Completed",
      });

      tx.items.forEach((item, idx) => {
        itemsData.push({
          id: `txi-${tx.id.replace("TXN-", "")}-${idx}`,
          transactionId: tx.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
          costPriceSnapshot: item.cost,
          discountAmount: 0.0,
          taxAmount: item.price * item.quantity * 0.18,
          lineTotal: item.price * item.quantity * 1.18,
        });

        movementsData.push({
          productId: item.productId,
          locationId: "loc-retail",
          movementType: "SALE",
          quantity: item.quantity,
          referenceType: "Transaction",
          referenceId: tx.id,
          reason: "POS Sale",
          occurredAt,
        });
      });

      paymentsData.push({
        transactionId: tx.id,
        method: tx.payment || "UPI",
        amount: tx.total,
        status: "Success",
        paidAt: occurredAt,
      });
    }
  }

  // [SEED 4/12] Transactions
  {
    const phaseStart = Date.now();
    console.log("[SEED 4/12] Seeding Transactions...");
    if (transactionCount === 0) {
      await prisma.transaction.createMany({ data: transactionsData });
      console.log(`Seeded ${transactionsData.length} Transactions.`);
    } else {
      console.log("Transactions already seeded, skipping.");
    }
    console.log(`[SEED 4/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 5/12] Transaction items
  {
    const phaseStart = Date.now();
    console.log("[SEED 5/12] Seeding Transaction items...");
    const itemCount = await prisma.transactionItem.count();
    if (itemCount === 0 && itemsData.length > 0) {
      await prisma.transactionItem.createMany({ data: itemsData });
      console.log(`Seeded ${itemsData.length} Transaction items.`);
    } else {
      console.log("Transaction items already seeded, skipping.");
    }
    console.log(`[SEED 5/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 6/12] Payments
  {
    const phaseStart = Date.now();
    console.log("[SEED 6/12] Seeding Payments...");
    const paymentCount = await prisma.payment.count();
    if (paymentCount === 0 && paymentsData.length > 0) {
      await prisma.payment.createMany({ data: paymentsData });
      console.log(`Seeded ${paymentsData.length} Payments.`);
    } else {
      console.log("Payments already seeded, skipping.");
    }
    console.log(`[SEED 6/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 7/12] Inventory movements & Batches
  {
    const phaseStart = Date.now();
    console.log("[SEED 7/12] Seeding Inventory movements & product batches...");

    // Inventory movements
    const movementCount = await prisma.inventoryMovement.count();
    if (movementCount === 0 && movementsData.length > 0) {
      await prisma.inventoryMovement.createMany({ data: movementsData });
      console.log(`Seeded ${movementsData.length} Inventory movements.`);
    } else {
      console.log("Inventory movements already seeded, skipping.");
    }

    // Product batches
    for (const b of rawSeed.batches) {
      const batchExists = await prisma.productBatch.findUnique({
        where: { id: b.id },
      });
      if (!batchExists) {
        const p = rawSeed.products.find((prod) => prod.id === b.productId);
        const supplierName = p ? p.supplier : "";
        const supplier = await prisma.supplier.findFirst({ where: { name: supplierName } });
        const supplierId = supplier ? supplier.id : "SUP-001";

        await prisma.productBatch.create({
          data: {
            id: b.id,
            productId: b.productId,
            batchNumber: b.batchNumber,
            manufacturingDate: b.mfgDate ? new Date(b.mfgDate) : null,
            expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
            quantityReceived: b.quantity,
            quantityRemaining: b.remainingQty,
            costPrice: p ? p.cost : 0,
            supplierId: supplierId,
            receivedAt: b.receivedDate ? new Date(b.receivedDate) : new Date(),
            status: b.status === "expired" ? "Expired" : "Safe",
          },
        });
      }
    }
    console.log(`Synced Product Batches.`);

    console.log(`[SEED 7/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 8/12] Expenses
  {
    const phaseStart = Date.now();
    console.log("[SEED 8/12] Seeding Expenses...");
    const expenseCount = await prisma.expense.count();
    if (expenseCount === 0) {
      const expCatsMap = new Map<string, string>();
      for (const exp of rawSeed.expenses) {
        const categoryId = `cat-${exp.category.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
        await prisma.expenseCategory.upsert({
          where: { id: categoryId },
          update: { name: exp.category },
          create: { id: categoryId, name: exp.category },
        });
        expCatsMap.set(exp.category, categoryId);

        const deptCode = exp.department ? exp.department.toUpperCase() : "OTHERS";
        const dept =
          depts.find((d) => d.code === deptCode || d.name === exp.department) ||
          depts[depts.length - 1];

        await prisma.expense.create({
          data: {
            id: exp.id,
            expenseNumber: exp.id,
            date: new Date(exp.date),
            categoryId,
            description: exp.description || exp.category,
            vendor: exp.vendor || "External Vendor",
            amount: exp.amount,
            departmentId: dept.id,
            status: exp.status || "Paid",
            paymentMethod: "Bank Transfer",
            createdBy: "aarav-mehra",
          },
        });
      }
      console.log(`Seeded ${rawSeed.expenses.length} Expenses.`);
    } else {
      console.log("Expenses already seeded, skipping.");
    }
    console.log(`[SEED 8/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 9/12] Utilities
  {
    const phaseStart = Date.now();
    console.log("[SEED 9/12] Seeding Utilities...");
    const meterCount = await prisma.utilityMeter.count();
    if (meterCount === 0) {
      const meters = [
        { id: "meter-elec", type: "ELECTRICITY", zone: "Whole Mall", unit: "kWh", baseline: 12000 },
        { id: "meter-water", type: "WATER", zone: "Whole Mall", unit: "L", baseline: 8000 },
      ];

      for (const m of meters) {
        const meter = await prisma.utilityMeter.create({ data: m });
        const readingsData: any[] = [];
        for (let dIdx = 0; dIdx < rawSeed.utilities.length; dIdx++) {
          const uReading = rawSeed.utilities[dIdx];
          if (m.type === "ELECTRICITY" && uReading.type === "Electricity") {
            readingsData.push({
              meterId: meter.id,
              readingDate: new Date(uReading.date),
              value: uReading.consumption,
              cost: uReading.cost,
              source: "Meter",
            });
          } else if (m.type === "WATER" && uReading.type === "Water") {
            readingsData.push({
              meterId: meter.id,
              readingDate: new Date(uReading.date),
              value: uReading.consumption,
              cost: uReading.cost,
              source: "Meter",
            });
          }
        }
        await prisma.utilityReading.createMany({ data: readingsData });
      }
      console.log("Seeded utility meters and readings.");
    } else {
      console.log("Utilities already seeded, skipping.");
    }
    console.log(`[SEED 9/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 10/12] Recommendations
  {
    const phaseStart = Date.now();
    console.log("[SEED 10/12] Seeding Recommendations...");
    const recCount = await prisma.recommendation.count();
    if (recCount === 0) {
      for (const rec of rawSeed.recommendations) {
        await prisma.recommendation.create({
          data: {
            id: rec.id,
            type: (rec as any).category || "General",
            title: rec.title,
            summary: (rec as any).evidence || rec.title,
            evidence: JSON.stringify(rec),
            confidence: rec.confidence || 90,
            priority: rec.severity || "medium",
            expectedImpact: (rec as any).impact || null,
            status: rec.status || "New",
            targetEntityType: (rec as any).category || null,
            targetEntityId: (rec as any).relatedEntityId || null,
            generatedAt: new Date("2026-05-05T08:00:00"),
          },
        });
      }
      console.log(`Seeded ${rawSeed.recommendations.length} Recommendations.`);
    } else {
      console.log("Recommendations already seeded, skipping.");
    }
    console.log(`[SEED 10/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 11/12] Anomalies
  {
    const phaseStart = Date.now();
    console.log("[SEED 11/12] Seeding Anomalies...");
    const anomCount = await prisma.anomaly.count();
    if (anomCount === 0) {
      for (const anom of rawSeed.anomalies) {
        await prisma.anomaly.create({
          data: {
            id: anom.id,
            type: (anom as any).metric?.split(" — ")[0] || "General",
            severity: anom.severity || "medium",
            title: (anom as any).metric || "Anomaly",
            description: (anom as any).cause || "Unusual operational behavior detected",
            evidence: JSON.stringify({
              expected: (anom as any).expected,
              actual: (anom as any).actual,
              deviation: (anom as any).deviation,
              when: (anom as any).when,
              action: (anom as any).action,
            }),
            detectedAt: (anom as any).date
              ? new Date((anom as any).date)
              : new Date("2026-05-05T10:00:00"),
            status: anom.status || "Active",
          },
        });
      }
      console.log(`Seeded ${rawSeed.anomalies.length} Anomalies.`);
    } else {
      console.log("Anomalies already seeded, skipping.");
    }
    console.log(`[SEED 11/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  // [SEED 12/12] Purchase orders
  {
    const phaseStart = Date.now();
    console.log("[SEED 12/12] Seeding Purchase orders...");
    const poCount = await prisma.purchaseOrder.count();
    if (poCount === 0) {
      for (const po of rawSeed.purchaseOrders) {
        const supplier =
          (await prisma.supplier.findFirst({ where: { id: po.supplierId } })) ||
          (await prisma.supplier.findFirst());
        const supplierId = supplier ? supplier.id : "SUP-001";
        await prisma.purchaseOrder.create({
          data: {
            id: po.id,
            poNumber: po.id,
            supplierId: supplierId,
            status: po.status === "Received" ? "Received" : "Ordered",
            orderDate: new Date(po.date),
            subtotal: po.totalCost,
            taxAmount: po.totalCost * 0.18,
            totalAmount: po.totalCost * 1.18,
            createdBy: "aarav-mehra",
            notes: po.source,
          },
        });
      }
      console.log(`Seeded ${rawSeed.purchaseOrders.length} Purchase orders.`);
    } else {
      console.log("Purchase orders already seeded, skipping.");
    }
    console.log(`[SEED 12/12] Completed in ${((Date.now() - phaseStart) / 1000).toFixed(2)}s`);
  }

  console.log(
    `Database seed diagnostics completed successfully! Total execution time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`,
  );
}

main()
  .catch((e) => {
    console.error("Error running database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
