import { NextRequest, NextResponse } from "next/server";
import { getRevolutPositions } from "@/lib/revolut";
import { getPositions } from "@/lib/trading212";
import { cleanTicker, isETF } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body.amount) || 100;
    const broker = body.broker || "all";
    const userClassifications: Record<string, "largo_plazo" | "tactica"> = body.customClassifications || {};

    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada en las variables de entorno." },
        { status: 500 }
      );
    }

    // 1. Recopilar posiciones del portfolio
    const [t212RawPositions, revolutPositions] = await Promise.all([
      getPositions(false).catch(() => []),
      getRevolutPositions().catch(() => []),
    ]);

    let portfolioPositions: Array<{
      ticker: string;
      name: string;
      value: number;
      cost: number;
      weightPct: number;
      isEtf: boolean;
      broker: string;
    }> = [];

    if (broker === "t212") {
      portfolioPositions = t212RawPositions.map((p) => {
        const clean = cleanTicker(p.ticker);
        const etf = isETF(p);
        const val = p.currentValue || (p.currentPrice || 0) * (p.quantity || 0);
        const cst = p.totalCost || (p.averagePrice || 0) * (p.quantity || 0);
        return {
          ticker: clean,
          name: p.name || clean,
          value: val,
          cost: cst,
          weightPct: 0,
          isEtf: etf,
          broker: "Trading 212",
        };
      });
    } else if (broker === "revolut") {
      portfolioPositions = revolutPositions.map((p) => {
        const clean = cleanTicker(p.ticker);
        const etf = isETF(p);
        const val = p.currentValue || (p.currentPrice || 0) * (p.quantity || 0);
        const cst = p.totalCost || (p.averagePrice || 0) * (p.quantity || 0);
        return {
          ticker: clean,
          name: p.name || clean,
          value: val,
          cost: cst,
          weightPct: p.weightPct || 0,
          isEtf: etf,
          broker: "Revolut",
        };
      });
    } else {
      // Consolidado
      const all = [
        ...t212RawPositions.map((p) => {
          const clean = cleanTicker(p.ticker);
          return {
            ticker: clean,
            name: p.name || clean,
            value: p.currentValue || (p.currentPrice || 0) * (p.quantity || 0),
            cost: p.totalCost || (p.averagePrice || 0) * (p.quantity || 0),
            weightPct: 0,
            isEtf: isETF(p),
            broker: "T212",
          };
        }),
        ...revolutPositions.map((p) => {
          const clean = cleanTicker(p.ticker);
          return {
            ticker: clean,
            name: p.name || clean,
            value: p.currentValue || (p.currentPrice || 0) * (p.quantity || 0),
            cost: p.totalCost || (p.averagePrice || 0) * (p.quantity || 0),
            weightPct: p.weightPct || 0,
            isEtf: isETF(p),
            broker: "REV",
          };
        }),
      ];
      portfolioPositions = all;
    }

    const totalVal = portfolioPositions.reduce((acc, p) => acc + p.value, 0);
    portfolioPositions.forEach((p) => {
      p.weightPct = totalVal > 0 ? Number(((p.value / totalVal) * 100).toFixed(1)) : 0;
    });

    // 2. Clasificación estricta en 3 grupos (Suelo, Convicción y Bolsa Táctica)
    const defaultTactical = ["CVX", "LLY", "VST", "SPCX"];
    const defaultLongTerm = ["NVDA", "AVGO", "NFLX"];

    const sueloPositions: typeof portfolioPositions = [];
    const conviccionPositions: typeof portfolioPositions = [];
    const tacticaPositions: typeof portfolioPositions = [];

    portfolioPositions.forEach((p) => {
      const clean = p.ticker.toUpperCase();
      const choice = userClassifications[clean];

      if (p.isEtf) {
        sueloPositions.push(p);
      } else if (choice === "tactica" || (!choice && defaultTactical.includes(clean))) {
        tacticaPositions.push(p);
      } else {
        conviccionPositions.push(p);
      }
    });

    const sueloTotalValue = sueloPositions.reduce((acc, p) => acc + p.value, 0);
    const conviccionTotalValue = conviccionPositions.reduce((acc, p) => acc + p.value, 0);
    const tacticaTotalValue = tacticaPositions.reduce((acc, p) => acc + p.value, 0);

    const sueloPct = totalVal > 0 ? Number(((sueloTotalValue / totalVal) * 100).toFixed(1)) : 60;
    const conviccionPct = totalVal > 0 ? Number(((conviccionTotalValue / totalVal) * 100).toFixed(1)) : 25;
    const tacticaPct = totalVal > 0 ? Number(((tacticaTotalValue / totalVal) * 100).toFixed(1)) : 15;

    const overConcentratedStocks = conviccionPositions.filter((p) => p.weightPct > 10);

    // 3. Obtener cotización actual del VIX en vivo
    let vixValue = 25.64;
    try {
      const vixRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (vixRes.ok) {
        const vixJson = await vixRes.json();
        const price = vixJson?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === "number") vixValue = Number(price.toFixed(2));
      }
    } catch {
      // Respaldo veraz
    }

    // 4. Cálculo matemático estricto del reparto 60 / 20 / 20 de Abel Castro
    const sueloAmount = Math.round(amount * 0.60);
    const conviccionAmount = Math.round(amount * 0.20);
    const polvoraAmount = amount - sueloAmount - conviccionAmount; // Exacto 20%

    const promptText = `
Eres un gestor cuantitativo sénior y sigues estrictamente la metodología de inversión de Abel Castro ("Invertir con criterio", Fitintrade 2026).
Tu estilo es 100% ANTI AI-SLOP: conciso, telegráfico, matemático, objetivo y directo al grano con números duros. Prohibido texto de relleno, introducciones o frases vacías.

El usuario va a realizar una aportación periódica (DCA) de ${amount} € a su cartera.

DIAGNÓSTICO EXACTO DE LA CARTERA ACTUAL:
- Capital Total: ${totalVal.toFixed(2)} €

GRUPO 1: SUELO TRONCAL (ETFs de acumulación global · ${sueloPct}% de cartera):
${sueloPositions.map((p) => `  * ${p.ticker} (${p.name}): ${p.weightPct}% de cartera | Valor: ${p.value.toFixed(2)} €`).join("\n")}

GRUPO 2: CONVICCIONES A LARGO PLAZO (Empresas estructurales para años · ${conviccionPct}% de cartera):
${conviccionPositions.map((p) => `  * ${p.ticker} (${p.name}): ${p.weightPct}% de cartera | Valor: ${p.value.toFixed(2)} €`).join("\n")}

GRUPO 3: BOLSA TÁCTICA / SWING (Operaciones de corto plazo para unas semanas · ${tacticaPct}% de cartera):
${tacticaPositions.map((p) => `  * ${p.ticker} (${p.name}): ${p.weightPct}% de cartera | Valor: ${p.value.toFixed(2)} €`).join("\n")}

CONTEXTO DE VOLATILIDAD MACRO:
- Índice CBOE VIX: ${vixValue} (${vixValue >= 25 ? "Alta volatilidad / Tensión" : vixValue <= 15 ? "Complacencia" : "Equilibrado"})

REGLAS DE REPARTO ESTRICTO DE ABEL CASTRO (60% SUELO / 20% CONVICCIÓN / 20% PÓLVORA SECA):
De los ${amount} € totales a aportar, debes generar EXACTAMENTE 3 ASIGNACIONES:

1. TRAMO 1: EXACTAMENTE ${sueloAmount} € (60%) al SUELO TRONCAL (ETFs: IUSQ, IS3N o IUSN). Refuerza el activo troncal para blindar el suelo.
2. TRAMO 2: EXACTAMENTE ${conviccionAmount} € (20%) a una EMPRESA DE CONVICCIÓN a largo plazo del GRUPO 2 (${conviccionPositions.map(p => p.ticker).join(", ")}).
   ¡PROHIBICIÓN TOTAL!: ESTÁ TERMINANTEMENTE PROHIBIDO ASIGNAR EL TRAMO 2 A NINGUNA EMPRESA DEL GRUPO 3 (Bolsa Táctica: ${tacticaPositions.map(p => p.ticker).join(", ")}). Chevron (CVX), Eli Lilly (LLY), Vistra (VST) y SpaceX (SPCX) son operaciones tácticas de corto plazo y JAMÁS se promedia a la baja en ellas según la página 59 de Abel Castro.
   El Tramo 2 DEBE ir obligatoriamente a una de tus convicciones reales de largo plazo (${conviccionPositions.map(p => p.ticker).join(", ")}) que esté más retrasada en peso y lejos del tope del 10%.
3. TRAMO 3: EXACTAMENTE ${polvoraAmount} € (20%) a PÓLVORA SECA / RESERVA TÁCTICA ("CASH"). Este dinero NO se gasta automáticamente; se acumula en liquidez para swing.

INVESTIGACIÓN DE ANALISTAS PARA LA PÓLVORA SECA:
Para este Tramo 3 de pólvora seca (${polvoraAmount} €), aporta una idea táctica seguida por analistas institucionales (consenso Wall Street / Bloomberg) para operaciones swing de 2 a 4 semanas:
- Activo táctico y catalizador a corto plazo (ej: rebote en soporte clave de 200 sesiones, resultados trimestrales próximos o gap de valoración).
- Nivel de entrada sugerido, objetivo de salida (Take Profit / Resistencia) y nivel de invalidación (Stop Loss / Soporte).

RADAR DE MERCADO EXTERIOR (NUEVAS PIEZAS ESTRATÉGICAS):
Sugiere 1 o 2 empresas de calidad fuera de su cartera con alto ROIC (>15%), flujo de caja libre positivo y en sectores no correlacionados (Salud, Consumo Defensivo o Infraestructuras) para resolver la sobreconcentración tecnológica.

RESPONDE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO con esta estructura exacta:
{
  "diagnostics": {
    "sueloPct": ${sueloPct},
    "empresasPct": ${conviccionPct},
    "sueloStatus": "${sueloPct >= 60 && sueloPct <= 75 ? "EQUILIBRADO" : sueloPct < 60 ? "INFRA_PONDERADO" : "SOBRE_PONDERADO"}",
    "concentrationAlert": "${overConcentratedStocks.length > 0 ? "Alerta: Acciones > 10%" : "Bajo control (<10%)"}",
    "threeDimensions": {
      "sector": "Diagnóstico de diversificación sectorial",
      "geography": "Diagnóstico geográfico de exposición a EE.UU.",
      "currency": "Diagnóstico de divisa (USD vs EUR)"
    }
  },
  "allocations": [
    {
      "ticker": "TICKER_SUELO",
      "name": "Nombre ETF",
      "type": "SUELO",
      "amount": ${sueloAmount},
      "percentage": 60,
      "currentWeight": "X.X%",
      "targetWeight": "Y.Y%",
      "metrics": {
        "roic": "Cesta global",
        "fcfStatus": "Positivo agregado",
        "pe": "18.4x o N/D",
        "technicalFloor": "XXX,XX €"
      },
      "reason": "Justificación de refuerzo del Suelo (60%) según Abel.",
      "exitCondition": "Vender únicamente si cambia el horizonte temporal o rebalanceo anual."
    },
    {
      "ticker": "TICKER_CONVICCION",
      "name": "Nombre Empresa",
      "type": "CONVICCION",
      "amount": ${conviccionAmount},
      "percentage": 20,
      "currentWeight": "X.X%",
      "targetWeight": "Y.Y%",
      "metrics": {
        "roic": "XX%",
        "fcfStatus": "Recurrente",
        "pe": "XX.Xx",
        "technicalFloor": "XXX,XX € o $"
      },
      "reason": "Justificación de rebalanceo de convicción (20%) sin superar el tope del 10%.",
      "exitCondition": "Condición de invalidación de tesis según Pág. 76."
    },
    {
      "ticker": "CASH",
      "name": "Pólvora Seca (Reserva Táctica)",
      "type": "POLVORA_SECA",
      "amount": ${polvoraAmount},
      "percentage": 20,
      "currentWeight": "X.X%",
      "targetWeight": "Y.Y%",
      "metrics": {
        "roic": "Liquidez",
        "fcfStatus": "Disponible",
        "pe": "Efectivo",
        "technicalFloor": "Caja pura"
      },
      "reason": "Reserva táctica del 20% para operaciones swing. Abel aconseja guardar pólvora seca y no forzar compras cada mes.",
      "exitCondition": "Se mantiene en liquidez hasta detectar un setup con ratio riesgo/beneficio favorable."
    }
  ],
  "tacticalAnalystIdea": {
    "ticker": "TICKER_TACTICO",
    "name": "Nombre Empresa Swing",
    "catalyst": "Catalizador concreto de corto plazo destacado por analistas",
    "entryZone": "XXX,XX $",
    "takeProfit": "XXX,XX $",
    "stopLoss": "XXX,XX $",
    "analystConsensus": "Consenso analistas (Buy / Strong Buy con target upside)"
  },
  "externalMarketRadar": [
    {
      "ticker": "TICKER_EXTERNO",
      "name": "Nombre Empresa o ETF",
      "sector": "Sector (Salud / Consumo Defensivo)",
      "whyItFits": "Por qué equilibra la cartera",
      "roic": ">18%",
      "fcfStatus": "Caja libre sólida",
      "recommendedMaxWeight": "5% - 8%"
    }
  ],
  "abelRoutineAdvice": "Consejo de rutina de fin de semana de Abel: pensar con mercado cerrado, ejecutar sin improvisar entre semana.",
  "thesis": "Tesis global resumida en 3 líneas: balance del Suelo 60/20/20 y control del riesgo."
}
`.trim();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error("[Gemini DCA Advisor] Error:", errBody);
      throw new Error("Error en la llamada a Gemini API");
    }

    const geminiJson = await geminiRes.json();
    const candidateText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    const cleanedJson = candidateText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedRecommendation = JSON.parse(cleanedJson);

    return NextResponse.json({
      success: true,
      amount,
      broker,
      currentVix: vixValue,
      recommendation: parsedRecommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[API DCA Advisor] Error:", errorMsg);
    return NextResponse.json(
      { error: "Error al generar recomendación institucional", details: errorMsg },
      { status: 500 }
    );
  }
}
