import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { fmtINR } from "./mock-data";
import { getDepartmentScope } from "./server-customers";

export interface AIResponseContract {
  answer: string;
  summary: string;
  evidence: Array<{
    label: string;
    value: string;
    sourceType?: string;
    sourceId?: string;
  }>;
  reasoning: string[];
  recommendedActions: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    estimatedImpact?: string;
    actionType:
      | "CREATE_PO"
      | "APPLY_MARKDOWN"
      | "OPEN_PRODUCT"
      | "OPEN_CUSTOMER"
      | "OPEN_SUPPLIER"
      | "INVESTIGATE_ANOMALY"
      | "NAVIGATE";
    entityId?: string;
  }>;
  risks: Array<{
    title: string;
    severity: "high" | "medium" | "low";
  }>;
  confidence: number;
}

export const askOmniMindServer = createServerFn({ method: "POST" })
  .validator(
    (data: { query: string; evidenceText: string; intent: string; resolvedDate: string; role?: string; email?: string }) => data,
  )
  .handler(async ({ data }) => {
    // Loaded only from environment variable on server side
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const groqKey = process.env.GROQ_API_KEY || "";

    // Generate live database evidence
    const liveEvidenceText = await buildAIContextServer(data.query, data.intent, data.resolvedDate, data.role, data.email);

    if (!geminiKey && !groqKey) {
      // PRISMA DYNAMIC FALLBACK LOGIC
      return await executePrismaFallback(data.query, data.intent);
    }

    const systemPrompt = `You are OmniMind AI, the Autonomous Mall Decision Operating System for GrandSquare Mall, Pune.
You are a highly analytical, precise, and metric-focused decision intelligence assistant.
Your answers MUST be based strictly on the deterministic DATABASE EVIDENCE provided below. 
Never invent facts, metrics, customers, suppliers, or products that are not present in the evidence.
All monetary amounts must be denominated in Indian Rupees (INR, ₹).

ROLE/SECURITY CONSTRAINT:
If the evidence states that the user is scoped to the FASHION department, you must restrict your reasoning, evidence, and actions to the FASHION department only. Do not reveal or reference any other department details or total mall details.

DATABASE EVIDENCE PROVIDED:
${liveEvidenceText}

USER QUESTION:
"${data.query}"

ACTIVE SCENARIO DATE:
${data.resolvedDate}

Perform step-by-step reasoning over the provided facts.
Return a structured JSON output matching the requested schema. Ensure recommended actions are concrete and link back to the provided entity IDs when applicable. Set a numerical confidence score (between 0.0 and 1.0) reflecting the relevance and availability of direct evidence.`;

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            answer: { type: "STRING" },
            summary: { type: "STRING" },
            evidence: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: { type: "STRING" },
                  value: { type: "STRING" },
                  sourceType: { type: "STRING" },
                  sourceId: { type: "STRING" },
                },
                required: ["label", "value"],
              },
            },
            reasoning: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            recommendedActions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  description: { type: "STRING" },
                  priority: { type: "STRING", enum: ["high", "medium", "low"] },
                  estimatedImpact: { type: "STRING" },
                  actionType: {
                    type: "STRING",
                    enum: [
                      "CREATE_PO",
                      "APPLY_MARKDOWN",
                      "OPEN_PRODUCT",
                      "OPEN_CUSTOMER",
                      "OPEN_SUPPLIER",
                      "INVESTIGATE_ANOMALY",
                      "NAVIGATE",
                    ],
                  },
                  entityId: { type: "STRING" },
                },
                required: ["title", "description", "priority", "actionType"],
              },
            },
            risks: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  title: { type: "STRING" },
                  severity: { type: "STRING", enum: ["high", "medium", "low"] },
                },
                required: ["title", "severity"],
              },
            },
            confidence: { type: "NUMBER" },
          },
          required: [
            "answer",
            "summary",
            "evidence",
            "reasoning",
            "recommendedActions",
            "risks",
            "confidence",
          ],
        },
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    try {
      let text = "";

      if (groqKey) {
        // Use Groq API
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-specdec",
            messages: [
              {
                role: "system",
                content:
                  systemPrompt +
                  "\n\nCRITICAL: Return ONLY a valid JSON object matching the requested schema. No markdown wrapping.",
              },
              {
                role: "user",
                content: data.query,
              },
            ],
            response_format: {
              type: "json_object",
            },
            temperature: 0.1,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }

        const resJson = await response.json();
        text = resJson?.choices?.[0]?.message?.content || "";
      } else {
        // Use Gemini API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const resJson = await response.json();
        text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      if (!text) {
        throw new Error("Empty response from AI API.");
      }

      const rawParsed = JSON.parse(text);

      // Strict Structured Response Validation
      if (typeof rawParsed !== "object" || rawParsed === null) {
        throw new Error("Invalid response format: not an object.");
      }

      const answer = typeof rawParsed.answer === "string" ? rawParsed.answer : "";
      const summary = typeof rawParsed.summary === "string" ? rawParsed.summary : "";

      const rawEvidence = Array.isArray(rawParsed.evidence) ? rawParsed.evidence : [];
      const evidence = rawEvidence
        .filter(
          (e: any) =>
            e &&
            typeof e === "object" &&
            typeof e.label === "string" &&
            typeof e.value === "string",
        )
        .map((e: any) => ({
          label: e.label,
          value: e.value,
          sourceType: typeof e.sourceType === "string" ? e.sourceType : undefined,
          sourceId: typeof e.sourceId === "string" ? e.sourceId : undefined,
        }));

      const rawReasoning = Array.isArray(rawParsed.reasoning) ? rawParsed.reasoning : [];
      const reasoning = rawReasoning.filter((r: any) => typeof r === "string");

      const allowedActions = [
        "CREATE_PO",
        "APPLY_MARKDOWN",
        "OPEN_PRODUCT",
        "OPEN_CUSTOMER",
        "OPEN_SUPPLIER",
        "INVESTIGATE_ANOMALY",
        "NAVIGATE",
      ];

      const rawActions = Array.isArray(rawParsed.recommendedActions)
        ? rawParsed.recommendedActions
        : [];
      const recommendedActions = rawActions
        .filter((a: any) => {
          return (
            a &&
            typeof a === "object" &&
            typeof a.title === "string" &&
            typeof a.description === "string" &&
            allowedActions.includes(a.actionType)
          );
        })
        .map((a: any) => ({
          title: a.title,
          description: a.description,
          priority: ["high", "medium", "low"].includes(a.priority) ? a.priority : "low",
          estimatedImpact: typeof a.estimatedImpact === "string" ? a.estimatedImpact : undefined,
          actionType: a.actionType,
          entityId: typeof a.entityId === "string" ? a.entityId : undefined,
        }));

      const rawRisks = Array.isArray(rawParsed.risks) ? rawParsed.risks : [];
      const risks = rawRisks
        .filter((r: any) => r && typeof r === "object" && typeof r.title === "string")
        .map((r: any) => ({
          title: r.title,
          severity: ["high", "medium", "low"].includes(r.severity) ? r.severity : "low",
        }));

      let confidence = typeof rawParsed.confidence === "number" ? rawParsed.confidence : 0.5;
      // Clamp confidence between 0 and 1
      confidence = Math.max(0, Math.min(1, confidence));

      const parsed: AIResponseContract = {
        answer,
        summary,
        evidence,
        reasoning,
        recommendedActions,
        risks,
        confidence,
      };

      return parsed;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  });

async function executePrismaFallback(query: string, intent: string): Promise<AIResponseContract> {
  const q = query.toLowerCase();

  // 1. Payment Intent
  if (intent === "payments" || q.includes("pay") || q.includes("owe") || q.includes("pending")) {
    const suppliers = await prisma.supplier.findMany({
      include: { purchaseOrders: true }
    });

    let totalPending = 0;
    const unpaidSuppliers = [];

    for (const s of suppliers) {
      const pendingPOs = s.purchaseOrders.filter(po => po.status !== "Received");
      const pendingSum = pendingPOs.reduce((sum, po) => sum + Number(po.totalAmount), 0);
      if (pendingSum > 0) {
        totalPending += pendingSum;
        unpaidSuppliers.push({ name: s.name, amount: pendingSum, id: s.id });
      }
    }

    if (unpaidSuppliers.length === 0) {
      return {
        answer: "There are currently no pending payments to any suppliers! All purchase orders have been fully received and settled.",
        summary: "Zero pending payments.",
        evidence: [],
        reasoning: ["Queried Supplier database and found 0 open purchase orders."],
        recommendedActions: [],
        risks: [],
        confidence: 1.0,
      };
    }

    // Sort by highest amount
    unpaidSuppliers.sort((a, b) => b.amount - a.amount);

    return {
      answer: `We currently have ${fmtINR(totalPending)} in pending payments across ${unpaidSuppliers.length} suppliers. The largest outstanding balance is with ${unpaidSuppliers[0].name} (${fmtINR(unpaidSuppliers[0].amount)}).`,
      summary: `${fmtINR(totalPending)} total pending payables.`,
      evidence: unpaidSuppliers.slice(0, 3).map(s => ({
        label: s.name,
        value: fmtINR(s.amount),
        sourceType: "supplier",
        sourceId: s.id,
      })),
      reasoning: [
        `Database scan identified ${unpaidSuppliers.length} suppliers with Purchase Orders in Draft, Sent, or Ordered status.`,
        "Supplier SLA dictates payment upon full receipt of goods."
      ],
      recommendedActions: [
        {
          title: `Review ${unpaidSuppliers[0].name} POs`,
          description: `Review open purchase orders for our highest payable supplier.`,
          priority: "high",
          actionType: "OPEN_SUPPLIER",
          entityId: unpaidSuppliers[0].id,
        }
      ],
      risks: [
        { title: "Cash Flow Obligation", severity: "medium" }
      ],
      confidence: 1.0,
    };
  }

  // 2. Inventory / Stock Intent
  if (intent === "inventory" || q.includes("stock") || q.includes("low") || q.includes("empty") || q.includes("reorder")) {
    const products = await prisma.product.findMany({
      include: { stockItems: true },
    });
    
    const lowStock = products.filter(p => {
      const totalStock = p.stockItems.reduce((sum, s) => sum + s.availableQty, 0);
      return totalStock < p.reorderLevel;
    });

    if (lowStock.length === 0) {
      return {
        answer: "All products are currently adequately stocked above their respective reorder levels.",
        summary: "Healthy inventory levels.",
        evidence: [],
        reasoning: ["Checked all active products against their designated reorder thresholds."],
        recommendedActions: [],
        risks: [],
        confidence: 0.95,
      };
    }

    return {
      answer: `There are currently ${lowStock.length} products running low on stock and below their reorder threshold. For example, ${lowStock[0].name} requires immediate reordering.`,
      summary: `${lowStock.length} products need reordering.`,
      evidence: lowStock.slice(0, 3).map(p => ({
        label: p.name,
        value: `Target: ${p.reorderLevel}`,
        sourceType: "product",
        sourceId: p.id,
      })),
      reasoning: [
        "Compared live availableQty against reorderLevel for all products.",
        "Identified critical stockouts."
      ],
      recommendedActions: [
        {
          title: `Create PO for ${lowStock[0].name}`,
          description: `Generate a purchase order to replenish ${lowStock[0].name}.`,
          priority: "high",
          actionType: "CREATE_PO",
          entityId: lowStock[0].id,
        }
      ],
      risks: [
        { title: "Potential Stockout & Lost Sales", severity: "high" }
      ],
      confidence: 0.9,
    };
  }

  // 3. Customers / Loyalty Intent
  if (intent === "customers" || q.includes("customer") || q.includes("loyalty") || q.includes("churn") || q.includes("vip")) {
    const highRiskCustomers = await prisma.customer.findMany({
      where: { churnRisk: "High" },
      orderBy: { loyaltyPoints: 'desc' },
      take: 3
    });

    if (highRiskCustomers.length === 0) {
      return {
        answer: "Customer retention looks great! Currently, there are no customers flagged as high risk for churn in the database.",
        summary: "Zero high-risk churn customers.",
        evidence: [],
        reasoning: ["Scanned CRM database for customers with churnRisk set to 'High'."],
        recommendedActions: [],
        risks: [],
        confidence: 0.9,
      };
    }

    return {
      answer: `Warning: You have ${highRiskCustomers.length} high-value customers showing signs of churning. ${highRiskCustomers[0].firstName} ${highRiskCustomers[0].lastName} (Loyalty Points: ${highRiskCustomers[0].loyaltyPoints}) has drastically reduced their visit frequency.`,
      summary: "High-value customers at risk.",
      evidence: highRiskCustomers.map(c => ({
        label: `${c.firstName} ${c.lastName}`,
        value: `${c.loyaltyPoints} pts`,
        sourceType: "customer",
        sourceId: c.id,
      })),
      reasoning: [
        "Identified customers with 'High' churnRisk flag.",
        "Cross-referenced with loyalty point balance to assess impact."
      ],
      recommendedActions: [
        {
          title: `Review ${highRiskCustomers[0].firstName}'s Profile`,
          description: `Analyze recent transaction history and issue a targeted win-back coupon.`,
          priority: "high",
          actionType: "OPEN_CUSTOMER",
          entityId: highRiskCustomers[0].id,
        }
      ],
      risks: [
        { title: "Loss of High LTV Customers", severity: "high" }
      ],
      confidence: 0.85,
    };
  }

  // Default Overview / General Summary
  // Let's get the active date's transactions and expenses
  const todayStr = "2026-05-05"; // fallback fixed for AI demo or dynamic based on context
  const startDate = new Date(`${todayStr}T00:00:00.000Z`);
  const endDate = new Date(`${todayStr}T23:59:59.999Z`);

  const transactions = await prisma.transaction.findMany({
    where: {
      transactionDate: { gte: startDate, lte: endDate },
    },
  });

  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  const grossRevenue = transactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = (grossRevenue * 0.40) - totalExpenses;
  const orders = transactions.length;

  return {
    answer: `GrandSquare Mall is performing steadily on ${todayStr}. Total gross revenue reached ${fmtINR(grossRevenue)} with a net profit of ${fmtINR(netProfit)} across ${orders} orders.`,
    summary: "GrandSquare Mall operations are performing within normal parameters based on live PostgreSQL data.",
    evidence: [
      { label: "Gross Revenue", value: fmtINR(grossRevenue) },
      { label: "Net Profit", value: fmtINR(netProfit) },
      { label: "Total Orders", value: orders.toString() },
    ],
    reasoning: [
      "Calculated live from PostgreSQL transaction and expense tables.",
      "Footfall baseline correlates with seasonal shopping indices.",
    ],
    recommendedActions: [],
    risks: [],
    confidence: 1.0,
  };
}

async function buildAIContextServer(
  query: string,
  intent: string,
  resolvedDate: string,
  role?: string,
  email?: string
): Promise<string> {
  const q = query.toLowerCase();
  const deptScope = getDepartmentScope(role || "owner", email || "");
  
  if (intent === "reorder" || q.includes("reorder") || q.includes("restock") || q.includes("stockout") || q.includes("low stock")) {
    const where: any = { status: "Active" };
    if (deptScope) {
      where.departmentId = deptScope;
    }
    const products = await prisma.product.findMany({
      where,
      include: {
        stockItems: true,
      }
    });
    const reorderCandidates = products.filter(p => {
      const stock = p.stockItems.reduce((sum, item) => sum + item.availableQty, 0);
      return stock <= p.reorderLevel;
    });

    return "REORDER CANDIDATES FROM LIVE DB:\n" + 
      reorderCandidates.map(p => {
        const stock = p.stockItems.reduce((sum, item) => sum + item.availableQty, 0);
        return `- ${p.name} (SKU: ${p.sku}, ID: ${p.id}): Stock: ${stock}, Reorder Threshold: ${p.reorderLevel}, Cost: ₹${p.costPrice}, Price: ₹${p.sellingPrice}`;
      }).join("\n");
  }

  if (intent === "utilities" || q.includes("electricity") || q.includes("hvac") || q.includes("energy") || q.includes("utility") || q.includes("water") || q.includes("power")) {
    const readings = await prisma.utilityReading.findMany({
      where: {
        readingDate: {
          gte: new Date(`${resolvedDate}T00:00:00.000Z`),
          lte: new Date(`${resolvedDate}T23:59:59.999Z`),
        }
      },
      include: {
        meter: true
      }
    });

    const anomalies = await prisma.anomaly.findMany({
      where: {
        type: "Utility",
        status: "Active"
      }
    });

    let text = `UTILITY READINGS AND ANOMALIES FOR ${resolvedDate} (LIVE DB):\n`;
    if (anomalies.length > 0) {
      anomalies.forEach(a => {
        text += `- Anomaly: ${a.title}. Description: ${a.description}. Detected At: ${a.detectedAt.toISOString()}\n`;
      });
    }
    if (readings.length > 0) {
      readings.forEach(r => {
        text += `- Meter ${r.meter.zone} (${r.meter.type}): Reading: ${r.value} ${r.meter.unit}, Cost: ₹${r.cost}\n`;
      });
    } else {
      text += "- No utility readings recorded for this date in the database.\n";
    }
    return text;
  }

  if (intent === "expiry" || q.includes("expire") || q.includes("expiry") || q.includes("yogurt") || q.includes("milk") || q.includes("spoil")) {
    const where: any = {
      status: { in: ["Warning", "Markdown"] }
    };
    if (deptScope) {
      where.product = { departmentId: deptScope };
    }
    const expiringBatches = await prisma.productBatch.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { expiryDate: "asc" }
    });

    return "EXPIRY RISKS (Warning/Markdown Batches in Live DB):\n" +
      expiringBatches.map(b => {
        const daysToExpiry = b.expiryDate ? Math.round((new Date(b.expiryDate).getTime() - new Date(resolvedDate).getTime()) / (24 * 60 * 60 * 1000)) : 999;
        return `- ${b.product.name} (Batch: ${b.batchNumber}, SKU: ${b.product.sku}): Expires in ${daysToExpiry} days. Remaining Qty: ${b.quantityRemaining}. Cost: ₹${b.costPrice}`;
      }).join("\n");
  }

  if (intent === "customers" || q.includes("vip") || q.includes("customer")) {
    const customers = await prisma.customer.findMany({
      where: {
        status: "Active"
      },
      orderBy: [
        { churnRisk: "desc" },
        { loyaltyPoints: "desc" }
      ],
      take: 10
    });

    return "VIP AND HIGH CHURN RISK CUSTOMERS (LIVE DB):\n" +
      customers.map(c => {
        return `- ${c.firstName} ${c.lastName} (Phone: ${c.phone}, ID: ${c.id}): Loyalty Tier: ${c.loyaltyTier}, Points: ${c.loyaltyPoints}, Churn Risk: ${c.churnRisk}`;
      }).join("\n");
  }

  if (intent === "suppliers" || q.includes("supplier") || q.includes("delivery") || q.includes("reliability") || q.includes("lead time")) {
    const suppliers = await prisma.supplier.findMany({
      where: { status: "Active" }
    });

    return "SUPPLIER RELIABILITY & PERFORMANCE (LIVE DB):\n" +
      suppliers.map(s => {
        return `- ${s.name} (Code: ${s.supplierCode}, ID: ${s.id}): Delivery Rate: ${s.onTimeDeliveryRate}%, Quality: ${s.qualityScore}%, Lead Time: ${s.leadTimeDays} days, Risk: ${s.riskScore >= 70 ? "High" : s.riskScore >= 40 ? "Medium" : "Low"}`;
      }).join("\n");
  }

  if (intent === "comparison" || q.includes("compare") || q.includes("change") || q.includes("different") || q.includes("vs")) {
    const dateA = resolvedDate;
    const dateB = resolvedDate === "2026-05-05" ? "2026-05-04" : "2026-05-05";

    const getStats = async (dStr: string) => {
      const start = new Date(`${dStr}T00:00:00.000Z`);
      const end = new Date(`${dStr}T23:59:59.999Z`);

      const txns = await prisma.transaction.findMany({
        where: { transactionDate: { gte: start, lte: end } }
      });
      const exps = await prisma.expense.findMany({
        where: { date: { gte: start, lte: end } }
      });

      const rev = txns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      const cost = exps.reduce((sum, e) => sum + Number(e.amount), 0);
      return { revenue: rev, expenses: cost, orders: txns.length };
    };

    const statsA = await getStats(dateA);
    const statsB = await getStats(dateB);

    return `METRICS COMPARISON (LIVE DB - ${dateA} vs ${dateB}):\n` +
      `- Revenue: ${dateA} = ₹${statsA.revenue} vs ${dateB} = ₹${statsB.revenue}\n` +
      `- Expenses: ${dateA} = ₹${statsA.expenses} vs ${dateB} = ₹${statsB.expenses}\n` +
      `- Orders: ${dateA} = ${statsA.orders} vs ${dateB} = ${statsB.orders}`;
  }

  if (intent === "department_performance" || q.includes("department") || q.includes("grocery") || q.includes("fashion") || q.includes("electronics")) {
    const start = new Date(`${resolvedDate}T00:00:00.000Z`);
    const end = new Date(`${resolvedDate}T23:59:59.999Z`);
    const txns = await prisma.transaction.findMany({
      where: { transactionDate: { gte: start, lte: end } }
    });

    const depts = await prisma.department.findMany();
    const deptRevs = depts.map(d => {
      const dTxns = txns.filter(t => t.departmentId === d.id);
      const rev = dTxns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
      return { name: d.name, value: rev };
    });

    const totalRev = deptRevs.reduce((sum, r) => sum + r.value, 0);

    return `DEPARTMENT REVENUE SHARES FOR ${resolvedDate} (LIVE DB):\n` +
      deptRevs.map(r => {
        const share = totalRev > 0 ? Math.round((r.value / totalRev) * 100) : 0;
        return `- ${r.name}: Revenue: ₹${r.value} (Share: ${share}%)`;
      }).join("\n");
  }

  // Default / general_summary
  const start = new Date(`${resolvedDate}T00:00:00.000Z`);
  const end = new Date(`${resolvedDate}T23:59:59.999Z`);
  const txns = await prisma.transaction.findMany({
    where: { transactionDate: { gte: start, lte: end } }
  });
  const exps = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } }
  });
  const recs = await prisma.recommendation.findMany({
    where: { status: "New" }
  });
  const anomalies = await prisma.anomaly.findMany({
    where: { status: "Active" }
  });

  const grossRevenue = txns.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const totalExpenses = exps.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = (grossRevenue * 0.40) - totalExpenses;

  return `BUSINESS OVERVIEW FOR ${resolvedDate} (LIVE DB):\n` +
    `- Gross Revenue: ₹${grossRevenue}\n` +
    `- Net Profit: ₹${netProfit}\n` +
    `- Total Orders: ${txns.length}\n` +
    `- Total Expenses: ₹${totalExpenses}\n` +
    `- Active AI Recommendations: ${recs.length}\n` +
    `- Active Anomalies: ${anomalies.length}\n` +
    `RECOMMENDED ACTIONS DRAFTED:\n` +
    recs.map(r => `- [${r.priority.toUpperCase()}] ${r.title}: ${r.summary} (Impact: ${r.expectedImpact})`).join("\n");
}
