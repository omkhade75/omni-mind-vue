import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const libDir = path.join(__dirname, '../src/lib');
const files = fs.readdirSync(libDir).filter(f => f.startsWith('server-') && f.endsWith('.ts') && f !== 'server-auth.ts' && f !== 'server-whatsapp.ts' && f !== 'server-whatsapp-logs.ts' && f !== 'server-whatsapp-config.ts');

for (const file of files) {
  const filePath = path.join(libDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already processed
  if (content.includes('getTenantPrisma')) {
    continue;
  }

  // Replace import { prisma } with { getTenantPrisma }
  content = content.replace(
    /import\s+{\s*prisma\s*}\s+from\s+["']\.\/server\/prisma["'];?/,
    'import { getTenantPrisma } from "./server/prisma";\nimport { requireAuth } from "./server-auth";'
  );

  // We might have duplicate import for requireAuth now, but that's fine, we can let TS complain and fix it later.
  // Wait, better to remove existing getSecureSessionUser import and just use requireAuth
  content = content.replace(
    /import\s+{\s*getSecureSessionUser\s*}\s+from\s+["']\.\/server-auth["'];?/,
    ''
  );

  // Now, inject `const user = await requireAuth();\n    const prisma = getTenantPrisma(user.workspaceId);` 
  // at the beginning of every `.handler(async ({ ... }) => {` or `.handler(async () => {`
  content = content.replace(
    /\.handler\(\s*async\s*\((.*?)\)\s*=>\s*\{/g,
    '.handler(async ($1) => {\n    const user = await requireAuth();\n    const prisma = getTenantPrisma(user.workspaceId);'
  );

  // Also replace any existing `const secureUser = await getSecureSessionUser();`
  content = content.replace(
    /const\s+secureUser\s*=\s*await\s+getSecureSessionUser\(\);/g,
    'const secureUser = user;' // alias it so we don't break existing code using secureUser
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
