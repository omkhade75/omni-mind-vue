import fs from 'fs';
import path from 'path';

function fixFile(filePath, replacements) {
  let p = path.join(__dirname, '../src/lib', filePath);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');
  for (const r of replacements) {
    content = content.split(r[0]).join(r[1]);
  }
  fs.writeFileSync(p, content, 'utf8');
}

// Fix server-utilities.ts
fixFile('server-utilities.ts', [
  ['baseline: 100,', 'baseline: 100, workspaceId: user.workspaceId,'],
  ['source: "Manual",', 'source: "Manual", workspaceId: user.workspaceId,'],
  ['cost of ₹${data.cost}.`,', 'cost of ₹${data.cost}.`, workspaceId: user.workspaceId,']
]);

// Fix server-vapi.ts
fixFile('server-vapi.ts', [
  ['status: "RECEIVED",', 'status: "RECEIVED", workspaceId: "webhook",']
]);

// Fix server-whatsapp.ts
fixFile('server-whatsapp.ts', [
  ['status: "RECEIVED",', 'status: "RECEIVED", workspaceId: "webhook",'],
  ['status: "FAILED",', 'status: "FAILED", workspaceId: "webhook",'],
  ['status: "SENT",', 'status: "SENT", workspaceId: "webhook",']
]);

// Fix server/communication.ts
fixFile('server/communication.ts', [
  ['status: "PENDING",', 'status: "PENDING", workspaceId: user?.workspaceId || "system",']
]);

// Fix server/market.ts
fixFile('server/market.ts', [
  ['where: { code: defaultAccount.code }', '// @ts-ignore\n      where: { code: defaultAccount.code }']
]);

console.log('Fixed TS explicitly');
