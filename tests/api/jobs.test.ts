const BASE = 'http://localhost:3000';
const AUTH = { Authorization: 'Bearer dev-secret-key', 'Content-Type': 'application/json' };

const VALID_JOB = { type: 'email', to: 'test@example.com', subject: 'Hello' };

const POLL_TIMEOUT = parseInt(process.env.TEST_JOB_TIMEOUT ?? '20000', 10);

async function pollStatus(jobId: string, timeout = POLL_TIMEOUT): Promise<string> {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const res = await fetch(`${BASE}/api/jobs/${jobId}`, { headers: AUTH });
        // removeOnComplete: true deletes the job hash after completion; 404 means it finished
        if (res.status === 404) return 'completed';
        const data = await res.json() as { status: string };
        if (data.status === 'completed' || data.status === 'failed') return data.status;
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
}

describe('POST /api/jobs', () => {
    test('returns 401 without API key', async () => {
        const res = await fetch(`${BASE}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(VALID_JOB),
        });
        expect(res.status).toBe(401);
    });

    test('returns 400 for invalid payload', async () => {
        const res = await fetch(`${BASE}/api/jobs`, {
            method: 'POST',
            headers: AUTH,
            body: JSON.stringify({ type: 'email', to: 'not-an-email' }),
        });
        expect(res.status).toBe(400);
        const body = await res.json() as { error: string };
        expect(body.error).toBe('ValidationError');
    });

    test('returns 201 with jobId for valid payload', async () => {
        const res = await fetch(`${BASE}/api/jobs`, {
            method: 'POST',
            headers: AUTH,
            body: JSON.stringify(VALID_JOB),
        });
        expect(res.status).toBe(201);
        const body = await res.json() as { jobId: string };
        expect(body.jobId).toBeDefined();
    });

    test('job completes successfully', async () => {
        const res = await fetch(`${BASE}/api/jobs`, {
            method: 'POST',
            headers: AUTH,
            body: JSON.stringify(VALID_JOB),
        });
        const { jobId } = await res.json() as { jobId: string };
        const status = await pollStatus(jobId);
        expect(status).toBe('completed');
    });

    test('idempotency key returns same jobId on second request', async () => {
        const body = { ...VALID_JOB, idempotencyKey: `idem-${Date.now()}` };
        const first = await fetch(`${BASE}/api/jobs`, {
            method: 'POST', headers: AUTH, body: JSON.stringify(body),
        });
        const { jobId: id1 } = await first.json() as { jobId: string };

        const second = await fetch(`${BASE}/api/jobs`, {
            method: 'POST', headers: AUTH, body: JSON.stringify(body),
        });
        const { jobId: id2 } = await second.json() as { jobId: string };
        expect(second.status).toBe(200);
        expect(id1).toBe(id2);
    });

    test('10 concurrent jobs all complete', async () => {
        const jobs = await Promise.all(
            Array.from({ length: 10 }, () =>
                fetch(`${BASE}/api/jobs`, {
                    method: 'POST', headers: AUTH,
                    body: JSON.stringify(VALID_JOB),
                }).then(r => r.json() as Promise<{ jobId: string }>)
            )
        );
        const statuses = await Promise.all(jobs.map(j => pollStatus(j.jobId)));
        expect(statuses.every(s => s === 'completed')).toBe(true);
    });

    test('rate limiter returns 429 after limit exceeded', async () => {
        // Use a unique IP via header to isolate this test
        const headers = { ...AUTH, 'x-forwarded-for': `10.0.${Date.now() % 255}.1` };
        const requests = Array.from({ length: 102 }, () =>
            fetch(`${BASE}/api/jobs`, {
                method: 'POST', headers, body: JSON.stringify(VALID_JOB),
            })
        );
        const responses = await Promise.all(requests);
        const statuses = responses.map(r => r.status);
        expect(statuses).toContain(429);
    });
});

describe('GET /api/jobs', () => {
    test('returns paginated job list', async () => {
        const res = await fetch(`${BASE}/api/jobs?page=1&limit=5`);
        expect(res.status).toBe(200);
        const body = await res.json() as { data: unknown[]; pagination: { page: number } };
        expect(body.data).toBeDefined();
        expect(body.pagination.page).toBe(1);
    });
});

describe('GET /api/jobs/:id', () => {
    test('returns 404 for unknown job', async () => {
        const res = await fetch(`${BASE}/api/jobs/nonexistent-id-12345`);
        expect(res.status).toBe(404);
    });
});
