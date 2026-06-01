import { jobQueue } from "@/lib/queue";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { searchParams } = new URL(request.url);

    const { id } = await params;

    const job = await jobQueue.getJob(id);

    if (!job) {
        return Response.json({ error: "Job not found" }, { status: 404 });
    }

    return Response.json({
        id: job.id,
        status: await job.getState(),
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
    });
}