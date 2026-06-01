import { jobQueue } from '@/lib/queue';
import redis from '@/lib/redis';

export async function GET() {
    let redisStatus = 'connected';

    try {
        await redis.ping();
    } catch {
        redisStatus = 'disconnected';
    }

    if (redisStatus === 'disconnected') {
        return Response.json(
            { status: 'error', redis: 'disconnected' },
            { status: 503 }
        );
    }

    const queueDepth = await jobQueue.getWaitingCount();
    const activeWorkers = Number(process.env.WORKER_CONCURRENCY ?? 5);

    return Response.json({
        status: 'ok',
        redis: 'connected',
        queueDepth,
        activeWorkers,
    });
}
