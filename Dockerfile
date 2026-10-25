# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Backend addresses are baked into the bundle at build time (public, never a secret).
# Leave one empty to use http://localhost:<its port> from src/lab/projects.json.
ARG VITE_PILAH_URL=
ARG VITE_GATEKEEPER_URL=
ARG VITE_LENS_URL=
ARG VITE_LEDGER_URL=
ARG VITE_FOOTFALL_URL=
ENV VITE_PILAH_URL=${VITE_PILAH_URL} VITE_GATEKEEPER_URL=${VITE_GATEKEEPER_URL} VITE_LENS_URL=${VITE_LENS_URL} \n    VITE_LEDGER_URL=${VITE_LEDGER_URL} VITE_FOOTFALL_URL=${VITE_FOOTFALL_URL}
RUN npm run build

# Static files only: no Node at runtime, nginx runs as a non-root user on 8080.
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
