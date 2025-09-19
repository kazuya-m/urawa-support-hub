FROM denoland/deno:2.4.5
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcairo2 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y \
    && apt-get autoclean -y

EXPOSE 8080
WORKDIR /app

COPY deno.json deno.lock* ./
COPY src/ ./src/
RUN deno cache src/main.ts

COPY . .

ENV PORT=8080
ENV NODE_ENV=production

# Create cache directory for deno user and install Playwright browsers
RUN mkdir -p /home/deno/.cache && chown deno:deno /home/deno/.cache
USER deno
RUN deno run --allow-env --allow-net --allow-read --allow-write --allow-run --allow-sys npm:playwright@1.40.0 install chromium

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-env", \
     "--allow-read", \
     "--allow-write", \
     "--allow-run", \
     "--allow-sys", \
     "--watch", \
     "src/main.ts"]