import { spawn } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../..');

export default async function globalSetup() {
    const tsx = resolve(rootDir, 'node_modules/.bin/tsx');

    const workerProcess = spawn(tsx, ['worker/index.ts'], {
        env: { ...process.env },
        cwd: rootDir,
        stdio: 'pipe',
    });

    workerProcess.stdout.on('data', (data) => process.stdout.write(`[worker] ${data}`));
    workerProcess.stderr.on('data', (data) => process.stderr.write(`[worker] ${data}`));

    globalThis.__workerProcess = workerProcess;

    // Wait for the worker to connect to Redis and begin polling
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 2000);
        workerProcess.once('error', (err) => {
            clearTimeout(timeout);
            reject(new Error(`Worker failed to start: ${err.message}`));
        });
    });

    if (workerProcess.exitCode !== null) {
        throw new Error(`Worker process exited prematurely with code ${workerProcess.exitCode}`);
    }
}
