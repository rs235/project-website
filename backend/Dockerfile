FROM node:26-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    PHOTO_DIR=/app/photos \
    CACHE_DIR=/app/cache

WORKDIR /app

COPY package.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; \
    else npm install --omit=dev --no-audit --no-fund; fi \
    && npm cache clean --force

COPY src ./src
RUN mkdir -p /app/photos /app/cache \
    && chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "src/server.js"]
