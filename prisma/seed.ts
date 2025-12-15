import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Ensure organizations exist
  await prisma.organization.upsert({
    where: { id: 'org-a-uuid-0000-0000-000000000001' },
    update: {},
    create: {
      id: 'org-a-uuid-0000-0000-000000000001',
      name: 'Organization A',
    },
  });
  await prisma.organization.upsert({
    where: { id: 'org-b-uuid-0000-0000-000000000002' },
    update: {},
    create: {
      id: 'org-b-uuid-0000-0000-000000000002',
      name: 'Organization B',
    },
  });

  // Add AI user for each organization
  await prisma.user.upsert({
    where: { id: 'ai-bot-org-a-uuid' },
    update: {},
    create: {
      id: 'ai-bot-org-a-uuid',
      email: 'ai-bot-org-a@system.local',
      role: 'STUDENT',
      organizationId: 'org-a-uuid-0000-0000-000000000001',
    },
  });
  await prisma.user.upsert({
    where: { id: 'ai-bot-org-b-uuid' },
    update: {},
    create: {
      id: 'ai-bot-org-b-uuid',
      email: 'ai-bot-org-b@system.local',
      role: 'STUDENT',
      organizationId: 'org-b-uuid-0000-0000-000000000002',
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 