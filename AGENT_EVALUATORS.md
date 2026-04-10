# Evaluation Harness — Independent Code Verifiers

Two independent agents verify every implementation change before commit.
They run with **no implementation context** — they only read code, run tests,
and check artifacts.

## Architecture

```
Implementation → pytest (local) → [code-verifier] ─┐
                                      (parallel)     → Review reports → Commit or Fix
                                  [integration-verifier] ┘
```

## Agent 1: Code Verifier

**Purpose**: Verify backend correctness, test health, and code quality.

**Invocation prompt** (used when calling `agent` tool with `subagent_type: general-purpose`):

```
You are an independent code verifier with NO context about recent changes.
Your job is to evaluate the backend code quality of DockerVulnManager.

Execute these checks in order and write results to .eval/code-report.md:

1. Run all tests: cd /home/epmq/Desktop/Projects/DockerVulnManager && /home/epmq/Desktop/Projects/shared-venv/bin/pytest tests/ -v --tb=short --no-cov 2>&1
   - PASS if all pass, FAIL if any fail. Note count and failures.

2. Check Python imports: For each file in src/api/routers/*.py, verify it can be imported.
   Run: python3 -c "from src.api.routers.<name> import router" for each.
   - PASS if all import, FAIL if any raise ImportError.

3. Check FastAPI main.py has lifespan (not deprecated on_event):
   - Read src/api/main.py. PASS if uses @asynccontextmanager lifespan, FAIL if uses @app.on_event.

4. Check database methods match router usage:
   - Read src/api/routers/*.py and src/database/manager.py.
   - Verify every orch.db.XXX() call has a corresponding method in DatabaseManager.
   - PASS if all methods exist, FAIL if any missing.

5. Check for unused imports in routers (grep "from typing import Annotated" without usage).
   - Note findings (warn, not fail).

Write .eval/code-report.md with format:
# Code Evaluation Report — <date>
## Results
| Check | Status | Notes |
|-------|--------|-------|
| Tests | PASS/FAIL | <details> |
| Imports | PASS/FAIL | <details> |
| Lifespan | PASS/FAIL | <details> |
| DB Methods | PASS/FAIL | <details> |
| Unused imports | PASS/WARN/FAIL | <details> |

## Overall: PASS / FAIL
<summary if FAIL>
```

## Agent 2: Integration Verifier

**Purpose**: Verify frontend ↔ backend coherence, no mock data, proper API wiring.

**Invocation prompt** (used when calling `agent` tool with `subagent_type: general-purpose`):

```
You are an independent integration verifier with NO context about recent changes.
Your job is to verify that the DockerVulnManager frontend is properly connected
to the backend API with no mock data.

Execute these checks in order and write results to .eval/integration-report.md:

1. Check for mock data in frontend pages:
   Run: grep_search pattern="mockVulns|mockImages|mockContainers|mockDockerfiles|mockHistory|mockScans|mockPackages|mockSummary|generateMock" path="/home/epmq/Desktop/Projects/DockerVulnManager/frontend/src/pages"
   - PASS if zero matches, FAIL if any mock data found.

2. Check ScanDialog uses api.client (not fetch):
   Read frontend/src/components/common/ScanDialog.tsx.
   - PASS if it imports and uses api.scans.create() or api.scans.scanAll().
   - FAIL if it uses fetch('/api/...') or fetch('/api/v1/...').

3. Check hooks use api.client:
   Read frontend/src/hooks/useQueries.ts.
   - PASS if every hook calls api.XXX.YYY().
   - FAIL if any hook returns hardcoded data.

4. Check onScanComplete is wired:
   Read frontend/src/pages/Overview.tsx and frontend/src/pages/Images.tsx.
   - PASS if handleScanComplete calls queryClient.invalidateQueries.
   - FAIL if onScanComplete={() => {}} or missing.

5. Check TypeScript types match backend schemas:
   Read frontend/src/types/index.ts and src/api/schemas.py.
   - Verify DashboardSummary, ScanResult, ImageHealth, Vulnerability exist in both.
   - PASS if types align, FAIL if missing critical fields.

6. Check for unused imports in pages:
   For each page in frontend/src/pages/*.tsx, verify imported components are used.
   - Note findings (warn, not fail).

Write .eval/integration-report.md with format:
# Integration Evaluation Report — <date>
## Results
| Check | Status | Notes |
|-------|--------|-------|
| Mock data | PASS/FAIL | <details> |
| ScanDialog API | PASS/FAIL | <details> |
| Hooks API | PASS/FAIL | <details> |
| Scan refresh | PASS/FAIL | <details> |
| Type alignment | PASS/FAIL | <details> |
| Unused imports | PASS/WARN/FAIL | <details> |

## Overall: PASS / FAIL
<summary if FAIL>
```

## Workflow

Every time you implement a change:

1. Implement the feature/fix
2. Run `pytest` locally (must pass before agents)
3. Launch BOTH agents in parallel via `agent` tool
4. Read both `.eval/*.md` reports
5. If any report is FAIL → fix the issues → re-run agents
6. Only commit when both reports are PASS

## Report Location

- `.eval/code-report.md` — Code verifier output
- `.eval/integration-report.md` — Integration verifier output

Reports are NOT committed to git (add `.eval/` to .gitignore).
