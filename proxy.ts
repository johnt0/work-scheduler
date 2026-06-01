import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import redis from '@/lib/redis';

const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 100);
const RATE_LIMIT_WINDOW_S = Math.ceil(Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000) / 1000);

function isValidApiKey(supplied: string): boolean {
    const keys = (process.env.API_KEYS ?? '').split(',').filter(Boolean);
    return keys.some(key => {
        try {
            const a = Buffer.from(key.trim());
            const b = Buffer.from(supplied.trim());
            if (a.length !== b.length) {
                // still run timingSafeEqual on equal-length buffers to avoid timing leak
                timingSafeEqual(Buffer.from(key.trim()), Buffer.from(key.trim()));
                return false;
            }
            return timingSafeEqual(a, b);
        } catch {
            return false;
        }
    });
}

export async function proxy(request: NextRequest) {
    if (request.method === 'POST') {
        const authHeader = request.headers.get('authorization') ?? '';
        const supplied = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

        if (!isValidApiKey(supplied)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (request.method === 'POST') {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
        const key = `rate:${ip}`;

        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_S);

        if (count > RATE_LIMIT_MAX) {
            const ttl = await redis.ttl(key);
            return new Response('Too Many Requests', {
                status: 429,
                headers: { 'Retry-After': String(ttl) },
            });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/jobs',
};