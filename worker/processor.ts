import { Job } from 'bullmq';
import { JobPayload } from '@/lib/types';
import { logger } from '@/lib/logger';

async function handleEmail(job: Job<JobPayload>) {
    logger.info({ jobId: job.id, type: 'email' }, 'processing email job');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
}

async function handleReport(job: Job<JobPayload>) {
    logger.info({ jobId: job.id, type: 'report' }, 'processing report job');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
}

async function handleWebhook(job: Job<JobPayload>) {
    logger.info({ jobId: job.id, type: 'webhook' }, 'processing webhook job');
    await new Promise(resolve => setTimeout(resolve, Math.random() * 150 + 50));
}

const registry: Record<string, (job: Job<JobPayload>) => Promise<void>> = {
    email: handleEmail,
    report: handleReport,
    webhook: handleWebhook,
};

export async function processor(job: Job<JobPayload>): Promise<void> {
    const handler = registry[job.data.type];
    if (!handler) throw new Error(`Unknown job type: ${job.data.type}`);
    await handler(job);
}
