import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import { resolve, extname } from 'path';
import { timingSafeEqual } from 'crypto';
import { bullBoardQueues, uiConfig, appRoutes } from '@/lib/bullboard';

const UI_DIST = resolve('node_modules/@bull-board/ui/dist');
const BASE_PATH = '/admin/queues';

function isAuthorized(request: NextRequest): boolean {
    const keys = (process.env.API_KEYS ?? '').split(',').filter(Boolean);
    const auth = request.headers.get('authorization') ?? '';
    const supplied = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    return keys.some(key => {
        try {
            const a = Buffer.from(key.trim());
            const b = Buffer.from(supplied.trim());
            if (a.length !== b.length) return false;
            return timingSafeEqual(a, b);
        } catch {
            return false;
        }
    });
}

const MIME: Record<string, string> = {
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
};

function renderHtml(basePath: string): string {
    const template = readFileSync(`${UI_DIST}/index.ejs`, 'utf-8');
    return template
        .replace('<%= basePath %>', `${basePath}/`)
        .replace('<%= title %>', uiConfig.boardTitle ?? 'Bull Board')
        .replace('<%= favIconDefault %>', 'static/favicon.svg')
        .replace('<%= favIconAlternative %>', 'static/favicon.png')
        .replace('<%- uiConfig %>', JSON.stringify(uiConfig));
}

function matchRoute(method: string, pathname: string) {
    for (const route of appRoutes.api) {
        const methods = Array.isArray(route.method) ? route.method : [route.method];
        if (!methods.includes(method.toLowerCase())) continue;

        const routePaths = Array.isArray(route.route) ? route.route : [route.route];
        for (const routePath of routePaths) {
            const pattern = routePath.replace(/:([^/]+)/g, '(?<$1>[^/]+)');
            const regex = new RegExp(`^${pattern}$`);
            const match = pathname.match(regex);
            if (match) return { handler: route.handler, params: match.groups ?? {} };
        }
    }
    return null;
}

async function handler(request: NextRequest) {
    if (!isAuthorized(request)) {
        return new Response(null, {
            status: 302,
            headers: { Location: `${BASE_PATH}?error=unauthorized` },
        });
    }

    const url = new URL(request.url);
    // Strip the base path prefix to get the relative path for route matching
    const relativePath = url.pathname.replace(BASE_PATH, '') || '/';

    // Serve static assets
    if (relativePath.startsWith('/static/')) {
        try {
            const file = readFileSync(`${UI_DIST}${relativePath}`);
            const ext = extname(relativePath);
            return new Response(file, {
                headers: { 'Content-Type': MIME[ext] ?? 'application/octet-stream' },
            });
        } catch {
            return new Response('Not found', { status: 404 });
        }
    }

    // Serve API routes
    if (relativePath.startsWith('/api/')) {
        const query = Object.fromEntries(url.searchParams.entries());
        let body: Record<string, unknown> = {};
        if (request.method !== 'GET') {
            try { body = await request.json(); } catch { /* empty body */ }
        }

        const matched = matchRoute(request.method, relativePath);
        if (!matched) return new Response('Not found', { status: 404 });

        try {
            const result = await matched.handler({
                queues: bullBoardQueues,
                uiConfig,
                query,
                params: matched.params,
                body,
                headers: Object.fromEntries(request.headers.entries()),
            });
            return Response.json(result.body, { status: result.status ?? 200 });
        } catch (err) {
            return Response.json({ error: (err as Error).message }, { status: 500 });
        }
    }

    // Serve the SPA entry point for all other paths
    return new Response(renderHtml(BASE_PATH), {
        headers: { 'Content-Type': 'text/html' },
    });
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH };
