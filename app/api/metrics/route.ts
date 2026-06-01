import { registry, queueDepth } from '@/lib/metrics';
import { jobQueue } from '@/lib/queue';

export async function GET() {
    const depth = await jobQueue.getWaitingCount();
    queueDepth.set(depth);

    const metrics = await registry.metrics();
    return new Response(metrics, {
        headers: { 'Content-Type': registry.contentType },
    });
}
