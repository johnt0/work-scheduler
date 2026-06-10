import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        'job_e2e_duration': ['p(50)<10000', 'p(99)<15000'],
        'http_req_failed': ['rate<0.05'],
        'jobs_completed': ['count>0'],
    },
};

const jobDuration = new Trend('job_e2e_duration', true);
const jobsCompleted = new Counter('jobs_completed');

const BASE = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'dev-secret-key';

const HEADERS = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
};

function submitJob() {
    return http.post(
        `${BASE}/api/jobs`,
        JSON.stringify({ type: 'email', to: 'load@test.com', subject: 'Load test' }),
        { headers: HEADERS }
    );
}

function pollStatus(jobId, timeout = 15000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
        const res = http.get(`${BASE}/api/jobs/${jobId}`);
        const body = JSON.parse(res.body);
        if (body.status === 'completed' || body.status === 'failed') return body.status;
        sleep(0.1);
    }
    return 'timeout';
}

export default function loadTest() {
    const start = Date.now();

    const submitRes = submitJob();
    check(submitRes, { 'job submitted (2xx)': r => r.status >= 200 && r.status < 300 });

    if (submitRes.status !== 201 && submitRes.status !== 200) return;

    const { jobId } = JSON.parse(submitRes.body);
    const status = pollStatus(jobId);

    if (status === 'completed') {
        jobDuration.add(Date.now() - start);
        jobsCompleted.add(1);
    }

    check(null, { 'job completed': () => status === 'completed' });
}
