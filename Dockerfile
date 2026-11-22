# ===================================================
# Dockerfile for Skill 98 (پلتفرم اسکیل ۹۸ — DPATech-CMS-Core)
# Full-Stack Vite + Express Server Application (Ubuntu Docker Ready)
# ===================================================

# ---------------------------------------------------
# Stage 1: Build stage
# ---------------------------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Optional Vite build-time admin bootstrap email
ARG VITE_BOOTSTRAPPED_ADMIN_EMAIL=""
ENV VITE_BOOTSTRAPPED_ADMIN_EMAIL=${VITE_BOOTSTRAPPED_ADMIN_EMAIL}

# Copy package files for dependency caching
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm install --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build Vite frontend (dist) & compile server.ts to server.js via project build script
RUN npm run build

# ---------------------------------------------------
# Stage 2: Production runner stage
# ---------------------------------------------------
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Security: create dedicated non-root runtime user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built distribution files and compiled backend server from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/modules/registry.json ./modules/registry.json
COPY --from=builder /app/vite.config.* ./
COPY --from=builder /app/firebase-applet-config.* ./

# Ensure persistent uploads & data directories exist with correct ownership
RUN mkdir -p /app/uploads /app/data \
    && chown -R appuser:appgroup /app

USER appuser

# Expose default application port
EXPOSE 3000

# Healthcheck: force IPv4 (127.0.0.1) because Node binds to 0.0.0.0 only,
# while BusyBox wget resolves "localhost" to IPv6 (::1) and gets Connection refused.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:3000/api/health" || exit 1

# Run the full-stack production Express server
CMD ["node", "server.js"]
