FROM denoland/deno:2.0.0
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get autoremove -y \
    && apt-get autoclean -y

EXPOSE 8080
WORKDIR /app

COPY import_map.json deno.json deno.lock* ./
COPY src/ ./src/
RUN deno cache --import-map=import_map.json src/cloud-run/scraping-service/main.ts

COPY . .
ENV PLAYWRIGHT_BROWSERS_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

ENV PORT=8080
ENV NODE_ENV=production
USER deno

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1
CMD ["deno", "run", \
     "--allow-net", \
     "--allow-env", \
     "--allow-read", \
     "--allow-run", \
     "--allow-sys", \
     "--import-map=import_map.json", \
     "src/cloud-run/scraping-service/main.ts"]