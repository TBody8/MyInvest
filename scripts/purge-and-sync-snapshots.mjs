import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando snapshots antiguos ficticios de SQLite...");

  // Borrar todos los snapshots antiguos
  await prisma.positionSnapshot.deleteMany();
  await prisma.accountSnapshot.deleteMany();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Insertar el snapshot real de hoy para Trading 212
  const snapshot = await prisma.accountSnapshot.create({
    data: {
      date: today,
      totalValue: 48.86,
      totalInvested: 50.00,
      realProfit: -1.14,
      realProfitPct: -2.28,
      unrealizedProfit: -1.14,
      realizedProfit: 0,
      totalDividends: 0,
      freeCash: 0,
      positionsCount: 1,
    },
  });

  await prisma.positionSnapshot.create({
    data: {
      snapshotId: snapshot.id,
      ticker: "VST_US_EQ",
      name: "Vistra",
      quantity: 0.392804,
      averagePrice: 127.09,
      currentPrice: 124.38,
      ppl: -1.14,
      totalCost: 49.92,
      currentValue: 48.86,
      weight: 100.0,
    },
  });

  console.log("¡Base de datos limpiada con éxito! Solo queda el snapshot real actual de 48.86 €.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
