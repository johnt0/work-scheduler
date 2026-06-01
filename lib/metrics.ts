import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Use a global to survive hot-reload in dev without duplicate metric errors
const globalForMetrics = globalThis as typeof globalThis & { metricsRegistry?: Registry };

let registry: Registry;

if (globalForMetrics.metricsRegistry) {
    registry = globalForMetrics.metricsRegistry;
} else {
    registry = new Registry();
    globalForMetrics.metricsRegistry = registry;
}

export { registry };

export const jobsProcessed = new Counter({
    name: 'jobs_processed_total',
    help: 'Total number of jobs successfully processed',
    labelNames: ['type'],
    registers: [registry],
});

export const jobsFailed = new Counter({
    name: 'jobs_failed_total',
    help: 'Total number of jobs that failed',
    labelNames: ['type'],
    registers: [registry],
});

export const jobDuration = new Histogram({
    name: 'job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['type'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
});

export const queueDepth = new Gauge({
    name: 'queue_depth',
    help: 'Number of jobs currently waiting in the queue',
    registers: [registry],
});
