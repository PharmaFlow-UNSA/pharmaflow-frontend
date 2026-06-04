# syntax=docker/dockerfile:1
# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* vars at build time. The browser (not a container) reaches the
# gateway via the host's published port, so the default points at localhost:8080.
ARG VITE_GATEWAY_URL=http://localhost:8080
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Use 127.0.0.1 (not localhost): busybox resolves localhost to ::1, but nginx
# binds IPv4 only, so a localhost healthcheck would wrongly report unhealthy.
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1
