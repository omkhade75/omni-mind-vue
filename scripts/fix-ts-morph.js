import { Project, SyntaxKind } from "ts-morph";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const project = new Project();
project.addSourceFilesAtPaths(path.join(__dirname, "../src/lib/server-*.ts"));

for (const sourceFile of project.getSourceFiles()) {
  let changed = false;

  // Find all object literal expressions inside a `data` property assignment
  sourceFile.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.PropertyAssignment) {
      const prop = node.asKind(SyntaxKind.PropertyAssignment);
      const name = prop?.getName();
      if (name === "data" || name === "create") {
        const initializer = prop?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
        if (initializer) {
          // Check if workspaceId is already there
          const hasWorkspaceId = initializer.getProperty("workspaceId");
          if (!hasWorkspaceId) {
            // Check if we are inside a context where `user` exists
            // We just add it blindly, if `user` doesn't exist it will TS error and we can fix it manually
            // But some files (like server-whatsapp) don't have user.workspaceId.
            if (sourceFile.getBaseName() === "server-whatsapp.ts" || sourceFile.getBaseName() === "server-vapi.ts") {
               initializer.addPropertyAssignment({ name: "workspaceId", initializer: 'workspace.id' }); // Assuming workspace is fetched
            } else {
               initializer.addPropertyAssignment({ name: "workspaceId", initializer: 'user.workspaceId' });
            }
            changed = true;
          }
        }
      }
    }
  });

  if (changed) {
    sourceFile.saveSync();
    console.log(`Updated ${sourceFile.getBaseName()}`);
  }
}
