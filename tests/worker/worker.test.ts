import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let connection: Redis;
let testQueue: Queue;

beforeAll(() => {
    connection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
    testQueue = new Queue('test-worker', { connection });
});

afterAll(async () => {
    await testQueue.obliterate({ force: true });
    await testQueue.close();
    await connection.quit();
});

test('failed job triggers retry with backoff', async () => {
    let attempts = 0;
    const worker = new Worker('test-worker', async () => {
        attempts++;
        throw new Error('deliberate failure');
    }, {
        connection: new Redis(REDIS_URL, { maxRetriesPerRequest: null }),
    });

    await testQueue.add('retry-test', {}, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 100 },
    });

    await new Promise<void>(resolve => {
        worker.on('failed', (job) => {
            if (job && job.attemptsMade >= 3) resolve();
        });
    });

    expect(attempts).toBe(3);
    await worker.close();
}, 20_000);

test('job lands in failed queue after max retries', async () => {
    const worker = new Worker('test-worker', async () => {
        throw new Error('always fails');
    }, {
        connection: new Redis(REDIS_URL, { maxRetriesPerRequest: null }),
    });

    await testQueue.add('dlq-test', {}, { attempts: 2, backoff: { type: 'fixed', delay: 50 } });

    await new Promise<void>(resolve => {
        worker.on('failed', (job) => {
            if (job && job.attemptsMade >= 2) resolve();
        });
    });

    const failed = await testQueue.getFailed();
    expect(failed.length).toBeGreaterThan(0);
    await worker.close();
}, 20_000);

test('graceful shutdown completes active job before exiting', async () => {
    let jobStarted = false;
    let jobFinished = false;

    const worker = new Worker('test-worker', async () => {
        jobStarted = true;
        await new Promise(r => setTimeout(r, 200));
        jobFinished = true;
    }, {
        connection: new Redis(REDIS_URL, { maxRetriesPerRequest: null }),
    });

    await testQueue.add('shutdown-test', {});

    // Wait for job to start then close
    await new Promise<void>(resolve => {
        const interval = setInterval(() => {
            if (jobStarted) { clearInterval(interval); resolve(); }
        }, 50);
    });

    await worker.close();
    expect(jobFinished).toBe(true);
}, 20_000);
