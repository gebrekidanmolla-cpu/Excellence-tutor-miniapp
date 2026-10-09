/**
 * Runs once per new server instance. The CPU log is Node-only (it uses
 * `node:diagnostics_channel`), hence the runtime check and the dynamic import.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCpuLog } = await import("@/lib/cpu-log");
    startCpuLog();
  }
}
