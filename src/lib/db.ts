import { Role } from "./auth-context";

// Centralized seeded database for GrandSquare Mall, Pune
export interface Product {
  id: string; // SKU
  name: string;
  category: string;
  dept: string;
  brand: string;
  price: number;
  cost: number;
  stock: number;
  reorder: number;
  expiry: string | null;
  supplier: string;
  sold: number;
  revenue: number;
  margin: number;
  status: "ok" | "low" | "critical" | "expiring";
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  quantity: number;
  remainingQty: number;
  receivedDate: string;
  status: "expired" | "expiring" | "safe" | "actioned";
  markdownPercent?: number;
}

export interface Supplier {
  id: string;
  name: string;
  category: string;
  contact: string;
  spend: number;
  pending: number;
  onTime: number; // %
  quality: number; // %
  lead: number; // days
  risk: "Low" | "Medium" | "High";
  score: number;
  phone?: string;
}

export interface Customer {
  id: string;
  name: string;
  joined: string;
  visits: number;
  spend: number;
  aov: number;
  favDept: string;
  lastVisit: string;
  segment: "VIP" | "Loyal" | "New" | "Frequent" | "At Risk" | "Dormant";
  churn: number; // Churn risk %
}

export interface TransactionItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  customerName: string;
  customerId: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment: "UPI" | "Card" | "Cash" | "Wallet";
  status: "Completed" | "Refunded";
  dept: string; // Main department
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  desc: string;
  vendor: string;
  amount: number;
  status: "Paid" | "Pending";
  dept: string;
}

export interface UtilityReading {
  id: string;
  date: string;
  type: "Electricity" | "Water";
  zone: string;
  consumption: number; // kWh or Liters
  cost: number;
  baseline: number;
  anomalyScore: number; // 0 to 100
}

export interface AIRecommendation {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  category: "Inventory" | "Operations" | "Utilities" | "Expiry" | "Customers" | "Suppliers";
  impact: string;
  confidence: number; // %
  dept: string;
  evidence: string;
  explanation: string;
  suggestedAction: string;
  status: "New" | "Investigating" | "Accepted" | "Rejected" | "Completed";
  generated: string;
  relatedEntityId?: string;
}

export interface Anomaly {
  id: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  metric: string;
  expected: string;
  actual: string;
  deviation: string;
  when: string;
  cause: string;
  action: string;
  status: "New" | "Investigating" | "Resolved";
  date: string;
}

export interface PurchaseOrder {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: "Draft" | "Sent" | "Received" | "Cancelled";
  date: string;
  source: string; // e.g. "AI Recommendation (REC-01)"
}

export interface DailySnapshot {
  date: string;
  grossRevenue: number;
  netProfit: number;
  orders: number;
  footfall: number;
  newCustomers: number;
  returningCustomers: number;
  aov: number;
  expenses: number;
  refunds: number;
  discounts: number;
}

export interface Schema {
  products: Product[];
  batches: ProductBatch[];
  suppliers: Supplier[];
  customers: Customer[];
  transactions: Transaction[];
  expenses: Expense[];
  utilities: UtilityReading[];
  recommendations: AIRecommendation[];
  anomalies: Anomaly[];
  purchaseOrders: PurchaseOrder[];
}

// Deterministic seedable random number generator (LCG)
export function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Convert date to deterministic number seed
export function dateSeed(dateStr: string): number {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = 31 * h + dateStr.charCodeAt(i);
    h = h & h; // Convert to 32bit integer
  }
  return Math.abs(h);
}

// STATIC SEEDS FOR CONSISTENT BASE DATA
const BASE_SUPPLIERS: Supplier[] = [
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

const BASE_PRODUCTS_TEMPLATE = [
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
  },
  {
    id: "SKU-14001",
    name: "Apple iPhone 15 Pro",
    category: "Smartphones",
    dept: "Electronics",
    brand: "Apple",
    price: 134900,
    cost: 114000,
    stock: 20,
    reorder: 10,
    expiry: null,
    supplier: "Apple India",
  },
  {
    id: "SKU-14002",
    name: "Apple iPad Air",
    category: "Tablets",
    dept: "Electronics",
    brand: "Apple",
    price: 59900,
    cost: 51000,
    stock: 15,
    reorder: 8,
    expiry: null,
    supplier: "Apple India",
  },
  {
    id: "SKU-14003",
    name: "Dell Inspiron 15",
    category: "Laptops",
    dept: "Electronics",
    brand: "Dell",
    price: 48999,
    cost: 41200,
    stock: 10,
    reorder: 5,
    expiry: null,
    supplier: "Dell India",
  },
  {
    id: "SKU-14004",
    name: "HP LaserJet Printer",
    category: "Printers",
    dept: "Electronics",
    brand: "HP",
    price: 16999,
    cost: 13800,
    stock: 8,
    reorder: 4,
    expiry: null,
    supplier: "HP India",
  },
  {
    id: "SKU-14005",
    name: "Zara Mens Blazer",
    category: "Suits",
    dept: "Fashion",
    brand: "Zara",
    price: 6990,
    cost: 3600,
    stock: 30,
    reorder: 15,
    expiry: null,
    supplier: "Zara India",
  },
  {
    id: "SKU-14006",
    name: "Allen Solly Casual Shirt",
    category: "Shirts",
    dept: "Fashion",
    brand: "Allen Solly",
    price: 1999,
    cost: 850,
    stock: 60,
    reorder: 25,
    expiry: null,
    supplier: "Madura Fashion",
  },
  {
    id: "SKU-14007",
    name: "Adidas Ultraboost 22",
    category: "Footwear",
    dept: "Sports",
    brand: "Adidas",
    price: 17999,
    cost: 10200,
    stock: 24,
    reorder: 12,
    expiry: null,
    supplier: "Adidas India",
  },
  {
    id: "SKU-14008",
    name: "Yonex Astrox Badminton Racket",
    category: "Rackets",
    dept: "Sports",
    brand: "Yonex",
    price: 3850,
    cost: 2100,
    stock: 40,
    reorder: 15,
    expiry: null,
    supplier: "Yonex India",
  },
  {
    id: "SKU-14009",
    name: "Decathlon Quechua Backpack",
    category: "Bags",
    dept: "Sports",
    brand: "Decathlon",
    price: 999,
    cost: 540,
    stock: 85,
    reorder: 30,
    expiry: null,
    supplier: "Decathlon Sports",
  },
  {
    id: "SKU-14010",
    name: "L'Oreal Paris Conditioner",
    category: "Haircare",
    dept: "Beauty",
    brand: "L'Oreal",
    price: 499,
    cost: 230,
    stock: 120,
    reorder: 50,
    expiry: "2027-11-15",
    supplier: "L'Oreal India",
  },
  {
    id: "SKU-14011",
    name: "Forest Essentials Body Lotion",
    category: "Skincare",
    dept: "Beauty",
    brand: "Forest Essentials",
    price: 1575,
    cost: 850,
    stock: 45,
    reorder: 20,
    expiry: "2027-09-08",
    supplier: "Forest Essentials",
  },
  {
    id: "SKU-14012",
    name: "Lay's Classic Chips 100g",
    category: "Snacks",
    dept: "Grocery",
    brand: "Lay's",
    price: 50,
    cost: 38,
    stock: 300,
    reorder: 100,
    expiry: "2026-08-10",
    supplier: "PepsiCo India",
  },
  {
    id: "SKU-14013",
    name: "Coca Cola 2L",
    category: "Beverages",
    dept: "Grocery",
    brand: "Coca Cola",
    price: 95,
    cost: 76,
    stock: 180,
    reorder: 80,
    expiry: "2026-09-22",
    supplier: "Coca Cola India",
  },
];

const BASE_CUSTOMERS: Customer[] = [
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

// Helper to generate dates between start and end
export function getDatesRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start);
  const e = new Date(end);
  while (s <= e) {
    dates.push(s.toISOString().split("T")[0]);
    s.setDate(s.getDate() + 1);
  }
  return dates;
}

// SEED GENERATION FUNCTION
export function seedDatabase(): Schema {
  const start = "2026-03-01";
  const end = "2026-05-31";
  const dates = getDatesRange(start, end);

  const products: Product[] = BASE_PRODUCTS_TEMPLATE.map((p) => ({
    ...p,
    sold: 0,
    revenue: 0,
    margin: Math.round(((p.price - p.cost) / p.price) * 1000) / 10,
    status: p.stock <= p.reorder ? (p.stock <= p.reorder / 4 ? "critical" : "low") : "ok",
  }));

  const suppliers = [...BASE_SUPPLIERS];
  const customers = [...BASE_CUSTOMERS];
  const batches: ProductBatch[] = [];
  const transactions: Transaction[] = [];
  const expenses: Expense[] = [];
  const utilities: UtilityReading[] = [];
  const purchaseOrders: PurchaseOrder[] = [
    {
      id: "PO-40019",
      productId: "SKU-20034",
      productName: 'Samsung 55" QLED TV',
      supplierId: "SUP-003",
      supplierName: "Samsung India",
      quantity: 6,
      unitCost: 58200,
      totalCost: 349200,
      status: "Sent",
      date: "2026-05-02",
      source: "Manual reorder",
    },
    {
      id: "PO-40020",
      productId: "SKU-50077",
      productName: "Nike Air Zoom Pegasus",
      supplierId: "SUP-008",
      supplierName: "Nike India Pvt",
      quantity: 15,
      unitCost: 5200,
      totalCost: 78000,
      status: "Received",
      date: "2026-05-03",
      source: "AI Recommendation (REC-02)",
    },
    {
      id: "PO-40021",
      productId: "SKU-80019",
      productName: "Sony WH-1000XM5",
      supplierId: "SUP-007",
      supplierName: "Sony India",
      quantity: 8,
      unitCost: 22400,
      totalCost: 179200,
      status: "Sent",
      date: "2026-05-04",
      source: "Manual reorder",
    },
  ];

  // Seed initial batches for products
  products.forEach((p) => {
    if (p.expiry) {
      batches.push({
        id: `BAT-${p.id.split("-")[1]}-01`,
        productId: p.id,
        batchNumber: `B-${p.id.split("-")[1]}-N`,
        mfgDate: "2026-02-10",
        expiryDate: p.expiry,
        quantity: p.stock + 100,
        remainingQty: p.stock,
        receivedDate: "2026-02-12",
        status: new Date(p.expiry) < new Date("2026-05-05") ? "expired" : "safe",
      });
    }
  });

  // Seed historical date-by-date data deterministically
  dates.forEach((date) => {
    const seedVal = dateSeed(date);
    const rng = lcg(seedVal);
    const isWeekend = new Date(date).getDay() === 5 || new Date(date).getDay() === 6; // Friday / Sat

    // 1. Transactions
    // Baseline: weekday 5-15 txns, weekend 15-35 txns
    // May 5 2026 is Tuesday but let's make it a rich day (30 transactions!)
    const txnCount = date === "2026-05-05" ? 30 : Math.floor(5 + rng() * (isWeekend ? 20 : 10));

    for (let i = 0; i < txnCount; i++) {
      const tRng = lcg(seedVal + i * 100);
      const hour = Math.floor(9 + tRng() * 13); // 9 AM to 9 PM
      const minute = Math.floor(tRng() * 60);
      const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Pick random customer
      const custIndex = Math.floor(tRng() * customers.length);
      const customer = customers[custIndex];

      // Pick 1 to 4 products
      const pCount = Math.floor(1 + tRng() * 4);
      const items: TransactionItem[] = [];
      let subtotal = 0;
      let costTotal = 0;

      // Select unique products
      const chosenProdIds = new Set<string>();
      while (chosenProdIds.size < pCount) {
        const pIndex = Math.floor(
          lcg(seedVal + chosenProdIds.size * 321 + i * 7)() * products.length,
        );
        chosenProdIds.add(products[pIndex].id);
      }

      chosenProdIds.forEach((pId) => {
        const prod = products.find((p) => p.id === pId)!;
        const qty = Math.floor(1 + lcg(seedVal + pId.charCodeAt(4))() * 3);
        items.push({
          productId: prod.id,
          name: prod.name,
          quantity: qty,
          price: prod.price,
          cost: prod.cost,
        });
        subtotal += prod.price * qty;
        costTotal += prod.cost * qty;

        // update product stats (if historical is before our current active date of May 5, update counts)
        if (new Date(date) <= new Date("2026-05-05")) {
          prod.sold += qty;
          prod.revenue += prod.price * qty;
          prod.stock = Math.max(0, prod.stock - qty);
        }
      });

      const discount = tRng() < 0.15 ? Math.round(subtotal * 0.1) : 0; // 15% chance of 10% discount
      const tax = Math.round((subtotal - discount) * 0.18); // 18% GST
      const total = subtotal - discount + tax;
      const payment = ["UPI", "Card", "Cash", "Wallet"][
        Math.floor(lcg(seedVal + i * 14)() * 4)
      ] as any;
      const status = tRng() < 0.03 ? "Refunded" : "Completed";

      // Main department is the department of the first product
      const mainDept = products.find((p) => p.id === items[0].productId)!.dept;

      transactions.push({
        id: `TXN-${date.replace(/-/g, "")}${String(i + 1).padStart(3, "0")}`,
        date,
        time: timeStr,
        customerName: customer.name,
        customerId: customer.id,
        items,
        subtotal,
        discount,
        tax,
        total,
        payment,
        status,
        dept: mainDept,
      });

      // Update customer stats
      if (new Date(date) <= new Date("2026-05-05")) {
        customer.visits += 1;
        customer.spend += total;
        customer.aov = Math.round(customer.spend / customer.visits);
        customer.lastVisit = date;
      }
    }

    // 2. Expenses
    // Daily standard operational expenses (e.g. food court supplies, cleaning, security split)
    // Monthly big bills (Electricity, Salaries, Rent) on the 1st or 5th
    const dayOfMonth = new Date(date).getDate();
    if (dayOfMonth === 1) {
      // Rent
      expenses.push({
        id: `EXP-${date.replace(/-/g, "")}01`,
        date,
        category: "Rent & Lease",
        desc: "Anchor tenant lease — GrandSquare Realty",
        vendor: "GrandSquare Realty",
        amount: 2200000,
        status: "Paid",
        dept: "All",
      });
    }
    if (dayOfMonth === 5) {
      // Electricity (around 4L)
      expenses.push({
        id: `EXP-${date.replace(/-/g, "")}02`,
        date,
        category: "Electricity",
        desc: "MSEDCL — Monthly billing",
        vendor: "MSEDCL",
        amount: 412800,
        status: date === "2026-05-05" ? "Paid" : "Paid",
        dept: "All",
      });
      // Salaries
      expenses.push({
        id: `EXP-${date.replace(/-/g, "")}03`,
        date,
        category: "Salaries",
        desc: "Monthly payroll",
        vendor: "Internal Employees",
        amount: 3820000,
        status: "Paid",
        dept: "All",
      });
    }

    // Daily miscellaneous operational expenses
    if (rng() < 0.3) {
      const expCat = ["Maintenance", "Cleaning", "Marketing", "Water"][Math.floor(rng() * 4)];
      const amount = Math.round(5000 + rng() * 45000);
      expenses.push({
        id: `EXP-${date.replace(/-/g, "")}04`,
        date,
        category: expCat,
        desc:
          expCat === "Maintenance"
            ? "HVAC maintenance callout"
            : expCat === "Marketing"
              ? "Social media campaign"
              : "Regular operations",
        vendor:
          expCat === "Maintenance"
            ? "CoolTech Services"
            : expCat === "Marketing"
              ? "Meta Platforms"
              : "SwachClean Services",
        amount,
        status: "Paid",
        dept: ["All", "Fashion", "Grocery", "Electronics"][Math.floor(rng() * 4)],
      });
    }

    // 3. Utility readings (Electricity and Water)
    // Electricity baseline: 12000 kWh/day
    // Water baseline: 8000 L/day
    const elecBase = 12000;
    const elecRng = rng();
    let elecUsage = elecBase + Math.round((elecRng - 0.5) * 2000);
    let elecAnoScore = 0;

    // HVAC Zone B anomaly on 5 May 2026
    if (date === "2026-05-05") {
      elecUsage += 3500; // Big spike!
      elecAnoScore = 96; // HVAC anomaly
    }

    utilities.push({
      id: `UTIL-E-${date.replace(/-/g, "")}`,
      date,
      type: "Electricity",
      zone: "HVAC Zone B",
      consumption: elecUsage,
      cost: Math.round(elecUsage * 9.5), // ₹9.5 per kWh
      baseline: elecBase,
      anomalyScore: elecAnoScore,
    });

    const waterBase = 8000;
    const waterUsage = waterBase + Math.round((rng() - 0.5) * 1000);
    utilities.push({
      id: `UTIL-W-${date.replace(/-/g, "")}`,
      date,
      type: "Water",
      zone: "All Zones",
      consumption: waterUsage,
      cost: Math.round(waterUsage * 0.15), // ₹0.15 per Liter
      baseline: waterBase,
      anomalyScore: rng() > 0.95 ? 45 : 0,
    });
  });

  // Setup static anomalies
  const anomalies: Anomaly[] = [
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
      status: "New",
      date: "2026-05-05",
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
      status: "New",
      date: "2026-05-04",
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
      status: "Resolved",
      date: "2026-05-03",
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
      status: "Resolved",
      date: "2026-04-29",
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
      status: "New",
      date: "2026-05-05",
    },
  ];

  // Setup static recommendations
  const recommendations: AIRecommendation[] = [
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
      explanation:
        "Amul Milk sales have spiked by 18% over the last week due to secondary supermarket closure nearby. Current inventory buffer will deplete in 3 days, leading to stockouts.",
      suggestedAction:
        "Place automatic order of 240 units with Amul Foods Ltd (Lead time: 2.1 days).",
      status: "New",
      generated: "24 min ago",
      relatedEntityId: "SKU-10021",
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
      explanation:
        "Footfall peaks heavily between 6 PM and 9 PM on Saturdays. Opening 4 additional registers will reduce checkout queues to under 3 people.",
      suggestedAction: "Schedule 4 backup cashiers for Saturday shifts.",
      status: "New",
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
      explanation:
        "Power draw remains at 22.1 kW during non-operating hours in Zone B. This is consistent with a stuck ventilation damper or failed thermostat control.",
      suggestedAction: "Send CoolTech maintenance crew to inspect HVAC dampers in Zone B.",
      status: "New",
      generated: "3 hr ago",
      relatedEntityId: "AN-01",
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
      explanation:
        "Nestlé Yogurt batch expires on May 7. Current stock velocity is too slow to clear full stock by expiry.",
      suggestedAction: "Approve 20% markdown discount on yogurt in Grocery section.",
      status: "New",
      generated: "5 hr ago",
      relatedEntityId: "SKU-11023",
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
      explanation:
        "84 VIP segment customers have missed their normal monthly visit cadence. Their churn probability has increased to 68%.",
      suggestedAction: "Send SMS discount vouchers for grand opening event this weekend.",
      status: "New",
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
      explanation:
        "Sony India electronics supply lead times are highly variable, averaging 7.4 days. This forces a larger safety buffer than required.",
      suggestedAction: "Initiate contract review to establish SLA penalty for delayed shipments.",
      status: "New",
      generated: "8 hr ago",
      relatedEntityId: "SUP-007",
    },
  ];

  return {
    products,
    batches,
    suppliers,
    customers,
    transactions,
    expenses,
    utilities,
    recommendations,
    anomalies,
    purchaseOrders,
  };
}

class SeededDatabase {
  public schema: Schema;

  constructor() {
    this.schema = this.loadFromStorage();
  }

  private loadFromStorage(): Schema {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("omnimind_db");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse database from localStorage", e);
        }
      }
    }
    const seedData = seedDatabase();
    this.save(seedData);
    return seedData;
  }

  public save(schema: Schema) {
    this.schema = schema;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("omnimind_db", JSON.stringify(schema));
    }
  }

  public getProducts(): Product[] {
    return this.schema.products;
  }

  public getProduct(id: string): Product | undefined {
    return this.schema.products.find((p) => p.id === id);
  }

  public getTransactions(): Transaction[] {
    return this.schema.transactions;
  }

  public getCustomers(): Customer[] {
    return this.schema.customers;
  }

  public getSuppliers(): Supplier[] {
    return this.schema.suppliers;
  }

  public getExpenses(): Expense[] {
    return this.schema.expenses;
  }

  public getUtilityReadings(): UtilityReading[] {
    return this.schema.utilities;
  }

  public getRecommendations(): AIRecommendation[] {
    return this.schema.recommendations;
  }

  public getAnomalies(): Anomaly[] {
    return this.schema.anomalies;
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    return this.schema.purchaseOrders;
  }

  public updateRecommendationStatus(id: string, status: AIRecommendation["status"]) {
    const updated = this.schema.recommendations.map((r) => (r.id === id ? { ...r, status } : r));
    this.save({ ...this.schema, recommendations: updated });
  }

  public addPurchaseOrder(po: PurchaseOrder) {
    const updated = [...this.schema.purchaseOrders, po];
    this.save({ ...this.schema, purchaseOrders: updated });
  }

  public updateProductStock(id: string, newStock: number) {
    const updated = this.schema.products.map((p) => (p.id === id ? { ...p, stock: newStock } : p));
    this.save({ ...this.schema, products: updated });
  }

  public updateProductBatchStatus(
    batchId: string,
    status: ProductBatch["status"],
    markdownPercent?: number,
  ) {
    const updated = this.schema.batches.map((b) =>
      b.id === batchId ? { ...b, status, markdownPercent } : b,
    );
    this.save({ ...this.schema, batches: updated });
  }

  public getProductBatches(productId: string): ProductBatch[] {
    return this.schema.batches.filter((b) => b.productId === productId);
  }

  public reset() {
    const seedData = seedDatabase();
    this.save(seedData);
  }

  // Aggregate daily statistics for the Time Machine
  public getDailySnapshot(date: string): DailySnapshot {
    const txns = this.schema.transactions.filter((t) => t.date === date);
    const exps = this.schema.expenses.filter((e) => e.date === date);

    const grossRevenue = txns.reduce(
      (sum, t) => (t.status === "Completed" ? sum + t.total : sum),
      0,
    );
    const orders = txns.length;
    const refunds = txns.reduce((sum, t) => (t.status === "Refunded" ? sum + t.total : sum), 0);
    const discounts = txns.reduce((sum, t) => sum + t.discount, 0);

    // Expenses
    const expenses = exps.reduce((sum, e) => sum + e.amount, 0);

    // Footfall estimation (derived seed based)
    const seedVal = dateSeed(date);
    const rng = lcg(seedVal);
    const isWeekend = new Date(date).getDay() === 5 || new Date(date).getDay() === 6;
    const footfall =
      date === "2026-05-05" ? 18420 : Math.round(4000 + rng() * (isWeekend ? 8000 : 3000));

    // New customers
    const newCustomers = date === "2026-05-05" ? 14 : Math.floor(1 + rng() * 8);
    const returningCustomers = Math.max(0, orders - newCustomers);

    const aov = orders > 0 ? Math.round(grossRevenue / orders) : 0;
    const netProfit = Math.round(grossRevenue * 0.16) - expenses; // Simplified margin-based profit calculation

    return {
      date,
      grossRevenue,
      netProfit,
      orders,
      footfall,
      newCustomers,
      returningCustomers,
      aov,
      expenses,
      refunds,
      discounts,
    };
  }
}

export const db = new SeededDatabase();
