FROM node:20-bullseye AS base

# ---- Common system deps for ALL stages (Debian) ----
# (Keep this in base so deps/builder/runner inherit the same environment)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-venv python3-pip ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# ---- rembg (Python venv) available to all stages ----
RUN python3 -m venv /opt/pyenv \
 && /opt/pyenv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/pyenv/bin/pip install --no-cache-dir "rembg[cpu,cli]"

# rembg on PATH and cache dir preset
ENV PATH="/opt/pyenv/bin:${PATH}" \
    REMBG_BIN=rembg \
    REMBG_DRIVER=local \
    U2NET_HOME=/data/u2net

# Ensure model cache dir exists (can also be a mounted volume at runtime)
RUN mkdir -p /data/u2net

# ==========================
# Install dependencies only when needed
# ==========================
FROM base AS deps
WORKDIR /app  # <-- IMPORTANT: ensure node_modules goes under /app

# Copy lockfiles and install deps with your chosen package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./
RUN \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi

# ==========================
# Rebuild the source code only when needed
# ==========================
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build (Next.js)
RUN \
    if [ -f yarn.lock ]; then yarn run build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
    else echo "Lockfile not found." && exit 1; \
    fi

# ==========================
# Production image, copy all the files and run next
# ==========================
FROM base AS runner
WORKDIR /app

# ENV NODE_ENV=development
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

LABEL org.opencontainers.image.source https://github.com/z3rsa/video-compressor

RUN apt get-update

# Create the /app/temp directory and set proper ownership
RUN mkdir -p /app/temp && chown nextjs:nodejs /app/temp
RUN mkdir -p /app/input && chown nextjs:nodejs /app/input
RUN mkdir -p /data/u2net && chown nextjs:nodejs /data/u2net

# Ensure the directories are writable
RUN chmod -R 777 /app/temp /app/input /data/u2net

USER nextjs

EXPOSE 3535

ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]