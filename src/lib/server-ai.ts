import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./server/prisma";
import { fmtINR } from "./mock-data";

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
    (data: { query: string; evidenceText: string; intent: string; resolvedDate: string }) => data,
  )
  .handler(async ({ data }) => {
    // Loaded only from environment variable on server side
    const geminiKey = process.env.GEMINI_API_KEY || "";
    const groqKey = process.env.GROQ_API_KEY || "";

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
${data.evidenceText}

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

  // Generic DB summary fallback
  throw new Error("No specific Prisma DB fallback for this intent. Falling back to local intelligence on client.");
}
