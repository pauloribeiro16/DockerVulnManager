# DockerVulnManager - Project Context

## Project Overview

**DockerVulnManager** is a comprehensive Docker vulnerability scanning and security hardening tool. It provides a CLI interface and a web dashboard (in development) to scan, analyze, and manage vulnerabilities in Docker images and containers.

### Key Features
- **Multi-engine vulnerability scanning** — Trivy integration (Grype planned)
- **Risk scoring** — 0-100 risk score per image with severity classification (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- **Multiple report formats** — JSON, CSV, HTML, Markdown
- **CIS Docker Benchmark** — Automated compliance checks
- **Dockerfile security analysis** — Detects security anti-patterns
- **Container runtime security** — Detects privileged containers, root users, etc.
- **Historical tracking** — Trend analysis over time
- **Web dashboard** — React 19 + TypeScript + Vite frontend (being integrated)

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, Click (CLI), Pydantic, SQLAlchemy |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS 4 |
| **Scanner** | Trivy (external binary) |
| **Database** | SQLite |
| **Web API** | FastAPI + Uvicorn (planned/partial) |
| **Charts** | ECharts + Recharts |
| **Testing** | pytest, pytest-cov, pytest-mock |
| **Linting** | ruff, mypy, black |

---

## Project Structure

```
DockerVulnManager/
├── src/                    # Python backend
│   ├── api/                # FastAPI web API (in development)
│   ├── cli/                # CLI commands (9 commands, fully functional)
│   ├── config/             # Pydantic settings
│   ├── core/               # Scanner orchestration, analysis, reports
│   ├── database/           # SQLite storage (SQLAlchemy)
│   ├── models/             # Pydantic data models
│   └── utils/              # Logging (loguru), helpers
├── frontend/               # React web dashboard (in development)
│   └── src/
│       ├── api/            # API client
│       ├── components/     # UI components + charts + layout
│       ├── hooks/          # React Query hooks
│       ├── pages/          # 6 pages (Overview, Vulns, Images, History, Hardening, Settings)
│       └── types/          # TypeScript interfaces
├── tests/                  # Python tests (33 passing)
├── hooks/                  # Pre-commit security hook (9 checks)
├── config/                 # Configuration files
├── data/                   # Sample data, templates
├── scripts/                # Helper scripts
└── docs/                   # Documentation
```

---

## Building and Running

### Prerequisites
- Python 3.10+
- Docker (for scanning local images)
- Trivy (vulnerability scanner binary) — [Install guide](https://aquasecurity.github.io/trivy/)
- Node.js + npm (for frontend development)

### Installation

```bash
# Install with editable mode
pip install -e .

# Or with development dependencies
pip install -e ".[dev]"
```

### CLI Usage

```bash
# Scan a single image
dockervuln scan nginx:latest

# Scan all local Docker images
dockervuln scan-all

# Generate report (html, json, csv, markdown)
dockervuln report nginx:latest --format html

# Compare two images
dockervuln compare nginx:1.21 nginx:1.22

# Run security hardening checks
dockervuln harden --check

# Analyze a Dockerfile
dockervuln analyze Dockerfile

# View scan history
dockervuln list --limit 10

# Show status
dockervuln status
```

### Web Dashboard (Development)

```bash
# Start the standalone frontend server (serves built frontend via Python http.server)
./start.sh          # default port 8888
./start.sh 9000     # custom port

# Stop the server
./stop.sh
```

### Docker Compose

```bash
# Build and run the dashboard container
docker compose up --build

# Run tests in container
docker compose --profile test up tests
```

### Testing

```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html

# Run specific test files
pytest tests/test_phase1.py -v
```

### Code Quality

```bash
# Linting
ruff check src/

# Type checking
mypy src/

# Code formatting
black src/
```

---

## CLI Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `scan` | Scan a Docker image | `dockervuln scan python:3.11-slim` |
| `scan-all` | Scan all local images | `dockervuln scan-all` |
| `list` | List scan history | `dockervuln list --limit 10` |
| `report` | Generate vulnerability report | `dockervuln report nginx:latest --format html` |
| `history` | Show scan history for image | `dockervuln history nginx` |
| `compare` | Compare two images | `dockervuln compare img1:tag img2:tag` |
| `harden` | Run security hardening checks | `dockervuln harden --check` |
| `analyze` | Analyze Dockerfile security | `dockervuln analyze ./Dockerfile` |
| `status` | Show app status | `dockervuln status` |

---

## Configuration

Configure via environment variables or `.env` file:

```bash
# Scanner settings
SCANNER_TRIVY_PATH=trivy
SCANNER_TIMEOUT=300
SCANNER_CACHE_ENABLED=true

# Database
DB_PATH=~/.dockervuln/vulns.db

# Security checks
SECURITY_CIS_BENCHMARK_VERSION=1.6.0
SECURITY_CHECK_ROOT_USER=true
SECURITY_MIN_SEVERITY=MEDIUM
```

---

## Development Conventions

- **Entry point**: `src.cli.main:cli` (Click-based CLI)
- **Settings**: Pydantic settings via `src.config.settings.settings` (singleton)
- **Database**: SQLAlchemy with SQLite, models in `src.database.*`
- **Data models**: Pydantic v2 models in `src.models.*`
- **Logging**: Loguru via `src.utils.logger`
- **Pre-commit hooks**: Located in `hooks/` — checks for credentials, file types, file sizes, encoding, YAML/JSON validation, etc.
- **No implementation plan files** should be committed to the repository (e.g., `IMPLEMENTATION_PLAN.md`)
- **Virtual environment**: Use `/home/epmq/Desktop/Projects/shared-venv` — no local `.venv`

---

## Evaluation Harness — Independent Verification

Two independent agents verify every implementation change **before commit**. They operate with **zero implementation context** — they read code, run tests, and produce structured reports.

### Architecture

```
Implement feature → pytest (local) → [code-verifier] ─┐
                                        (parallel)       → Review reports → Commit or Fix
                                    [integration-verifier] ┘
```

### Agent 1: Code Verifier

**Purpose**: Verify backend correctness, test health, and code quality.  
**Checks**: pytest results, Python imports, FastAPI lifespan (not deprecated `on_event`), DB method consistency, unused imports.  
**Output**: `.eval/code-report.md`

### Agent 2: Integration Verifier

**Purpose**: Verify frontend ↔ backend coherence, no mock data, proper API wiring.  
**Checks**: mock data absence, ScanDialog uses `api.client` (not `fetch`), hooks use API, `onScanComplete` wired to `queryClient.invalidateQueries`, TypeScript/backend type alignment.  
**Output**: `.eval/integration-report.md`

### Workflow (mandatory before every commit)

1. Implement the feature/fix
2. Run `pytest` locally — must pass before launching agents
3. Launch **both agents in parallel** via `agent` tool (see `AGENT_EVALUATORS.md` for prompts)
4. Read both `.eval/*.md` reports
5. **If any report is FAIL** → fix issues → re-run agents
6. **Only commit when both reports are PASS**

### How to invoke agents

```python
# Code Verifier
agent(
    subagent_type="general-purpose",
    description="Code verifier agent",
    prompt="<prompt from AGENT_EVALUATORS.md for Code Verifier>"
)

# Integration Verifier
agent(
    subagent_type="general-purpose", 
    description="Integration verifier agent",
    prompt="<prompt from AGENT_EVALUATORS.md for Integration Verifier>"
)
```

### Design principles (from Anthropic engineering articles)
- **Separation from generator**: Eliminates self-praise bias — who writes ≠ who verifies
- **Criteria-driven**: Hard pass/fail thresholds, not subjective judgment
- **File-based communication**: Agents write `.eval/*.md` artifacts — no in-memory context passing
- **Context reset**: Each agent starts fresh with no implementation context
- **Verification gate**: Only flip to PASS after empirical validation (tests run, grep confirms, etc.)

See `AGENT_EVALUATORS.md` for full agent prompts and check specifications.

---

## Current Status

- ✅ **Core CLI** — Fully functional with 9 commands
- ✅ **Scanner orchestration** — Trivy integration working
- ✅ **Analysis engine** — Risk scoring, trend analysis, image comparison
- ✅ **Report generation** — JSON, CSV, HTML, Markdown
- ✅ **Dockerfile analysis** — 9 security rules
- ✅ **Container runtime audit** — 10 security checks
- ✅ **Frontend scaffold** — React 19 + TypeScript + Vite + TailwindCSS, 6 pages wired to API
- ✅ **Backend API (FastAPI)** — All endpoints implemented with real data
- ✅ **Frontend-backend integration** — No mock data, all pages use real API
- ✅ **Tests** — 45 passing, 0 warnings
- ✅ **Evaluation harness** — Two independent verifier agents defined
- 🟡 **Scan progress** — Polling-based (WebSocket planned)
- 🟡 **Production Dockerfile** — Multi-stage exists but needs verification

---

## Important Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Project config, dependencies, tool settings |
| `requirements.txt` | Flat dependency list |
| `docker-compose.yml` | Container orchestration (dashboard + tests) |
| `Dockerfile` | Multi-stage build (frontend + Trivy + Python) |
| `start.sh` / `stop.sh` | Start/stop the standalone frontend server |
| `STATUS.md` | Detailed project status |
| `DASHBOARD_PLAN.md` | Full implementation plan for the web dashboard |
| `VULN_REMEDIATION.md` | Vulnerability remediation guidance |
| `CHANGELOG.md` | Version history |
| `AGENT_EVALUATORS.md` | **Evaluation harness** — prompts and criteria for independent verifier agents |
| `.eval/` | **Not committed** — evaluation reports generated before each commit |
