# ===================================================
# Dockerfile for Skill 98 (پلتفرم اسکیل ۹۸ — DPATech-CMS-Core)
# Full-Stack Vite + Express Server Application (Ubuntu Docker Ready)
# ===================================================

# ---------------------------------------------------
# Stage 1: Build stage
# ---------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

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
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NPM_CONFIG_LEGACY_PEER_DEPS=true

# Security: create dedicated non-root runtime directories
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Copy built distribution files and compiled backend server from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/vite.config.* ./

# Ensure persistent uploads & data directories exist
RUN mkdir -p /app/uploads /app/data

# Expose default application port
EXPOSE 3000

# Healthcheck for Ubuntu Docker / Traefik orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Run the full-stack production Express server
CMD ["node", "server.js"]
