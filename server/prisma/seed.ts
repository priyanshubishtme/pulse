import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  const passwordHash = await bcrypt.hash('password123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@linkpulse.dev' },
    update: {},
    create: {
      email: 'admin@linkpulse.dev',
      name: 'Admin User',
      passwordHash,
      role: 'ADMIN',
      tags: {
        create: [
          { name: 'Blog' }, { name: 'A/B Test' }, { name: 'Internal' },
          { name: 'Seasonal' }, { name: 'Promotion' }, { name: 'Newsletter' },
          { name: 'Product Launch' }
        ]
      }
    }
  });

  // User 1
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@linkpulse.dev' },
    update: {},
    create: {
      email: 'user1@linkpulse.dev',
      name: 'Test User 1',
      passwordHash,
      role: 'USER',
      tags: {
        create: [
          { name: 'Blog' }, { name: 'A/B Test' }, { name: 'Internal' },
          { name: 'Seasonal' }, { name: 'Promotion' }, { name: 'Newsletter' },
          { name: 'Product Launch' }
        ]
      }
    }
  });

  // User 2
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@linkpulse.dev' },
    update: {},
    create: {
      email: 'user2@linkpulse.dev',
      name: 'Test User 2',
      passwordHash,
      role: 'USER',
      tags: {
        create: [
          { name: 'Blog' }, { name: 'A/B Test' }, { name: 'Internal' },
          { name: 'Seasonal' }, { name: 'Promotion' }, { name: 'Newsletter' },
          { name: 'Product Launch' }
        ]
      }
    }
  });

  console.log('Seed complete!');
  console.log({ admin: admin.email, user1: user1.email, user2: user2.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
