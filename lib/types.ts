import { z } from 'zod';

const EmailJobSchema = z.object({
    type: z.literal('email'),
    to: z.string().email(),
    subject: z.string().min(1),
    idempotencyKey: z.string().optional(),
});

const ReportJobSchema = z.object({
    type: z.literal('report'),
    reportId: z.string().min(1),
    format: z.enum(['pdf', 'csv', 'json']),
    idempotencyKey: z.string().optional(),
});

const WebhookJobSchema = z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    payload: z.record(z.string(), z.unknown()).optional(),
    idempotencyKey: z.string().optional(),
});

export const JobSchema = z.discriminatedUnion('type', [
    EmailJobSchema,
    ReportJobSchema,
    WebhookJobSchema,
]);

export type JobPayload = z.infer<typeof JobSchema>;

export interface JobResponse {
    id: string;
    status: string;
    data: JobPayload;
    result?: unknown;
    failedReason?: string;
}
