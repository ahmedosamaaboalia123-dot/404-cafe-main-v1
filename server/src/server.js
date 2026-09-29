import { processMediaCleanup } from './modules/media/media.service.js';
import { bootstrap, shutdown } from './bootstrap.js';
import { startWorkers } from './jobs/worker-runner.js';
import { tickOutbox } from './jobs/outbox.job.js';
import { tickShiftWarnings } from './jobs/shift-warnings.job.js';
import { tickReportExports } from './jobs/exports.job.js';

async function main() {
  const runtime = await bootstrap();
  const workers = runtime.config.workersEnabled
    ? startWorkers([
        { name: 'media-cleanup', intervalMs: 60000, run: () => processMediaCleanup({}) },
        { name: 'outbox', intervalMs: 5000, run: () => tickOutbox({}) },
        { name: 'shift-warnings', intervalMs: 60000, run: () => tickShiftWarnings({}) },
        { name: 'report-exports', intervalMs: 30000, run: () => tickReportExports({}) }
      ])
    : null;
  runtime.server.listen(runtime.config.port, () => {
    console.error(`404 Coffee API listening on port ${runtime.config.port}`);
  });
  let stopping = false;
  const stop = async (signal) => {
    if (stopping) return;
    stopping = true;
    try {
      workers?.stop();
      await shutdown(runtime, signal);
      process.exitCode = 0;
    } catch (error) {
      console.error(error);
      process.exitCode = 1;
    }
  };
  process.once('SIGTERM', () => void stop('SIGTERM'));
  process.once('SIGINT', () => void stop('SIGINT'));
  // Any error escaping all other boundaries (socket auth, timers, workers)
  // must shut the process down instead of leaving it half-open: attempt one
  // graceful shutdown, then force-exit so the orchestrator restarts cleanly.
  let failing = false;
  const failFast = (source) => (error) => {
    if (failing) return;
    failing = true;
    console.error({
      code: 'UNHANDLED_ERROR',
      source,
      message: error?.message ?? String(error)
    });
    setTimeout(() => process.exit(1), 20000);
    void Promise.resolve(stop(`UNHANDLED_${source}`)).then(
      () => process.exit(1),
      () => process.exit(1)
    );
  };
  process.on('unhandledRejection', failFast('REJECTION'));
  process.on('uncaughtException', failFast('EXCEPTION'));
}

main().catch((error) => {
  console.error({ code: 'BOOTSTRAP_FAILED', message: error.message });
  process.exitCode = 1;
});
