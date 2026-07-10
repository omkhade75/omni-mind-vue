import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { getDepartmentScope } from "./server-customers";

export interface ProductListItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  description: string | null;
  brand: string;
  category: string;
  categoryId: string;
  dept: string;
  departmentId: string;
  price: number;
  cost: number;
  margin: number;
  stock: number;
  reorder: number;
  status: string;
  unit: string;
  expiry: string | null;
  supplier: string;
  sold: number;
  revenue: number;
}

export interface Product360Details {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  brand: string;
  category: string;
  dept: string;
  price: number;
  cost: number;
  margin: number;
  status: string;
  unit: string;
  reorder: number;
  currentStock: number;
  stocksByLocation: Array<{
    locationId: string;
    locationName: string;
    quantity: number;
  }>;
  unitsSold30d: number;
  revenue30d: number;
  profit30d: number;
  batches: Array<{
    id: string;
    batchNumber: string;
    mfgDate: string | null;
    expiryDate: string | null;
    receivedQty: number;
    remainingQty: number;
    status: string;
  }>;
  movements: Array<{
    id: string;
    type: string;
    quantity: number;
    location: string;
    occurredAt: string;
    reason: string | null;
  }>;
  supplier: {
    id: string;
    name: string;
    contact: string;
    email: string;
    phone: string;
  } | null;
  expiryRisk: string; // "Low" | "Medium" | "High" | "Expired"
  reorderRecommendation: string;
}

// 1. Get Products List
export const getProductsServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const deptScope = getDepartmentScope(data.role, data.email);

    const where: any = {
      status: "Active",
    };

    if (deptScope) {
      where.departmentId = deptScope;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        stockItems: {
          include: {
            location: true,
          },
        },
        batches: {
          where: { quantityRemaining: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
          take: 1,
        },
        transactionItems: {
          select: {
            quantity: true,
            lineTotal: true,
          },
        },
      },
    });

    const supplierProducts = await prisma.supplierProduct.findMany({
      include: { supplier: true },
    });

    const depts = await prisma.department.findMany();

    const mappedList: ProductListItem[] = products.map((p) => {
      const stock = p.stockItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
      const sellingPrice = Number(p.sellingPrice);
      const costPrice = Number(p.costPrice);
      const margin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;
      const deptObj = depts.find((d) => d.id === p.departmentId);

      const supplierInfo = supplierProducts.find((sp) => sp.productId === p.id);
      const supplierName = supplierInfo ? supplierInfo.supplier.name : "Default Supplier";

      const expiry = p.batches[0]?.expiryDate ? p.batches[0].expiryDate.toISOString().split("T")[0] : null;

      const sold = p.transactionItems.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = p.transactionItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);

      return {
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        description: p.description,
        brand: p.brand,
        category: p.category.name,
        categoryId: p.categoryId,
        dept: deptObj ? deptObj.name : "Others",
        departmentId: p.departmentId,
        price: sellingPrice,
        cost: costPrice,
        margin,
        stock,
        reorder: p.reorderLevel,
        status: p.status,
        unit: p.unit,
        expiry,
        supplier: supplierName,
        sold,
        revenue,
      };
    });

    return mappedList;
  });

// 2. Add Product (with nested creation logic in single transaction)
export const addProductServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      name: string;
      sku: string;
      barcode: string;
      categoryId: string;
      departmentId: string;
      brand: string;
      description?: string;
      sellingPrice: number;
      costPrice: number;
      taxRate?: number;
      unit?: string;
      reorderLevel: number;
      initialStock: number;
      locationId: string; // e.g. "loc-warehouse"
      supplierId?: string;
      batchNumber?: string;
      manufacturingDate?: string;
      expiryDate?: string;
      status?: string;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    // Unique check
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      throw new Error(`Product SKU ${data.sku} already exists.`);
    }
    const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
    if (existingBarcode) {
      throw new Error(`Product Barcode ${data.barcode} already exists.`);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Product
      const product = await tx.product.create({
        data: {
          id: data.sku,
          sku: data.sku,
          barcode: data.barcode,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId,
          departmentId: data.departmentId,
          brand: data.brand,
          sellingPrice: data.sellingPrice,
          costPrice: data.costPrice,
          taxRate: data.taxRate || 18.0,
          reorderLevel: data.reorderLevel,
          reorderQuantity: data.reorderLevel * 2,
          unit: data.unit || "units",
          status: data.status || "Active",
        },
      });

      // 2. Create Stock lines
      const locations = await tx.inventoryLocation.findMany();
      for (const loc of locations) {
        const qty = loc.id === data.locationId ? data.initialStock : 0;
        await tx.inventoryStock.create({
          data: {
            productId: product.id,
            locationId: loc.id,
            quantityOnHand: qty,
            availableQty: qty,
          },
        });
      }

      // 3. Create SupplierProduct mapping if supplier provided
      if (data.supplierId) {
        await tx.supplierProduct.create({
          data: {
            supplierId: data.supplierId,
            productId: product.id,
            supplierPrice: data.costPrice,
            minimumOrderQuantity: data.reorderLevel,
            leadTimeDays: 5, // default
            preferred: true,
          },
        });
      }

      // 4. Create ProductBatch if batchNumber provided
      if (data.batchNumber && data.initialStock > 0 && data.supplierId) {
        const mfg = data.manufacturingDate ? new Date(data.manufacturingDate) : null;
        const exp = data.expiryDate ? new Date(data.expiryDate) : null;

        await tx.productBatch.create({
          data: {
            id: `bat-${product.id}-${data.batchNumber}`,
            productId: product.id,
            batchNumber: data.batchNumber,
            manufacturingDate: mfg,
            expiryDate: exp,
            quantityReceived: data.initialStock,
            quantityRemaining: data.initialStock,
            costPrice: data.costPrice,
            supplierId: data.supplierId,
            status: exp && exp < new Date() ? "Expired" : "Safe",
          },
        });
      }

      // 5. Create opening InventoryMovement
      if (data.initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            locationId: data.locationId,
            movementType: "ADJUSTMENT_IN",
            quantity: data.initialStock,
            reason: "Opening Stock Setup",
            performedBy: data.role,
          },
        });
      }

      // 6. AuditLog
      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "PRODUCT_CREATED",
          entityType: "Product",
          entityId: product.id,
          afterData: JSON.stringify(product),
        },
      });

      // 7. BusinessEvent
      await tx.businessEvent.create({
        data: {
          eventType: "PRODUCT_ADDITION",
          entityType: "Product",
          entityId: product.id,
          title: `New SKU Registered: ${product.name}`,
          description: `Product ${product.name} Added with initial stock of ${data.initialStock} units.`,
        },
      });

      return product;
    });

    return result;
  });

// 3. Edit Product
export const editProductServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      id: string;
      name: string;
      categoryId: string;
      departmentId: string;
      brand: string;
      description?: string;
      sellingPrice: number;
      costPrice: number;
      taxRate?: number;
      unit?: string;
      reorderLevel: number;
      status: string;
      role: string;
      emailUser: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const beforeData = await prisma.product.findUnique({ where: { id: data.id } });

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.id },
        data: {
          name: data.name,
          categoryId: data.categoryId,
          departmentId: data.departmentId,
          brand: data.brand,
          description: data.description || null,
          sellingPrice: data.sellingPrice,
          costPrice: data.costPrice,
          taxRate: data.taxRate || 18.0,
          reorderLevel: data.reorderLevel,
          unit: data.unit || "units",
          status: data.status,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "PRODUCT_UPDATED",
          entityType: "Product",
          entityId: product.id,
          beforeData: JSON.stringify(beforeData),
          afterData: JSON.stringify(product),
        },
      });

      return product;
    });

    return result;
  });

// 4. Archive Product
export const archiveProductServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; emailUser: string }) => data)
  .handler(async ({ data }) => {
    const beforeData = await prisma.product.findUnique({ where: { id: data.id } });

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.id },
        data: { status: "Archived" },
      });

      await tx.auditLog.create({
        data: {
          userId: data.role === "manager" ? "rohan-kulkarni" : data.role === "admin" ? "priya-nair" : "aarav-mehra",
          action: "PRODUCT_ARCHIVED",
          entityType: "Product",
          entityId: product.id,
          beforeData: JSON.stringify(beforeData),
          afterData: JSON.stringify(product),
        },
      });

      await tx.businessEvent.create({
        data: {
          eventType: "PRODUCT_ARCHIVED",
          entityType: "Product",
          entityId: product.id,
          title: `Product Archived: ${product.name}`,
          description: `Product status set to Archived. Inventory tracking paused.`,
        },
      });

      return product;
    });

    return result;
  });

// 5. Product 360 Details Server Query
export const getProduct360Server = createServerFn({ method: "POST" })
  .validator((data: { id: string; role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const product = await prisma.product.findUnique({
      where: { id: data.id },
      include: {
        category: true,
        stockItems: {
          include: {
            location: true,
          },
        },
        batches: {
          orderBy: { expiryDate: "asc" },
        },
        movements: {
          include: {
            location: true,
          },
          orderBy: { occurredAt: "desc" },
          take: 10,
        },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    const depts = await prisma.department.findMany();
    const deptObj = depts.find((d) => d.id === product.departmentId);

    // Calculate 30-day sales
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - 30);

    const completedTxItems = await prisma.transactionItem.findMany({
      where: {
        productId: product.id,
        transaction: {
          status: { in: ["Completed", "Paid"] },
          transactionDate: { gte: dateLimit },
        },
      },
    });

    const unitsSold30d = completedTxItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue30d = completedTxItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const profit30d = revenue30d - unitsSold30d * Number(product.costPrice);

    // Map Locations
    const stocksByLocation = product.stockItems.map((item) => ({
      locationId: item.locationId,
      locationName: item.location.name,
      quantity: item.quantityOnHand,
    }));

    const currentStock = product.stockItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
    const sellingPrice = Number(product.sellingPrice);
    const costPrice = Number(product.costPrice);
    const margin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;

    // Get Supplier info
    const supplierProd = await prisma.supplierProduct.findFirst({
      where: { productId: product.id, preferred: true },
      include: {
        supplier: true,
      },
    });

    const supplierInfo = supplierProd
      ? {
          id: supplierProd.supplier.id,
          name: supplierProd.supplier.name,
          contact: supplierProd.supplier.contactPerson,
          email: supplierProd.supplier.email,
          phone: supplierProd.supplier.phone,
        }
      : null;

    // Determine Expiry Risk
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const nearExpiryBatches = product.batches.filter(
      (b) => b.expiryDate && b.expiryDate <= thirtyDaysFromNow && b.quantityRemaining > 0,
    );
    const expiredBatches = product.batches.filter((b) => b.expiryDate && b.expiryDate < new Date() && b.quantityRemaining > 0);

    let expiryRisk = "Low";
    if (expiredBatches.length > 0) {
      expiryRisk = "Expired";
    } else if (nearExpiryBatches.length > 0) {
      expiryRisk = "High";
    } else if (product.batches.some((b) => b.expiryDate && b.quantityRemaining > 0)) {
      expiryRisk = "Medium";
    }

    // Recommendation logic
    let reorderRecommendation = "Stock level is safe. No reorder required.";
    if (currentStock <= product.reorderLevel) {
      reorderRecommendation = `CRITICAL: Reorder ${
        product.reorderLevel * 2
      } units immediately from ${
        supplierInfo ? supplierInfo.name : "preferred supplier"
      }. Projected stockout in ${unitsSold30d > 0 ? ((currentStock / (unitsSold30d / 30)) * 1).toFixed(1) : "3"} days.`;
    }

    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      category: product.category.name,
      dept: deptObj ? deptObj.name : "Others",
      price: sellingPrice,
      cost: costPrice,
      margin,
      status: product.status,
      unit: product.unit,
      reorder: product.reorderLevel,
      currentStock,
      stocksByLocation,
      unitsSold30d,
      revenue30d,
      profit30d,
      batches: product.batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        mfgDate: b.manufacturingDate ? b.manufacturingDate.toISOString().split("T")[0] : null,
        expiryDate: b.expiryDate ? b.expiryDate.toISOString().split("T")[0] : null,
        receivedQty: b.quantityReceived,
        remainingQty: b.quantityRemaining,
        status: b.status,
      })),
      movements: product.movements.map((m) => ({
        id: m.id,
        type: m.movementType,
        quantity: m.quantity,
        location: m.location.name,
        occurredAt: m.occurredAt.toISOString().split("T")[0],
        reason: m.reason,
      })),
      supplier: supplierInfo,
      expiryRisk,
      reorderRecommendation,
    } as Product360Details;
  });

export const getProductOptionsServer = createServerFn({ method: "POST" })
  .validator((data: { role: string; email: string }) => data)
  .handler(async ({ data }) => {
    const categories = await prisma.category.findMany({ select: { id: true, name: true } });
    const departments = await prisma.department.findMany({ select: { id: true, name: true } });
    const suppliers = await prisma.supplier.findMany({ select: { id: true, name: true } });
    const locations = await prisma.inventoryLocation.findMany({ select: { id: true, name: true } });

    return {
      categories,
      departments,
      suppliers,
      locations,
    };
  });

export const autoCategorizeProductServer = createServerFn({ method: "POST" })
  .validator((data: { name: string; brand: string }) => data)
  .handler(async ({ data }) => {
    const name = data.name.toLowerCase().trim();
    const brand = data.brand.toLowerCase().trim();

    // 1. Keyword mapping rules
    const rules = [
      { keywords: ["milk", "cheese", "butter", "paneer", "curd", "yogurt", "taaza", "amul", "dairy"], categoryId: "cat-dairy", departmentId: "dept-grocery", categoryName: "Dairy" },
      { keywords: ["cola", "juice", "beverage", "soda", "pepsi", "water", "drink", "fanta", "limca", "sprite", "tea", "coffee"], categoryId: "cat-beverages", departmentId: "dept-grocery", categoryName: "Beverages" },
      { keywords: ["bread", "bun", "cookie", "cake", "pastry", "croissant", "bakery", "biscuit", "toast"], categoryId: "cat-bakery", departmentId: "dept-grocery", categoryName: "Bakery" },
      { keywords: ["noodle", "chips", "pasta", "sauce", "ketchup", "maggi", "kurkure", "snack"], categoryId: "cat-packagedfoods", departmentId: "dept-grocery", categoryName: "Packaged Foods" },
      { keywords: ["soap", "toothpaste", "brush", "surf", "detergent", "shampoo", "wash", "fmcg"], categoryId: "cat-fmcg", departmentId: "dept-grocery", categoryName: "FMCG" },
      { keywords: ["shirt", "t-shirt", "jeans", "trousers", "dress", "jacket", "suit", "clothing", "apparel"], categoryId: "cat-apparel", departmentId: "dept-fashion", categoryName: "Apparel" },
      { keywords: ["saree", "kurta", "ethnic", "sherwani", "kurti"], categoryId: "cat-ethnic", departmentId: "dept-fashion", categoryName: "Ethnic" },
      { keywords: ["denim", "levis", "wrangler"], categoryId: "cat-denim", departmentId: "dept-fashion", categoryName: "Denim" },
      { keywords: ["shoe", "sneaker", "slipper", "sandal", "heel", "nike", "adidas", "puma", "footwear"], categoryId: "cat-footwear", departmentId: "dept-fashion", categoryName: "Footwear" },
      { keywords: ["lipstick", "kajal", "makeup", "nail", "eyeliner", "cosmetics"], categoryId: "cat-cosmetics", departmentId: "dept-beauty", categoryName: "Cosmetics" },
      { keywords: ["cream", "lotion", "moisturizer", "serum", "skincare", "sunscreen", "face"], categoryId: "cat-skincare", departmentId: "dept-beauty", categoryName: "Skincare" },
      { keywords: ["phone", "smartphone", "laptop", "samsung", "apple", "charger", "cable", "electronics", "mobile"], categoryId: "cat-electronics", departmentId: "dept-electronics", categoryName: "Electronics" },
      { keywords: ["tv", "television", "screen", "display", "monitor", "sony", "lg"], categoryId: "cat-television", departmentId: "dept-electronics", categoryName: "Television" },
      { keywords: ["speaker", "headphone", "earphone", "audio", "soundbar", "boat", "jbl"], categoryId: "cat-audio", departmentId: "dept-electronics", categoryName: "Audio" },
      { keywords: ["bat", "ball", "racket", "tent", "sports", "gym", "dumbell", "cricket", "football"], categoryId: "cat-sports", departmentId: "dept-sports", categoryName: "Sports & Outdoors" }
    ];

    for (const rule of rules) {
      const match = rule.keywords.some(kw => name.includes(kw) || brand.includes(kw));
      if (match) {
        return {
          categoryId: rule.categoryId,
          departmentId: rule.departmentId,
          categoryName: rule.categoryName,
          confidence: 0.99,
          method: "Rule/Keyword mapping"
        };
      }
    }

    // 2. Fallback to Gemini if key is configured
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `Classify the product "${data.name}" (Brand: "${data.brand}") into one of these category IDs:
cat-dairy, cat-packagedfoods, cat-electronics, cat-apparel, cat-fmcg, cat-bakery, cat-sports, cat-television, cat-denim, cat-beverages, cat-footwear, cat-cosmetics, cat-audio, cat-ethnic, cat-skincare.

Also classify it into one of these department IDs:
dept-grocery, dept-electronics, dept-fashion, dept-beauty, dept-sports, dept-others.

Respond with a raw, valid JSON object containing exactly these fields: { "categoryId": "...", "departmentId": "...", "categoryName": "...", "confidence": 0.8 }. No markdown formatting or extra text.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (response.ok) {
          const resJson = await response.json();
          const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanedText);
          return {
            categoryId: parsed.categoryId || "cat-packagedfoods",
            departmentId: parsed.departmentId || "dept-grocery",
            categoryName: parsed.categoryName || "Packaged Foods",
            confidence: parsed.confidence || 0.85,
            method: "Gemini AI Classification"
          };
        }
      } catch (err) {
        console.warn("⚠️ Gemini auto-classification failed:", err);
      }
    }

    // 3. Default fallback
    return {
      categoryId: "cat-packagedfoods",
      departmentId: "dept-grocery",
      categoryName: "Packaged Foods",
      confidence: 0.50,
      method: "Default classification fallback"
    };
  });

