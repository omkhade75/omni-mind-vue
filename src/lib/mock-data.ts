// Realistic mock data for GrandSquare Mall, Pune

export const MALL = {
  name: "GrandSquare Mall",
  location: "Pune, Maharashtra",
  tagline: "From Mall Data to Intelligent Decisions.",
};

export const DEPARTMENTS = [
  "Grocery",
  "Fashion",
  "Electronics",
  "Home & Living",
  "Beauty",
  "Food Court",
  "Pharmacy",
  "Sports",
  "Kids",
  "Fresh Produce",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

// Deterministic pseudo-random for stable UI
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const fmtINR = (n: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact) {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
    return `₹${Math.round(n)}`;
  }
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const fmtNum = (n: number) => n.toLocaleString("en-IN");

// KPIs
export const KPIS = [
  {
    key: "revenue",
    label: "Gross Revenue",
    value: 4872000,
    delta: 8.4,
    spark: buildSpark(12, 4200000, 5000000),
  },
  {
    key: "profit",
    label: "Net Profit",
    value: 984000,
    delta: 4.1,
    spark: buildSpark(24, 800000, 1050000),
  },
  {
    key: "orders",
    label: "Total Orders",
    value: 12486,
    delta: 6.2,
    spark: buildSpark(35, 10000, 13000),
  },
  {
    key: "footfall",
    label: "Total Footfall",
    value: 31240,
    delta: 12.7,
    spark: buildSpark(48, 25000, 33000),
  },
  {
    key: "newCustomers",
    label: "New Customers",
    value: 1284,
    delta: 3.5,
    spark: buildSpark(57, 900, 1400),
  },
  {
    key: "aov",
    label: "Average Order Value",
    value: 1842,
    delta: -1.8,
    spark: buildSpark(66, 1700, 1950),
  },
  {
    key: "inventory",
    label: "Inventory Value",
    value: 38200000,
    delta: 2.1,
    spark: buildSpark(75, 36000000, 39000000),
  },
  {
    key: "expenses",
    label: "Total Expenses",
    value: 1246000,
    delta: 5.4,
    spark: buildSpark(84, 1100000, 1300000),
  },
];

function buildSpark(seed: number, min: number, max: number, n = 14) {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => ({
    i,
    v: Math.round(min + r() * (max - min)),
  }));
}

// Revenue trend (30 days)
export const REVENUE_30D = Array.from({ length: 30 }, (_, i) => {
  const r = seeded(i + 100);
  const base = 140000 + r() * 60000;
  const weekend = i % 7 === 5 || i % 7 === 6 ? 1.35 : 1;
  const revenue = Math.round(base * weekend);
  const profit = Math.round(revenue * (0.16 + r() * 0.08));
  const prev = Math.round(revenue * (0.85 + r() * 0.2));
  return {
    day: `${i + 1}`,
    date: `2026-05-${String(i + 1).padStart(2, "0")}`,
    revenue,
    profit,
    prev,
    orders: Math.round(300 + r() * 250),
    footfall: Math.round(800 + r() * 500),
  };
});

// Hourly demand
export const HOURLY_DEMAND = Array.from({ length: 24 }, (_, h) => {
  let base = 20;
  if (h >= 10 && h <= 13) base = 180 + h * 8;
  else if (h >= 14 && h <= 17) base = 140 + (17 - h) * 12;
  else if (h >= 18 && h <= 21) base = 320 + (21 - h) * 15;
  else if (h < 9 || h > 22) base = 5;
  const r = seeded(h * 13);
  return {
    hour: `${String(h).padStart(2, "0")}:00`,
    footfall: Math.round(base + r() * 40),
    sales: Math.round((base + r() * 40) * 320),
  };
});

// Sales heatmap: day of week × hour
export const HEATMAP = (() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.flatMap((d, di) =>
    Array.from({ length: 14 }, (_, hi) => {
      const h = hi + 9;
      const r = seeded(di * 100 + h);
      const weekend = di >= 5 ? 1.6 : 1;
      const peak = h >= 18 && h <= 21 ? 1.8 : h >= 12 && h <= 14 ? 1.3 : 1;
      return { day: d, hour: `${h}`, v: Math.round(30 + r() * 40 * peak * weekend) };
    }),
  );
})();

// Department contribution
export const DEPARTMENT_REVENUE = [
  { name: "Fashion", value: 1240000, margin: 22.4, color: "var(--chart-1)" },
  { name: "Electronics", value: 1080000, margin: 12.1, color: "var(--chart-2)" },
  { name: "Grocery", value: 890000, margin: 8.6, color: "var(--chart-3)" },
  { name: "Food Court", value: 520000, margin: 28.2, color: "var(--chart-4)" },
  { name: "Beauty", value: 380000, margin: 26.8, color: "var(--chart-5)" },
  { name: "Home & Living", value: 340000, margin: 18.4, color: "var(--chart-1)" },
  { name: "Pharmacy", value: 220000, margin: 14.2, color: "var(--chart-2)" },
  { name: "Sports", value: 108000, margin: 21.6, color: "var(--chart-3)" },
  { name: "Kids", value: 62000, margin: 24.3, color: "var(--chart-4)" },
  { name: "Fresh Produce", value: 52000, margin: 9.4, color: "var(--chart-5)" },
];

// Forecast
export const FORECAST = Array.from({ length: 21 }, (_, i) => {
  const r = seeded(i + 500);
  const past = i < 14;
  const base = 150000 + Math.sin(i / 2) * 40000 + r() * 30000;
  return {
    day: `Day ${i + 1}`,
    actual: past ? Math.round(base) : null,
    forecast: !past ? Math.round(base * (1.02 + r() * 0.08)) : null,
    upper: !past ? Math.round(base * 1.15) : null,
    lower: !past ? Math.round(base * 0.88) : null,
  };
});

// Products
export const PRODUCTS = [
  {
    id: "SKU-10021",
    name: "Amul Taaza Milk 1L",
    category: "Dairy",
    dept: "Grocery",
    brand: "Amul",
    price: 68,
    cost: 54,
    stock: 128,
    reorder: 200,
    expiry: "2026-05-08",
    supplier: "Amul Foods Ltd",
    sold: 842,
    revenue: 57256,
    margin: 20.6,
    status: "low",
  },
  {
    id: "SKU-20034",
    name: 'Samsung 55" QLED TV',
    category: "Television",
    dept: "Electronics",
    brand: "Samsung",
    price: 68900,
    cost: 58200,
    stock: 12,
    reorder: 8,
    expiry: null,
    supplier: "Samsung India",
    sold: 24,
    revenue: 1653600,
    margin: 15.5,
    status: "ok",
  },
  {
    id: "SKU-30112",
    name: "Levi's 511 Slim Jeans",
    category: "Denim",
    dept: "Fashion",
    brand: "Levi's",
    price: 3499,
    cost: 1820,
    stock: 84,
    reorder: 40,
    expiry: null,
    supplier: "Levi Strauss India",
    sold: 156,
    revenue: 545844,
    margin: 48.0,
    status: "ok",
  },
  {
    id: "SKU-40098",
    name: "Nescafé Gold 200g",
    category: "Beverages",
    dept: "Grocery",
    brand: "Nestlé",
    price: 649,
    cost: 512,
    stock: 46,
    reorder: 60,
    expiry: "2027-02-14",
    supplier: "Nestlé India",
    sold: 218,
    revenue: 141482,
    margin: 21.1,
    status: "low",
  },
  {
    id: "SKU-50077",
    name: "Nike Air Zoom Pegasus",
    category: "Footwear",
    dept: "Sports",
    brand: "Nike",
    price: 8995,
    cost: 5200,
    stock: 32,
    reorder: 20,
    expiry: null,
    supplier: "Nike India Pvt",
    sold: 42,
    revenue: 377790,
    margin: 42.2,
    status: "ok",
  },
  {
    id: "SKU-60142",
    name: "Lakmé Absolute Foundation",
    category: "Cosmetics",
    dept: "Beauty",
    brand: "Lakmé",
    price: 1250,
    cost: 620,
    stock: 4,
    reorder: 25,
    expiry: "2027-08-01",
    supplier: "HUL",
    sold: 78,
    revenue: 97500,
    margin: 50.4,
    status: "critical",
  },
  {
    id: "SKU-70211",
    name: "Amul Butter 500g",
    category: "Dairy",
    dept: "Grocery",
    brand: "Amul",
    price: 265,
    cost: 214,
    stock: 62,
    reorder: 80,
    expiry: "2026-05-14",
    supplier: "Amul Foods Ltd",
    sold: 342,
    revenue: 90630,
    margin: 19.2,
    status: "low",
  },
  {
    id: "SKU-80019",
    name: "Sony WH-1000XM5",
    category: "Audio",
    dept: "Electronics",
    brand: "Sony",
    price: 29990,
    cost: 22400,
    stock: 18,
    reorder: 12,
    expiry: null,
    supplier: "Sony India",
    sold: 32,
    revenue: 959680,
    margin: 25.3,
    status: "ok",
  },
  {
    id: "SKU-90054",
    name: "Britannia Good Day 200g",
    category: "Bakery",
    dept: "Grocery",
    brand: "Britannia",
    price: 45,
    cost: 34,
    stock: 240,
    reorder: 150,
    expiry: "2026-05-10",
    supplier: "Britannia Industries",
    sold: 512,
    revenue: 23040,
    margin: 24.4,
    status: "expiring",
  },
  {
    id: "SKU-11023",
    name: "Nestlé Yogurt 400g (Pack 12)",
    category: "Dairy",
    dept: "Grocery",
    brand: "Nestlé",
    price: 60,
    cost: 42,
    stock: 42,
    reorder: 100,
    expiry: "2026-05-07",
    supplier: "Nestlé India",
    sold: 486,
    revenue: 29160,
    margin: 30.0,
    status: "expiring",
  },
  {
    id: "SKU-12088",
    name: "Fabindia Kurta Set",
    category: "Ethnic",
    dept: "Fashion",
    brand: "Fabindia",
    price: 2899,
    cost: 1450,
    stock: 56,
    reorder: 30,
    expiry: null,
    supplier: "Fabindia Overseas",
    sold: 88,
    revenue: 255112,
    margin: 50.0,
    status: "ok",
  },
  {
    id: "SKU-13077",
    name: "MamaEarth Vitamin C Serum",
    category: "Skincare",
    dept: "Beauty",
    brand: "MamaEarth",
    price: 599,
    cost: 240,
    stock: 168,
    reorder: 80,
    expiry: "2027-06-22",
    supplier: "Honasa Consumer",
    sold: 234,
    revenue: 140166,
    margin: 59.9,
    status: "ok",
  },
];

// Suppliers
export const SUPPLIERS = [
  {
    id: "SUP-001",
    name: "Amul Foods Ltd",
    category: "Dairy",
    contact: "Rajesh Patel",
    spend: 4820000,
    pending: 320000,
    onTime: 96,
    quality: 94,
    lead: 2.1,
    risk: "Low",
    score: 92,
  },
  {
    id: "SUP-002",
    name: "Nestlé India",
    category: "Packaged Foods",
    contact: "Priya Sharma",
    spend: 3120000,
    pending: 180000,
    onTime: 91,
    quality: 96,
    lead: 3.4,
    risk: "Low",
    score: 90,
  },
  {
    id: "SUP-003",
    name: "Samsung India",
    category: "Electronics",
    contact: "Arjun Mehta",
    spend: 8420000,
    pending: 1240000,
    onTime: 88,
    quality: 98,
    lead: 5.2,
    risk: "Medium",
    score: 86,
  },
  {
    id: "SUP-004",
    name: "Levi Strauss India",
    category: "Apparel",
    contact: "Neha Kapoor",
    spend: 2140000,
    pending: 96000,
    onTime: 82,
    quality: 92,
    lead: 6.8,
    risk: "Medium",
    score: 78,
  },
  {
    id: "SUP-005",
    name: "HUL",
    category: "FMCG",
    contact: "Vikram Iyer",
    spend: 5680000,
    pending: 240000,
    onTime: 94,
    quality: 95,
    lead: 2.8,
    risk: "Low",
    score: 91,
  },
  {
    id: "SUP-006",
    name: "Britannia Industries",
    category: "Bakery",
    contact: "Sanya Deshmukh",
    spend: 1420000,
    pending: 42000,
    onTime: 89,
    quality: 90,
    lead: 3.1,
    risk: "Low",
    score: 85,
  },
  {
    id: "SUP-007",
    name: "Sony India",
    category: "Electronics",
    contact: "Karan Nair",
    spend: 3820000,
    pending: 620000,
    onTime: 76,
    quality: 97,
    lead: 7.4,
    risk: "High",
    score: 72,
  },
  {
    id: "SUP-008",
    name: "Nike India Pvt",
    category: "Sports",
    contact: "Ananya Rao",
    spend: 1980000,
    pending: 120000,
    onTime: 92,
    quality: 96,
    lead: 4.6,
    risk: "Low",
    score: 88,
  },
];

// Customers
export const CUSTOMERS = [
  {
    id: "CUST-88214",
    name: "Aditi Joshi",
    joined: "2024-08-14",
    visits: 42,
    spend: 148240,
    aov: 3530,
    favDept: "Fashion",
    lastVisit: "2026-05-04",
    segment: "VIP",
    churn: 8,
  },
  {
    id: "CUST-77021",
    name: "Rohan Kulkarni",
    joined: "2023-11-02",
    visits: 68,
    spend: 218400,
    aov: 3212,
    favDept: "Electronics",
    lastVisit: "2026-05-05",
    segment: "VIP",
    churn: 4,
  },
  {
    id: "CUST-91882",
    name: "Sneha Bhosale",
    joined: "2025-01-22",
    visits: 24,
    spend: 62480,
    aov: 2603,
    favDept: "Beauty",
    lastVisit: "2026-04-28",
    segment: "Loyal",
    churn: 18,
  },
  {
    id: "CUST-33421",
    name: "Ishaan Gokhale",
    joined: "2026-03-11",
    visits: 3,
    spend: 8420,
    aov: 2806,
    favDept: "Grocery",
    lastVisit: "2026-05-03",
    segment: "New",
    churn: 32,
  },
  {
    id: "CUST-44120",
    name: "Meera Rane",
    joined: "2022-06-08",
    visits: 118,
    spend: 384200,
    aov: 3257,
    favDept: "Grocery",
    lastVisit: "2026-05-05",
    segment: "VIP",
    churn: 6,
  },
  {
    id: "CUST-55018",
    name: "Prathamesh Sathe",
    joined: "2024-02-19",
    visits: 34,
    spend: 96420,
    aov: 2836,
    favDept: "Home & Living",
    lastVisit: "2026-03-21",
    segment: "At Risk",
    churn: 68,
  },
  {
    id: "CUST-60214",
    name: "Kavya Deshpande",
    joined: "2023-04-30",
    visits: 52,
    spend: 172400,
    aov: 3315,
    favDept: "Fashion",
    lastVisit: "2026-05-04",
    segment: "Loyal",
    churn: 12,
  },
  {
    id: "CUST-72301",
    name: "Aarav Chitale",
    joined: "2025-09-14",
    visits: 8,
    spend: 21400,
    aov: 2675,
    favDept: "Sports",
    lastVisit: "2026-04-11",
    segment: "Frequent",
    churn: 28,
  },
  {
    id: "CUST-80104",
    name: "Riya Pawar",
    joined: "2021-12-01",
    visits: 142,
    spend: 512400,
    aov: 3608,
    favDept: "Fashion",
    lastVisit: "2026-05-05",
    segment: "VIP",
    churn: 3,
  },
  {
    id: "CUST-90418",
    name: "Neel Karve",
    joined: "2022-10-17",
    visits: 22,
    spend: 48200,
    aov: 2191,
    favDept: "Food Court",
    lastVisit: "2025-11-08",
    segment: "Dormant",
    churn: 84,
  },
];

// Transactions
export const TRANSACTIONS = Array.from({ length: 40 }, (_, i) => {
  const r = seeded(i + 700);
  const amt = Math.round(400 + r() * 12000);
  const depts = DEPARTMENTS;
  return {
    id: `TXN-${(20260500 + i).toString()}`,
    time: `${String(9 + Math.floor(r() * 13)).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}`,
    customer: CUSTOMERS[Math.floor(r() * CUSTOMERS.length)].name,
    items: 1 + Math.floor(r() * 8),
    dept: depts[Math.floor(r() * depts.length)],
    amount: amt,
    discount: Math.round(amt * r() * 0.12),
    payment: ["UPI", "Card", "Cash", "Wallet"][Math.floor(r() * 4)],
    status: r() > 0.06 ? "Completed" : "Refunded",
  };
});

// Expenses
export const EXPENSE_CATEGORIES = [
  { name: "Salaries", value: 4820000, color: "var(--chart-1)" },
  { name: "Electricity", value: 1240000, color: "var(--chart-2)" },
  { name: "Rent & Lease", value: 2200000, color: "var(--chart-5)" },
  { name: "Maintenance", value: 480000, color: "var(--chart-3)" },
  { name: "Security", value: 340000, color: "var(--chart-4)" },
  { name: "Cleaning", value: 220000, color: "var(--chart-2)" },
  { name: "Marketing", value: 620000, color: "var(--chart-1)" },
  { name: "Water", value: 84000, color: "var(--chart-3)" },
  { name: "Insurance", value: 180000, color: "var(--chart-5)" },
  { name: "Waste Mgmt", value: 62000, color: "var(--chart-4)" },
];

export const EXPENSES = [
  {
    id: "EXP-40218",
    date: "2026-05-05",
    category: "Electricity",
    desc: "MSEDCL — April billing",
    vendor: "MSEDCL",
    amount: 412800,
    status: "Paid",
    dept: "All",
  },
  {
    id: "EXP-40219",
    date: "2026-05-04",
    category: "Maintenance",
    desc: "HVAC Zone B service",
    vendor: "CoolTech Services",
    amount: 68400,
    status: "Pending",
    dept: "Operations",
  },
  {
    id: "EXP-40220",
    date: "2026-05-04",
    category: "Marketing",
    desc: "Instagram + Meta ads",
    vendor: "Meta Platforms",
    amount: 148000,
    status: "Paid",
    dept: "Marketing",
  },
  {
    id: "EXP-40221",
    date: "2026-05-03",
    category: "Salaries",
    desc: "April payroll — Fashion floor",
    vendor: "Internal",
    amount: 962400,
    status: "Paid",
    dept: "Fashion",
  },
  {
    id: "EXP-40222",
    date: "2026-05-03",
    category: "Cleaning",
    desc: "Weekly deep cleaning",
    vendor: "SwachClean Services",
    amount: 42000,
    status: "Paid",
    dept: "All",
  },
  {
    id: "EXP-40223",
    date: "2026-05-02",
    category: "Security",
    desc: "Manned guard contract",
    vendor: "SecureIndia",
    amount: 84000,
    status: "Paid",
    dept: "All",
  },
  {
    id: "EXP-40224",
    date: "2026-05-02",
    category: "Water",
    desc: "PCMC water charges",
    vendor: "PCMC",
    amount: 21400,
    status: "Paid",
    dept: "All",
  },
  {
    id: "EXP-40225",
    date: "2026-05-01",
    category: "Rent & Lease",
    desc: "Anchor tenant lease",
    vendor: "GrandSquare Realty",
    amount: 2200000,
    status: "Paid",
    dept: "All",
  },
];

// Executive brief
export const EXECUTIVE_BRIEF = {
  summary:
    "Revenue is 8.4% above the 30-day average, primarily driven by Fashion and Electronics. However, Grocery margins declined by 3.2% due to increased procurement costs. 14 SKUs are at high stockout risk, while 23 perishable products require expiry action within 7 days.",
  positives: [
    "Fashion revenue up 18.6% week-over-week",
    "Weekend footfall highest in 30 days",
    "1,284 new customers acquired this month",
  ],
  risks: [
    "Grocery margin compression of 3.2%",
    "Electricity usage 23% above baseline in HVAC Zone B",
    "14 SKUs at stockout risk within 7 days",
  ],
  opportunities: [
    "Add checkout counters Saturday 6–9 PM (est. +₹1.8L)",
    "Markdown 23 expiring SKUs to recover ₹42K",
    "Contact 84 churn-risk high-value customers",
  ],
};

// Recommendations
export const RECOMMENDATIONS = [
  {
    id: "REC-01",
    title: "Reorder Amul Taaza Milk (240 units)",
    severity: "High",
    category: "Inventory",
    impact: "₹16.3K revenue at risk",
    confidence: 94,
    dept: "Grocery",
    evidence:
      "Current stock 128 units. 30-day avg daily sales 42 units. Predicted stockout in 3.4 days.",
    generated: "24 min ago",
  },
  {
    id: "REC-02",
    title: "Add 4 checkout counters Sat 6–9 PM",
    severity: "High",
    category: "Operations",
    impact: "+₹1.82L per weekend",
    confidence: 89,
    dept: "All",
    evidence: "Avg queue length 14 customers Saturday evenings. Abandonment risk 8.4%.",
    generated: "1 hr ago",
  },
  {
    id: "REC-03",
    title: "Investigate HVAC Zone B overnight draw",
    severity: "Critical",
    category: "Utilities",
    impact: "₹38.4K/mo savings",
    confidence: 96,
    dept: "Operations",
    evidence: "23% higher electricity 1–4 AM despite mall closed. Anomaly persistent 11 days.",
    generated: "3 hr ago",
  },
  {
    id: "REC-04",
    title: "Apply 20% markdown on 42 yogurt units",
    severity: "Medium",
    category: "Expiry",
    impact: "Recover ₹2,940",
    confidence: 91,
    dept: "Grocery",
    evidence: "Batch B-2604-N expires in 2 days. Historic markdown clearance 78%.",
    generated: "5 hr ago",
  },
  {
    id: "REC-05",
    title: "Contact 84 high-value churn-risk customers",
    severity: "Medium",
    category: "Customers",
    impact: "Retain ₹6.4L LTV",
    confidence: 82,
    dept: "All",
    evidence: "No visit in 45+ days. Avg historical spend ₹7,600.",
    generated: "6 hr ago",
  },
  {
    id: "REC-06",
    title: "Renegotiate Sony India lead time",
    severity: "Medium",
    category: "Suppliers",
    impact: "Reduce stockouts 32%",
    confidence: 78,
    dept: "Electronics",
    evidence: "Avg lead 7.4 days vs 4.6 industry. On-time 76%.",
    generated: "8 hr ago",
  },
];

// Anomalies
export const ANOMALIES = [
  {
    id: "AN-01",
    severity: "Critical",
    metric: "Electricity — HVAC Zone B",
    expected: "8.4 kWh/h",
    actual: "22.1 kWh/h",
    deviation: "+163%",
    when: "01:00–04:00",
    cause: "Possible refrigeration compressor fault",
    action: "Dispatch maintenance",
  },
  {
    id: "AN-02",
    severity: "High",
    metric: "Returns — Electronics",
    expected: "1.8%",
    actual: "6.4%",
    deviation: "+256%",
    when: "Last 48 hours",
    cause: "Batch B-EL-2604 Bluetooth speakers",
    action: "Quarantine batch, contact supplier",
  },
  {
    id: "AN-03",
    severity: "Medium",
    metric: "Discount usage — Fashion",
    expected: "₹42K/day",
    actual: "₹94K/day",
    deviation: "+124%",
    when: "Last 3 days",
    cause: "Manager override rate elevated",
    action: "Audit approvals",
  },
  {
    id: "AN-04",
    severity: "Medium",
    metric: "Footfall — Weekday afternoon",
    expected: "820",
    actual: "412",
    deviation: "-49%",
    when: "Wed 14:00–17:00",
    cause: "Local road closure",
    action: "Adjust weekday staff schedule",
  },
  {
    id: "AN-05",
    severity: "Low",
    metric: "Water usage — Food Court",
    expected: "1,240 L/day",
    actual: "1,680 L/day",
    deviation: "+35%",
    when: "Last 7 days",
    cause: "Possible slow leak",
    action: "Plumbing inspection",
  },
];

// Live activity feed
export const LIVE_FEED = [
  { t: "just now", type: "sale", text: "New sale ₹2,840 · Fashion · UPI" },
  { t: "1 min ago", type: "customer", text: "New customer registered · Sneha B." },
  { t: "2 min ago", type: "alert", text: "Low stock: Lakmé Foundation (4 units)" },
  { t: "4 min ago", type: "sale", text: "New sale ₹18,900 · Electronics · Card" },
  { t: "6 min ago", type: "delivery", text: "Delivery received · Amul Foods (₹2.4L)" },
  { t: "9 min ago", type: "return", text: "Return processed ₹1,299 · Fashion" },
  { t: "12 min ago", type: "ai", text: "AI recommendation: Reorder Amul Milk" },
  { t: "15 min ago", type: "expense", text: "Expense added ₹68,400 · Maintenance" },
];

// Calendar month
export function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const pad = first.getDay();
  const cells: ({ day: number; revenue: number; state: string; event?: string } | null)[] = [];
  for (let i = 0; i < pad; i++) cells.push(null);
  for (let d = 1; d <= days; d++) {
    const r = seeded(year * 10000 + month * 100 + d);
    const revenue = Math.round(120000 + r() * 120000);
    const weekend = new Date(year, month, d).getDay() >= 5;
    const rev = weekend ? Math.round(revenue * 1.3) : revenue;
    const state = rev > 200000 ? "peak" : rev > 150000 ? "good" : rev > 110000 ? "avg" : "low";
    const event = d === 5 ? "Spike day" : d === 12 ? "Promotion" : d === 18 ? "Anomaly" : undefined;
    cells.push({ day: d, revenue: rev, state, event });
  }
  return cells;
}
