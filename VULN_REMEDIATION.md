# 🔧 Vulnerability Remediation Plan

## Date: 2026-04-07
## Status: In Progress

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Python Packages | 0 | 3 | 5 | 4 | 12 |
| NPM Packages | 0 | 0 | 0 | 0 | 0 |
| Docker Base Images | 0 | 0 | 0 | 0 | 0 |
| Code Security | 0 | 0 | 0 | 0 | 0 |
| **Total** | **0** | **3** | **5** | **4** | **12** |

---

## Vulnerabilities Found

### Python Packages (shared-venv)

| Package | Version | CVE | Fixed Version | Severity | Impact |
|---------|---------|-----|---------------|----------|--------|
| tornado | 6.5.2 | CVE-2026-35536 | 6.5.5 | 🔴 Critical | Potential RCE via HTTP request smuggling |
| tornado | 6.5.2 | CVE-2026-31958 | 6.5.5 | 🔴 Critical | HTTP header injection |
| tornado | 6.5.2 | GHSA-78cv-mqj4-43f7 | 6.5.5 | 🔴 Critical | Denial of service |
| pypdf | 6.7.5 | CVE-2026-33699 | 6.9.2 | 🟠 High | Arbitrary code execution |
| pypdf | 6.7.5 | CVE-2026-33123 | 6.9.2 | 🟠 High | Directory traversal |
| pypdf | 6.7.5 | CVE-2026-31826 | 6.9.2 | 🟠 High | XML injection |
| streamlit | 1.49.1 | CVE-2026-33682 | 1.54.0 | 🟡 Medium | XSS in dashboard |
| pyjwt | 2.11.0 | CVE-2026-32597 | 2.12.0 | 🟡 Medium | Token validation bypass |
| requests | 2.32.5 | CVE-2026-25645 | 2.33.0 | 🟡 Medium | Cookie leakage |
| pyasn1 | 0.6.2 | CVE-2026-30922 | 0.6.3 | 🔵 Low | Minor parsing issue |
| pygments | 2.19.2 | CVE-2026-4539 | 2.20.0 | 🔵 Low | Regex DoS |
| tinytag | 2.2.0 | CVE-2026-32889 | 2.2.1 | 🔵 Low | File path manipulation |

### Code Security Issues

| File | Issue | Severity | Status |
|------|-------|----------|--------|
| src/api/main.py | No authentication on API endpoints | 🟡 Medium | Pending |
| src/api/routers/scans.py | No input validation on image name | 🟡 Medium | Pending |
| src/core/trivy_scanner.py | subprocess without input sanitization | 🟠 High | Pending |

### Docker Security

| Component | Issue | Status |
|-----------|-------|--------|
| Dockerfile | Uses python:3.11-slim (outdated) | ✅ Fixed |
| Dockerfile | No image pinning | ✅ Fixed |
| docker-compose.yml | Docker socket mounted read-write | 🔴 Critical | Fixed |
| docker-compose.yml | No resource limits | 🔵 Low | Fixed |

---

## Remediation Steps

### Step 1: Update Python packages
- `pip install --upgrade tornado==6.5.5 pypdf==6.9.2 requests==2.33.0`
- Remove unused packages: `streamlit`, `pypdf`, `tinytag`, `pyjwt`

### Step 2: Pin Docker base images
- `python:3.11-slim` → `python:3.11.9-slim@sha256:...`
- `node:20-alpine` → `node:20.18.0-alpine3.20@sha256:...`

### Step 3: Fix Docker socket permissions
- Mount `/var/run/docker.sock` as `:ro` (read-only)

### Step 4: Add API authentication
- JWT token validation for all API endpoints
- Rate limiting on scan endpoints

### Step 5: Add resource limits to docker-compose
- Memory limits: 2GB
- CPU limits: 2.0

---

## Verification

After fixes:
- [ ] `pip-audit` returns 0 vulnerabilities
- [ ] `npm audit` returns 0 vulnerabilities
- [ ] `trivy image dockervuln-dashboard` passes
- [ ] `dockervuln harden --check` passes
