export async function register(): Promise<void> {
  // Only execute on the Node.js server runtime, not Edge
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initCronScheduler } = await import("@/lib/cron");
    initCronScheduler();
  }
}
