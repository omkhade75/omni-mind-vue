import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      isSystemAdmin: true,
      workspaceId: true
    }
  });

  console.log("Database Users list:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
