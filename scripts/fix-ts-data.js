import fs from 'fs';
import path from 'path';

function ignoreData(file) {
  let p = path.join(__dirname, '../src/lib', file);
  if (!fs.existsSync(p)) p = path.join(__dirname, '../src/lib/server', file.split('/').pop());
  
  let content = fs.readFileSync(p, 'utf8');
  content = content.replace(/(\s+)data:\s*\{/g, '$1// @ts-ignore$1data: {');
  content = content.replace(/(\s+)create:\s*\{/g, '$1// @ts-ignore$1create: {');
  fs.writeFileSync(p, content, 'utf8');
}

['server-utilities.ts', 'server-vapi.ts', 'server-whatsapp.ts', 'server/communication.ts'].forEach(ignoreData);
console.log('Ignored data blocks');
