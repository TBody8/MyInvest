import cron from "node-cron";
import { captureSnapshot } from "@/lib/snapshots";

const globalForCron = globalThis as unknown as {
  cronJob: cron.ScheduledTask | undefined;
  isCronInitialized: boolean | undefined;
};

const CRON_EXPRESSION = process.env.SNAPSHOT_CRON || "0 21 * * *"; // 21:00 todos los días

export function initCronScheduler(): void {
  // Evitar múltiples inicializaciones en caliente
  if (globalForCron.isCronInitialized) {
    return;
  }

  // Comprobar si el cron expression es válido
  if (!cron.validate(CRON_EXPRESSION)) {
    console.error(`[CRON] Expresión cron inválida: "${CRON_EXPRESSION}"`);
    return;
  }

  console.log(`[CRON] Inicializando snapshot automático con regla: "${CRON_EXPRESSION}"`);

  globalForCron.cronJob = cron.schedule(CRON_EXPRESSION, async () => {
    console.log(`[CRON] [${new Date().toISOString()}] Ejecutando captura de snapshot diario...`);
    try {
      const result = await captureSnapshot();
      if (result.success) {
        console.log(`[CRON] Snapshot completado con éxito (ID: ${result.snapshotId})`);
      } else {
        console.error(`[CRON] Error al guardar snapshot:`, result.error);
      }
    } catch (err) {
      console.error(`[CRON] Error inesperado en cron job:`, err);
    }
  });

  globalForCron.isCronInitialized = true;
}

export function stopCronScheduler(): void {
  if (globalForCron.cronJob) {
    globalForCron.cronJob.stop();
    globalForCron.isCronInitialized = false;
    console.log("[CRON] Scheduler detenido");
  }
}
