# Revisión y verificaciones — 12 de noviembre de 2026

## Comprobaciones completadas

- `npm run build`: compilación de producción, tipos y comprobaciones de Next.js correctas.
- `python scripts/test_fundamentals.py`: valores ausentes, ceros, negativos, crecimiento interanual, FCF y deuda neta.
- `node scripts/test-accounting.cjs`: base SQLite temporal; compras fraccionadas, promedio ponderado, cambio histórico, edición en EUR, conservación de notas antiguas, compras concurrentes e idempotencia.
- El mismo test verifica CSV entrecomillado, orden cronológico intradía, coste tras ventas, rechazo de ventas sin compras anteriores, importación transaccional y reimportación sin sobrescribir cambios posteriores.
- Trading 212: solicitudes simultáneas agrupadas, paginación de movimientos, retiradas, coste EUR de la cuenta y cotización nativa.
- `python scripts/verify-live-fundamentals.py`: Apple FY2025 contrastado con nueve importes de su documento oficial; margen operativo y crecimiento interanual reconciliados. Comprobaciones adicionales con Apple TTM, Intel anual, TSM anual y Microsoft trimestral.
- Playwright: todas las pestañas de Fundamentales a 360, 390 y 1440 px; ausencia de desbordamiento horizontal; precio objetivo legible; márgenes y FCF negativos; apertura/cierre del gráfico técnico sin posición ficticia.
- Playwright: entrada normal vacía a Fundamentales y navegación desde acciones de sectores; bloqueo táctil, liberación/cancelación y hover sin bloquear el scroll.
- Playwright: campos y payloads de compra/edición, USD/EUR, fracciones y fecha pasada; error de proveedor y reintento. Pruebas finales con copia aislada de SQLite y service workers bloqueados cuando se intercepta la red.
- Service worker real: caché estática, ninguna respuesta `/api/` almacenada; desconectar la red no devuelve una cartera cacheada como actual.
- Smoke test de producción: Revolut (8 posiciones), Trading 212 (3) y consolidado (11), identidad valor − inversión = resultado, fechas no futuras, Fundamentales HTTP 200, entrada inválida HTTP 400 y caché HTTP `no-store`.

## Integridad de los datos

Copia inicial: `C:\Users\jugar\AppData\Local\Temp\opencode\investment-backup-20261111-135630`.

Un service worker interceptó una primera prueba de formulario y dejó una compra de AAPL de 0,125 acciones en la base real. Se retiró únicamente esa entrada, identificada por su UUID, y las observaciones generadas después de ella. Se comprobó igualdad exacta de las ocho filas originales de `RevolutPosition` con la copia inicial (cantidad, coste, notas y fechas). El service worker fue corregido y el resto de pruebas se ejecutaron con una base aislada. No se restauró ni reemplazó la base completa.

## Límites explícitos

- El histórico anterior contenía valores y operaciones prefijados. El dashboard ahora usa observaciones registradas con procedencia conocida; no reconstruye las valoraciones anteriores sin una conciliación completa de operaciones, movimientos, divisas y acciones corporativas.
- TWR, comparación S&P 500, correlación/diversificación y rendimiento mensual se muestran N/D. Su cálculo completo no queda implementado con esta revisión; se han retirado los valores estimados presentados como reales.
- Revolut representa las posiciones abiertas: no una cuenta completa con efectivo, dividendos y resultados de ventas. Las fechas de nuevas compras se conservan en el registro, pero no generan una curva histórica anterior a las observaciones disponibles.
- La conversión histórica manual usa el cierre FX de la fecha o del último día disponible; puede diferir del cambio aplicado por el broker. El CSV usa su FX declarado.
- El proveedor no siempre ofrece múltiplos históricos, suficientes trimestres para YoY TTM o métricas específicas. Se conserva N/D y no se sustituye por cero.
- Se omiten previsiones si las divisas contable y de cotización difieren, para evitar mezclar monedas o BPA de acciones ordinarias con ADR.
- La conciliación con una fuente oficial cubre la muestra Apple FY2025, no todas las empresas. Las otras muestras verifican transformaciones y coherencia con el proveedor.

Fuente oficial contrastada: https://www.apple.com/newsroom/pdfs/fy2025-q4/FY25_Q4_Consolidated_Financial_Statements.pdf

Capturas: esta carpeta. Scripts Playwright: `C:\Users\jugar\AppData\Local\Temp\opencode\playwright-test-investment-{audit,edge-cases,offline}.js`.
