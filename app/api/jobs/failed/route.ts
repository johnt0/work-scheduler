import { jobQueue } from "@/lib/queue";

export async function GET(request: Request) {
    const jobs = await jobQueue.getJobs(['failed']);

    return Response.json(
        jobs.map(j => ({
            id: j.id,
            data: j.data,
            failedReason: j.failedReason,
            attemptsMade: j.attemptsMade,
        }))
    );
}