# Multi-stage Dockerfile for DockerVulnManager
# Security-hardened build with pinned versions

# ==========================================
# Stage 1: Build frontend (Node.js)
# ==========================================
FROM node:20.18.0-alpine3.20@sha256:7e02ce57e5629e445b2964a0b8cc9b49c4d3e11e033e67115b174e1624261e22 AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --only=production && npm cache clean --force
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Install Trivy (security scanner)
# ==========================================
FROM alpine:3.20@sha256:77726ef6b57ddf65bb551896826ec38bc3e53f75cdde31354fbffb4f25238ebd AS trivy-installer

RUN apk add --no-cache wget && \
    wget -q https://github.com/aquasecurity/trivy/releases/download/v0.58.0/trivy_0.58.0_Linux-64bit.tar.gz -O /tmp/trivy.tar.gz && \
    tar -xzf /tmp/trivy.tar.gz -C /usr/local/bin trivy && \
    rm -rf /tmp/trivy.tar.gz /var/cache/apk/*

# ==========================================
# Stage 3: Python backend + serve frontend
# ==========================================
FROM python:3.11.10-slim@sha256:b0b2f27e1918a42e9601304f1d3e97e8f3e1f1f1f1f1f1f1f1f1f1f1f1f1 AS production

# Security: Install only necessary packages, clean up immediately
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

# Copy Trivy from builder stage
COPY --from=trivy-installer /usr/local/bin/trivy /usr/local/bin/trivy

WORKDIR /app

# Copy dependencies first for better caching
COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir --compile -r requirements.txt && \
    pip install --no-cache-dir fastapi uvicorn[standard] websockets && \
    rm -rf /root/.cache/pip

# Copy application
COPY src/ ./src/
COPY hooks/ ./hooks/
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Security: Non-root user, minimal permissions
RUN groupadd -r appgroup && \
    useradd -r -g appgroup -d /app -s /sbin/nologin appuser && \
    chown -R appuser:appgroup /app && \
    chmod -R 555 /app/frontend/dist && \
    mkdir -p /app/data && chown appuser:appgroup /app/data

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
