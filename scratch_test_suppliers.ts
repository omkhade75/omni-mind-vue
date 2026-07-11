import { prisma } from "./src/lib/server/prisma";

async function main() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { status: { not: "Archived" } },
      include: {
        purchaseOrders: true,
        supplierProducts: true,
      },
      orderBy: { name: "asc" },
    });

    console.log("QUERY SUCCESS: Found", suppliers.length, "suppliers.");

    const products = await prisma.product.findMany({
      include: { category: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const mapped = suppliers.map((s) => {
      const receivedPOs = s.purchaseOrders.filter(
        (po) => po.status === "Received" || po.status === "Partially_Received",
      );
      const pendingPOs = s.purchaseOrders.filter(
        (po) =>
          po.status === "Draft" ||
          po.status === "Ordered" ||
          po.status === "Sent" ||
          po.status === "Approved" ||
          po.status === "Submitted",
      );

      const spend = receivedPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      const pending = pendingPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);

      const onTime = Number(s.onTimeDeliveryRate);
      const quality = Number(s.qualityScore);
      const riskScore = Number(s.riskScore);
      const lead = s.leadTimeDays;

      let risk = "Low";
      if (riskScore > 60) risk = "High";
      else if (riskScore > 30) risk = "Medium";

      const score = Math.round(onTime + quality - riskScore / 2);

      const firstProductId = s.supplierProducts[0]?.productId;
      const associatedProduct = firstProductId ? productMap.get(firstProductId) : null;
      const category = associatedProduct?.category?.name || "General";

      return {
        id: s.id,
        supplierCode: s.supplierCode,
        name: s.name,
        category,
        contact: s.contactPerson,
        spend,
        pending,
        onTime,
        quality,
        lead,
        risk,
        score: Math.min(100, Math.max(0, score)),
        email: s.email,
        phone: s.phone,
        address: s.address,
        paymentTerms: s.paymentTerms,
      };
    });

    console.log("MAP SUCCESS: Mapped", mapped.length, "suppliers.");
  } catch (err) {
    console.error("PRISMA CRASH:", err);
  }
}

main();
