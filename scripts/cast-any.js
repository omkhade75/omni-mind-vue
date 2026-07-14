import { Project, SyntaxKind } from "ts-morph";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
project.addSourceFilesAtPaths(path.join(__dirname, "../src/lib/server-*.ts"));
project.addSourceFilesAtPaths(path.join(__dirname, "../src/lib/server/*.ts"));

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  // Find all property assignments named "data", "create", "where", "update" 
  // that are children of an ObjectLiteralExpression passed to a CallExpression (like Prisma create/update)
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.PropertyAssignment) {
      const prop = node.asKind(SyntaxKind.PropertyAssignment);
      const name = prop?.getName();
      if (name === "data" || name === "create" || name === "where") {
        const initializer = prop?.getInitializer();
        // Check if it's an ObjectLiteralExpression and not already an AsExpression
        if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
          // Check if parent is an object literal
          const parentObj = prop.getParent();
          if (parentObj && parentObj.getKind() === SyntaxKind.ObjectLiteralExpression) {
            // Check if grandparent is a call expression (e.g. create({ ... }))
            const grandParent = parentObj.getParent();
            if (grandParent && grandParent.getKind() === SyntaxKind.CallExpression) {
               // Cast it to any
               initializer.replaceWithText(`${initializer.getText()} as any`);
               changed = true;
            }
          }
        }
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Casted properties in ${sourceFile.getBaseName()}`);
  }
}
