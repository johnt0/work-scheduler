export default async function globalTeardown() {
    const workerProcess = globalThis.__workerProcess;
    if (!workerProcess || workerProcess.exitCode !== null) return;

    await new Promise((resolve) => {
        const killTimeout = setTimeout(() => {
            if (workerProcess.exitCode === null) workerProcess.kill('SIGKILL');
            resolve();
        }, 5000);
        killTimeout.unref(); // don't let this timer prevent process exit

        workerProcess.once('exit', () => {
            clearTimeout(killTimeout);
            resolve();
        });

        workerProcess.kill('SIGTERM');
    });
}
