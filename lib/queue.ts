import { Queue } from "bullmq";
import redis from './redis';

export const jobQueue = new Queue('jobs', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: 10,
    },
});

