import fs from 'fs';
import path from 'path';

let f = path.join(__dirname, '../src/lib/server-ai-impl.ts');
let c = fs.readFileSync(f, 'utf8');

c = c.replace('import { getTenantPrisma } from "./server/prisma";', 
`import { getTenantPrisma } from "./server/tenant-context";
const prisma = new Proxy({} as any, { get: (target, prop) => (getTenantPrisma() as any)[prop] });`);

fs.writeFileSync(f, c, 'utf8');
console.log('Fixed server-ai-impl.ts with proxy');
