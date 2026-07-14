const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "../prisma/schema.prisma");
let content = fs.readFileSync(schemaPath, "utf-8");

// Base models to insert at the top
const newModels = `
model Workspace {
  id           String   @id @default(uuid())
  name         String
  industry     String?
  businessType String?
  timezone     String   @default("Asia/Kolkata")
  currency     String   @default("INR")
  status       String   @default("Active") // Active, Suspended
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  settings          WorkspaceSettings?
  users             User[]
  products          Product[]
  customers         Customer[]
  transactions      Transaction[]
  inventoryStocks   InventoryStock[]
  inventoryLocs     InventoryLocation[]
  movements         InventoryMovement[]
  suppliers         Supplier[]
  purchaseOrders    PurchaseOrder[]
  departments       Department[]
  categories        Category[]
  expenses          Expense[]
  expenseCategories ExpenseCategory[]
  incomeRecords     IncomeRecord[]
  goodsReceipts     GoodsReceipt[]
  batches           ProductBatch[]
  supplierProducts  SupplierProduct[]
  payments          Payment[]
  transactionItems  TransactionItem[]
  purchaseOrderItems PurchaseOrderItem[]
  goodsReceiptItems GoodsReceiptItem[]
  utilityMeters     UtilityMeter[]
  utilityReadings   UtilityReading[]
  staff             Staff[]
  recommendations   Recommendation[]
  anomalies         Anomaly[]
  businessEvents    BusinessEvent[]
  auditLogs         AuditLog[]
  footfallReadings  FootfallReading[]
  messageLogs       MessageLog[]
  ledgerAccounts    LedgerAccount[]
  ledgerEntries     LedgerEntry[]
  investments       Investment[]
  deliveryDispatches DeliveryDispatch[]
  fixedDeposits     FixedDeposit[]
  corporateLoans    CorporateLoan[]
}

model WorkspaceSettings {
  id          String    @id @default(uuid())
  workspaceId String    @unique
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  branding    String?   
  features    String?   
  updatedAt   DateTime  @updatedAt
}

model PendingRegistration {
  id              String   @id @default(uuid())
  companyName     String
  businessType    String
  industry        String
  ownerName       String
  ownerEmail      String   @unique
  mobileNumber    String
  designation     String
  country         String
  state           String
  city            String
  address         String
  employeeCount   String
  branchCount     String
  revenueRange    String
  timezone        String   @default("Asia/Kolkata")
  currency        String   @default("INR")
  passwordHash    String
  status          String   @default("Pending") // Pending, Approved, Rejected
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model LoginHistory {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress   String?
  userAgent   String?
  status      String   
  timestamp   DateTime @default(now())
}

model ApprovalLog {
  id             String   @id @default(uuid())
  adminId        String
  admin          User     @relation(fields: [adminId], references: [id], onDelete: Cascade)
  registrationId String
  action         String   
  notes          String?
  timestamp      DateTime @default(now())
}
`;

// Remove the Mall model
content = content.replace(/model Mall \{[\s\S]*?\}/, newModels);

// Function to process each model
function processModel(modelName, modelBody) {
  if (['Workspace', 'WorkspaceSettings', 'PendingRegistration', 'LoginHistory', 'ApprovalLog'].includes(modelName)) {
    return modelBody;
  }

  let lines = modelBody.split('\n');
  let newLines = [];
  let uniqueFields = [];

  for (let line of lines) {
    // If it's the User model, add passwordHash and isSystemAdmin
    if (modelName === 'User' && line.includes('email')) {
      newLines.push(line.replace('@unique', '')); // Remove @unique from email directly
      uniqueFields.push('email');
      newLines.push('  passwordHash   String   @default("")');
      newLines.push('  isSystemAdmin  Boolean  @default(false)');
      continue;
    }

    if (modelName === 'User' && line.includes('loginHistory')) {
       // Already processed? 
    }

    // Convert `@unique` to compound `@@unique([field, workspaceId])`
    // but only for fields, not for compound indexes that might already exist
    let match = line.match(/^  (\w+)\s+([^\s]+)\s+.*@unique/);
    if (match) {
      let fieldName = match[1];
      let cleanLine = line.replace(/@unique/, '');
      newLines.push(cleanLine);
      uniqueFields.push(fieldName);
      continue;
    }
    
    // Convert @@unique([A, B]) to @@unique([A, B, workspaceId])
    let blockMatch = line.match(/^  @@unique\(\[(.*?)\]\)/);
    if (blockMatch) {
        if (!blockMatch[1].includes('workspaceId')) {
           newLines.push(`  @@unique([${blockMatch[1]}, workspaceId])`);
           continue;
        }
    }

    newLines.push(line);
  }

  // Add workspaceId to every model
  if (modelName !== 'Workspace' && modelName !== 'WorkspaceSettings' && modelName !== 'PendingRegistration' && modelName !== 'LoginHistory' && modelName !== 'ApprovalLog') {
    // Before the last bracket
    newLines.pop();
    newLines.push('  workspaceId    String?');
    newLines.push('  workspace      Workspace? @relation(fields: [workspaceId], references: [id], onDelete: Cascade)');
    
    if (modelName === 'User') {
      newLines.push('  loginHistory   LoginHistory[]');
      newLines.push('  approvalLogs   ApprovalLog[]');
    }

    for (let uf of uniqueFields) {
      newLines.push(`  @@unique([${uf}, workspaceId])`);
    }
    newLines.push('}');
  }

  return newLines.join('\n');
}

// Extract and replace all models
const modelRegex = /model (\w+) \{([\s\S]*?)\}/g;
let newContent = content.replace(modelRegex, (match, p1, p2) => {
  if (p1 === 'Mall' || p1 === 'Workspace' || p1 === 'WorkspaceSettings' || p1 === 'PendingRegistration' || p1 === 'LoginHistory' || p1 === 'ApprovalLog') {
    return match; // Already handled
  }
  return `model ${p1} {${processModel(p1, p2)}`;
});

fs.writeFileSync(schemaPath, newContent);
console.log("Schema updated successfully.");
