FROM node:20-bullseye AS base

# System deps (Debian)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-venv python3-pip ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# rembg (CPU) in a small venv — use LIBRARY ONLY (no CLI)
RUN python3 -m venv /opt/pyenv \
 && /opt/pyenv/bin/pip install --no-cache-dir --upgrade pip \
 && /opt/pyenv/bin/pip install --no-cache-dir \
    "rembg[cpu]==2.0.56" \
    "Pillow>=9.5" \
    "numpy>=1.23"

# A tiny helper that reads image bytes from stdin, removes BG via rembg API, writes PNG to stdout
RUN printf '%s\n' \
'#!/opt/pyenv/bin/python' \
'import sys, os, io' \
'from PIL import Image' \
'from rembg import remove, new_session' \
'import argparse' \
'' \
'def main():' \
'    ap = argparse.ArgumentParser()' \
'    ap.add_argument("--model", default="auto")' \
'    ap.add_argument("--alpha-matting", action="store_true")' \
'    ap.add_argument("--only-mask", action="store_true")' \
'    args = ap.parse_args()' \
'' \
'    data = sys.stdin.buffer.read()' \
'    if not data:' \
'        print("no stdin data", file=sys.stderr)' \
'        sys.exit(2)' \
'' \
'    img = Image.open(io.BytesIO(data)).convert("RGBA")' \
'    session = None' \
'    if args.model and args.model != "auto":' \
'        session = new_session(args.model)' \
'' \
'    out = remove(' \
'        img,' \
'        session=session,' \
'        alpha_matting=args.alpha_matting,' \
'        only_mask=args.only_mask' \
'    )' \
'' \
'    buf = io.BytesIO()' \
'    out.save(buf, format="PNG")' \
'    sys.stdout.buffer.write(buf.getvalue())' \
'' \
'if __name__ == "__main__":' \
'    main()' \
> /opt/pyenv/bin/rembg_pipe.py && chmod +x /opt/pyenv/bin/rembg_pipe.py    

# Make rembg visible and set model cache dir
ENV PATH="/opt/pyenv/bin:${PATH}" \
    REMBG_BIN=rembg \
    REMBG_DRIVER=local \
    U2NET_HOME=/data/u2net

RUN mkdir -p /data/u2net

############################
# Build
############################
FROM base AS builder
WORKDIR /app

# Install dependencies (npm only for reliability in CI)
# If you need yarn/pnpm, tell me which one and I'll adapt.
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
# If you want to disable Next telemetry at build time:
# ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

############################
# Runtime
############################
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

RUN apt-get update

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