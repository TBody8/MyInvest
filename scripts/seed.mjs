import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de datos históricos en SQLite...");

  // Limpiar datos previos si los hay
  await prisma.positionSnapshot.deleteMany();
  await prisma.accountSnapshot.deleteMany();
  await prisma.dividendRecord.deleteMany();
  await prisma.cashTransaction.deleteMany();

  const now = new Date();
  const baseCost = 10645.75;
  const currentTotal = 12931.25;
  const currentProfit = currentTotal - baseCost;

  // Generar snapshots diarios para los últimos 30 días
  for (let i = 30; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const progress = (30 - i) / 30;
    
    // Curva suave con fluctuaciones de mercado
    const wave = Math.sin(progress * Math.PI * 3) * 140;
    const noise = Math.cos(i * 1.5) * 45;
    const profit = i === 0 ? currentProfit : (1800 + (currentProfit - 1800) * progress + wave + noise);
    const invested = baseCost;
    const totalVal = invested + profit;
    const profitPct = (profit / invested) * 100;

    const snapshot = await prisma.accountSnapshot.create({
      data: {
        date: d,
        totalValue: Number(totalVal.toFixed(2)),
        totalInvested: Number(invested.toFixed(2)),
        realProfit: Number(profit.toFixed(2)),
        realProfitPct: Number(profitPct.toFixed(2)),
        unrealizedProfit: Number((profit * 0.9).toFixed(2)),
        realizedProfit: Number((profit * 0.1).toFixed(2)),
        totalDividends: 89.40,
        freeCash: 450.75,
        positionsCount: 6,
      },
    });

    // Guardar posiciones para el snapshot más reciente
    if (i === 0) {
      await prisma.positionSnapshot.createMany({
        data: [
          {
            snapshotId: snapshot.id,
            ticker: "VWCE_DE_EQ",
            name: "Vanguard FTSE All-World UCITS ETF",
            quantity: 45,
            averagePrice: 104.20,
            currentPrice: 124.80,
            ppl: 927.00,
            totalCost: 4689.00,
            currentValue: 5616.00,
            weight: 43.43,
          },
          {
            snapshotId: snapshot.id,
            ticker: "AAPL_US_EQ",
            name: "Apple Inc.",
            quantity: 12,
            averagePrice: 156.40,
            currentPrice: 224.50,
            ppl: 817.20,
            totalCost: 1876.80,
            currentValue: 2694.00,
            weight: 20.83,
          },
          {
            snapshotId: snapshot.id,
            ticker: "MSFT_US_EQ",
            name: "Microsoft Corporation",
            quantity: 6,
            averagePrice: 345.10,
            currentPrice: 428.30,
            ppl: 499.20,
            totalCost: 2070.60,
            currentValue: 2569.80,
            weight: 19.87,
          },
          {
            snapshotId: snapshot.id,
            ticker: "ASML_AE_EQ",
            name: "ASML Holding NV",
            quantity: 2,
            averagePrice: 680.00,
            currentPrice: 795.50,
            ppl: 231.00,
            totalCost: 1360.00,
            currentValue: 1591.00,
            weight: 12.30,
          },
          {
            snapshotId: snapshot.id,
            ticker: "BABA_US_EQ",
            name: "Alibaba Group Holding",
            quantity: 8,
            averagePrice: 112.50,
            currentPrice: 88.20,
            ppl: -194.40,
            totalCost: 900.00,
            currentValue: 705.60,
            weight: 5.46,
          },
          {
            snapshotId: snapshot.id,
            ticker: "NIO_US_EQ",
            name: "NIO Inc.",
            quantity: 35,
            averagePrice: 7.80,
            currentPrice: 4.45,
            ppl: -117.25,
            totalCost: 273.00,
            currentValue: 155.75,
            weight: 1.20,
          },
        ],
      });
    }
  }

  // Generar transacciones de efectivo iniciales
  await prisma.cashTransaction.createMany({
    data: [
      {
        id: "tx_init_1",
        dateTime: new Date(now.getFullYear(), now.getMonth() - 6, 15),
        type: "DEPOSIT",
        amount: 8000.00,
      },
      {
        id: "tx_init_2",
        dateTime: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        type: "DEPOSIT",
        amount: 1500.00,
      },
      {
        id: "tx_init_3",
        dateTime: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        type: "DEPOSIT",
        amount: 1000.00,
      },
      {
        id: "tx_init_4",
        dateTime: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
        type: "INTEREST",
        amount: 1.45,
      },
    ],
  });

  // Generar historial de dividendos
  const dividendTickers = ["VWCE_DE_EQ", "AAPL_US_EQ", "MSFT_US_EQ", "ASML_AE_EQ"];
  const dividendData = [];
  for (let m = 11; m >= 0; m--) {
    const divDate = new Date(now.getFullYear(), now.getMonth() - m, 18);
    const amount = Number((8.5 + (m % 3) * 6.2).toFixed(2));
    dividendData.push({
      id: `div_seed_${divDate.getTime()}`,
      ticker: dividendTickers[m % dividendTickers.length],
      paidOn: divDate,
      amount,
      grossAmount: Number((amount * 1.19).toFixed(2)),
      quantity: 10,
    });
  }
  await prisma.dividendRecord.createMany({ data: dividendData });

  console.log("¡Seed completado con éxito! Snapshots, dividendos y transacciones creados.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
