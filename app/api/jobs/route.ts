import { jobQueue } from "@/lib/queue";
import { JobSchema } from "@/lib/types";
import redis from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: 'InvalidJSON', message: 'Request body must be valid JSON' }, { status: 400 });
    }

    const parsed = JobSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json(
            { error: 'ValidationError', details: parsed.error.issues },
            { status: 400 }
        );
    }

    const data = parsed.data;

    if (!data.idempotencyKey) {
        const job = await jobQueue.add("process-job", data);
        return Response.json({ jobId: job.id }, { status: 201 });
    }

    const existingJobId = await redis.get(`idempotency:${data.idempotencyKey}`);
    if (existingJobId) return Response.json({ jobId: existingJobId }, { status: 200 });

    const job = await jobQueue.add("process-job", data);
    await redis.set(`idempotency:${data.idempotencyKey}`, job.id!, 'EX', 86400);
    return Response.json({ jobId: job.id }, { status: 201 });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") ?? 1);
    const limit = Number(searchParams.get("limit") ?? 20);

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const [jobs, counts] = await Promise.all([
        jobQueue.getJobs(["waiting", "active", "completed", "failed"], start, end),
        jobQueue.getJobCounts("waiting", "active", "completed", "failed"),
    ]);

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
        data: jobs.map(j => ({ id: j.id, name: j.name, data: j.data })),
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}
