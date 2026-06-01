import { config } from 'dotenv';
config({ path: '.env.local' });

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processor } from './processor.js';
import { logger } from '../lib/logger.js';
import { jobsProcessed, jobsFailed, jobDuration } from '../lib/metrics.js';

const connection = new Redis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });
const concurrency = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10);

const worker = new Worker('jobs', async (job) => {
    const end = jobDuration.startTimer({ type: job.data.type });
    try {
        await processor(job);
        end();
        jobsProcessed.inc({ type: job.data.type });
    } catch (err) {
        end();
        jobsFailed.inc({ type: job.data.type });
        throw err;
    }
}, { connection, concurrency });

worker.on('completed', (job) => logger.info({ jobId: job.id }, 'job completed'));
worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err: err.message }, 'job failed'));

process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down worker gracefully');
    await worker.close();
    process.exit(0);
});
