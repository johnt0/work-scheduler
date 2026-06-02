# Stage 1: install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: build the Next.js app
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: production image (used by both app and worker)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy dependencies (includes tsx, needed by the worker)
COPY --from=deps /app/node_modules ./node_modules

# Copy Next.js build output (used by the app)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy source files needed by the worker at runtime
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/lib ./lib

# Copy config needed for module resolution
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./

EXPOSE 3000

# Default: run the Next.js server
# docker-compose overrides this to "npm run worker" for the worker service
CMD ["npm", "start"]
