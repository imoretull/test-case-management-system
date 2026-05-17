#!/usr/bin/env node
import path from 'node:path';
import { startServer } from './server.ts';

function parseArgs(): { dataRoot: string; appRoot: string; port?: number } {
  const args = process.argv.slice(2);
  let dataRoot: string | undefined;
  let appRoot: string | undefined;
  let port: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--data' || a === '-d') {
      dataRoot = args[++i];
    } else if (a === '--app' || a === '-a') {
      appRoot = args[++i];
    } else if (a === '--port' || a === '-p') {
      port = parseInt(args[++i], 10);
    } else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: tcms-server --data <data-path> --app <app-root> [--port 3030]\n' +
          '\n' +
          '  --data    Path to data folder (stories.json, manual/, etc.)\n' +
          '  --app     Path to app root (where playwright.config lives)\n' +
          '  --port    Port to listen on (default 3030)\n' +
          '\n' +
          'Defaults: --app derived from --data parent, --port 3030',
      );
      process.exit(0);
    }
  }

  dataRoot = dataRoot ?? process.env.TCMS_DATA_ROOT ?? path.join(process.cwd(), 'data');
  // If --app not given, assume the parent of dataRoot (e.g. apps/amazon/data → apps/amazon).
  appRoot = appRoot ?? path.dirname(path.resolve(dataRoot));
  return {
    dataRoot: path.resolve(dataRoot),
    appRoot: path.resolve(appRoot),
    port,
  };
}

const opts = parseArgs();
const server = await startServer(opts);

function shutdown() {
  console.log('\n[tcms-server] shutting down');
  server.close().then(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
