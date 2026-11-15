import assert from "node:assert/strict";
import { test } from "node:test";
import { datedTradesFromLedger, readLedger } from "../src/lib/revolutAccounting.ts";

test("manual purchases use their saved date and EUR conversion", () => {
  const ledger = readLedger({
    quantity: 2,
    averagePrice: 45,
    notes: JSON.stringify({
      version: 2,
      baseline: { quantity: 0, costEur: 0 },
      purchases: [{ id: "buy-1", date: "2026-11-14", quantity: 2, price: 50,
        currency: "USD", eurPerUnit: 0.9, costEur: 90 }],
    }),
  });
  const [trade] = datedTradesFromLedger("NVDA", ledger);
  assert.equal(trade.date, "2026-11-14");
  assert.equal(trade.timestamp, new Date(2026, 10, 14).getTime());
  assert.equal(trade.totalEur, 90);
  assert.equal(trade.type, "BUY");
});

test("imported trades and later manual purchases coexist without duplicate imported buys", () => {
  const trades = datedTradesFromLedger("AAPL", {
    version: 2,
    baseline: { quantity: 1, costEur: 100 },
    purchases: [{ id: "manual", date: "2026-11-15", quantity: 1, price: 50,
      currency: "EUR", eurPerUnit: 1, costEur: 50 }],
    importedTrades: [
      { ticker: "AAPL", date: "2026-11-10", executedAt: "2026-11-10T12:00:00Z", type: "BUY", totalEur: 100 },
      { ticker: "AAPL", date: "2026-11-12", executedAt: "2026-11-12T12:00:00Z", type: "SELL", totalEur: 25 },
    ],
  });
  assert.deepEqual(trades.map(t => [t.date, t.type, t.totalEur]),
    [["2026-11-15", "BUY", 50], ["2026-11-10", "BUY", 100], ["2026-11-12", "SELL", 25]]);
});
