const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const positions = await prisma.revolutPosition.findMany({ orderBy: { ticker: 'asc' } });
  console.log('Total Revolut positions:', positions.length);
  for (const p of positions) {
    console.log(`${p.ticker}: qty=${p.quantity}, avgPrice=${p.averagePrice}`);
  }
}

check()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
