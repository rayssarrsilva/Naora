# syntax=docker/dockerfile:1
# Naora · production image. Three stages keep the final image small: no dev dependencies,
# no source code, only the standalone Next.js server. It runs as a non-root user.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
ENV CYPRESS_INSTALL_BINARY=0 HUSKY=0
RUN npm ci --legacy-peer-deps

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# The public address is written into the build (metadata, links). Hosts like Render pass it in.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S naora && adduser -S naora -G naora
COPY --from=build --chown=naora:naora /app/.next/standalone ./
COPY --from=build --chown=naora:naora /app/.next/static ./.next/static
COPY --from=build --chown=naora:naora /app/public ./public
USER naora
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
