# syntax=docker/dockerfile:1

# ------------------------------------------------------------------------------
# Stage 1: Dependencies (deps)
# ------------------------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app

# Install OpenSSL and CA certificates for Prisma CLI compatibility
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm ci

# ------------------------------------------------------------------------------
# Stage 2: Builder (builder)
# ------------------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma engine compatibility during compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables needed during build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/app/prisma/portfolio.db"

# Generate Prisma Client and compile Next.js standalone application
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Runner (runner)
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

# Install Python 3, pip, system alias, curl, and python libraries for fundamentals
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python-is-python3 \
    openssl \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/* \
 && pip3 install --no-cache-dir --break-system-packages yfinance pandas

# Runtime environment settings
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
ENV DATABASE_URL="file:/app/prisma/portfolio.db"

# Copy standalone build, static assets, and public directory
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Ensure Prisma client binary engines are included in runtime node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema and live SQLite database
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/portfolio.db ./prisma/portfolio.db

# Ensure SQLite database and directory are writable at runtime
RUN chmod -R 777 /app/prisma

# Copy Python calculation scripts executed via child_process at runtime
COPY src/lib/get_company_fundamentals.py ./src/lib/get_company_fundamentals.py
COPY src/lib/fundamental_math.py ./src/lib/fundamental_math.py
COPY src/lib/valuation_measures.py ./src/lib/valuation_measures.py

# Copy CSV statement file needed at runtime
COPY trading-account-statement_2026-06-10_2026-11-03_en_129c4e.csv ./trading-account-statement_2026-06-10_2026-11-03_en_129c4e.csv

EXPOSE 3000

CMD ["node", "server.js"]
