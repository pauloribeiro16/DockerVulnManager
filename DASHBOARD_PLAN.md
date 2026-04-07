# Web Dashboard - Implementation Plan

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | React 19 + TS 5 |
| **Build** | Vite | v6 |
| **Styling** | TailwindCSS | v4 |
| **Components** | shadcn/ui (Radix primitives) | latest |
| **Charts** | ECharts (large data) + Recharts (simple) | echarts 5.5 + recharts 3.8 |
| **Data Tables** | @tanstack/react-table | v8 |
| **State/Fetch** | @tanstack/react-query | v5 |
| **Routing** | react-router-dom | v6 |
| **Backend** | FastAPI + async | Python 3.11 |
| **Production Serve** | SPAStaticFiles in FastAPI | -- |
| **Container** | Multi-stage Dockerfile | python:3.11-slim + node:20-alpine |

---

## Phase 1: Backend API

### New Files

```
src/
├── api/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, SPA mount
│   ├── deps.py              # Dependency injection (db session)
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── dashboard.py     # GET /api/v1/dashboard/summary
│   │   ├── scans.py         # GET/POST /api/v1/scans
│   │   ├── vulnerabilities.py  # GET /api/v1/vulnerabilities
│   │   ├── images.py        # GET /api/v1/images
│   │   ├── hardening.py     # GET /api/v1/hardening
│   │   └── websocket.py     # WS /ws/scan-progress
│   └── schemas/
│       ├── __init__.py
│       ├── dashboard.py     # DashboardSummary, KPI
│       ├── scan.py          # ScanCreate, ScanResponse
│       ├── vulnerability.py # VulnResponse, VulnFilter
│       ├── image.py         # ImageResponse, ImageHealth
│       └── hardening.py     # HardeningResult, CheckResponse
```

### API Endpoints

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| GET | `/api/v1/dashboard/summary` | KPIs for overview page | `{total_images, total_vulns, critical, high, risk_score, last_scan}` |
| GET | `/api/v1/dashboard/trend` | 30-day vulnerability trend | `[{date, critical, high, medium, low}]` |
| GET | `/api/v1/scans` | List scans with pagination | `{items: [ScanResponse], total, page, size}` |
| POST | `/api/v1/scans` | Trigger new scan | `{scan_id, status: "queued"}` |
| GET | `/api/v1/scans/{id}` | Get single scan detail | `ScanResponse` |
| GET | `/api/v1/vulnerabilities` | Filterable vuln list | `{items, total, filters_applied}` |
| GET | `/api/v1/vulnerabilities/{cve_id}` | Single CVE detail | `VulnDetail` |
| GET | `/api/v1/images` | All scanned images | `{items: [ImageHealth]}` |
| GET | `/api/v1/images/{name}/{tag}/history` | Image scan history | `[{scan_id, date, vulns, risk}]` |
| POST | `/api/v1/images/{name}/{tag}/scan` | Trigger scan for image | `{scan_id}` |
| GET | `/api/v1/hardening` | Container security results | `{containers: [{name, checks_passed, checks_failed}]}` |
| GET | `/api/v1/hardening/dockerfile` | Dockerfile analysis results | `{files: [{path, issues, score}]}` |
| WS | `/ws/scan-progress/{scan_id}` | Real-time scan progress | `{progress: 0-100, status, message}` |

### Schema Examples

```python
# src/api/schemas/dashboard.py
class DashboardSummary(BaseModel):
    total_images: int
    total_vulns: int
    critical: int
    high: int
    medium: int
    low: int
    risk_score: float  # 0-100
    last_scan: datetime | None
    trend: list[TrendPoint]  # last 7 days

class TrendPoint(BaseModel):
    date: str  # "2025-04-01"
    critical: int
    high: int
    medium: int
    low: int

# src/api/schemas/vulnerability.py
class VulnFilter(BaseModel):
    severity: list[str] | None = None  # ["CRITICAL", "HIGH"]
    package: str | None = None
    fixed_only: bool = True
    image: str | None = None
    min_cvss: float | None = None

class VulnResponse(BaseModel):
    items: list[VulnDetail]
    total: int
    page: int
    size: int
    filters: VulnFilter
```

---

## Phase 2: Frontend Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css               # Tailwind + CSS vars for shadcn
    ├── api/
    │   ├── client.ts           # fetch wrapper + error handling
    │   ├── endpoints.ts        # URL constants
    │   └── queries.ts          # React Query hooks
    ├── components/
    │   ├── ui/                 # shadcn/ui (auto-generated)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── table.tsx
    │   │   ├── badge.tsx
    │   │   ├── select.tsx
    │   │   ├── dialog.tsx
    │   │   ├── tooltip.tsx
    │   │   ├── progress.tsx
    │   │   ├── tabs.tsx
    │   │   ├── input.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   └── skeleton.tsx
    │   ├── layout/
    │   │   ├── Sidebar.tsx     # Fixed left nav, 240px, dark bg
    │   │   ├── TopBar.tsx      # Search bar + user menu
    │   │   ├── PageHeader.tsx  # Title + breadcrumb + actions
    │   │   └── Layout.tsx      # Sidebar + TopBar wrapper
    │   ├── charts/
    │   │   ├── SeverityDonut.tsx     # Recharts: CRITICAL/HIGH/MED/LOW
    │   │   ├── RiskGauge.tsx         # ECharts gauge: 0-100 risk score
    │   │   ├── TrendLine.tsx         # Recharts area: 30-day trend
    │   │   ├── VulnHeatmap.tsx       # ECharts heatmap: vulns by day/severity
    │   │   └── TopPackages.tsx       # Recharts horizontal bar: top 10 vuln packages
    │   ├── vulns/
    │   │   ├── VulnTable.tsx         # TanStack table with sorting/filtering
    │   │   ├── VulnCard.tsx          # Compact vuln display
    │   │   ├── SeverityBadge.tsx     # Color-coded severity pill
    │   │   └── VulnDetailDialog.tsx  # Full CVE detail modal
    │   ├── images/
    │   │   ├── ImageList.tsx         # Grid of image health cards
    │   │   ├── ImageHealthCard.tsx   # Single image status
    │   │   └── ImageHistoryChart.tsx # Line chart: risk over time
    │   ├── hardening/
    │   │   ├── ComplianceGrid.tsx    # 2x2 CIS check status cards
    │   │   ├── CheckResultRow.tsx    # Single security check row
    │   │   └── DockerfileIssues.tsx  # Dockerfile analysis list
    │   └── common/
    │       ├── ScanButton.tsx        # Triggers scan with progress modal
    │       ├── ScanProgress.tsx      # WebSocket progress indicator
    │       ├── StatusBadge.tsx       # safe/warning/danger status
    │       └── EmptyState.tsx        # "No scans yet" placeholder
    ├── pages/
    │   ├── Overview.tsx          # / - KPI cards + charts + recent scans
    │   ├── Vulnerabilities.tsx   # /vulnerabilities - Full table + filters
    │   ├── Images.tsx            # /images - Grid + per-image history
    │   ├── History.tsx           # /history - Timeline + comparison
    │   ├── Hardening.tsx         # /hardening - CIS compliance dashboard
    │   └── Settings.tsx          # /settings - Config + scanner management
    ├── hooks/
    │   ├── useScans.ts           # React Query: scans
    │   ├── useVulnerabilities.ts # React Query: vulns + filters
    │   ├── useImages.ts          # React Query: images
    │   ├── useHardening.ts       # React Query: security checks
    │   └── useScanProgress.ts    # WebSocket hook for scan progress
    ├── lib/
    │   ├── utils.ts              # cn() utility for Tailwind
    │   └── constants.ts          # Severity colors, chart config
    └── types/
        ├── index.ts              # TypeScript interfaces
        └── api.ts                # API response types
```

---

## Phase 3: Page Layouts (Specific)

### Page 1: Overview (`/`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DockerVulnManager                                          🔔  👤     │
├──────────┬──────────────────────────────────────────────────────────────┤
│          │                                                              │
│  📊      │  🔴 23    🟠 45    🟡 128   🔵 67   ⚪ 12                    │
│  Sidebar │  CRITICAL  HIGH    MEDIUM    LOW    INFO                     │
│          │                                                              │
│  Overview│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐│
│  Vulns   │  │ Risk Score      │  │ Images Scanned  │  │ Last Scan     ││
│  Images  │  │                 │  │                 │  │               ││
│  History │  │    67 / 100     │  │     14          │  │ 2 hours ago   ││
│  Hard.   │  │  [=====>   ]    │  │  🟢 8 🟡 4 🔴 2 │  │ nginx:latest  ││
│  Settings│  │                 │  │                 │  │               ││
│          │  └─────────────────┘  └─────────────────┘  └───────────────┘│
│          │                                                              │
│          │  ┌─────────────────────────────────┐ ┌────────────────────┐  │
│          │  │ 30-Day Vulnerability Trend      │ │ Top Vulnerable     │  │
│          │  │                                 │ │ Packages           │  │
│          │  │    ╱╲  ╱╲                       │ │ ┌────────────────┐ │  │
│          │  │   ╱  ╲╱  ╲  critical            │ │ │openssl █████ 12│ │  │
│          │  │  ╱    ╲   high                  │ │ │curl   ████ 8   │ │  │
│          │  │ ╱      ╲  medium                │ │ │glibc  ███ 6    │ │  │
│          │  │────────────────────────          │ │ │libxml ██ 4     │ │  │
│          │  │  Apr 1    Apr 5    Apr 7         │ │ │nginx  ██ 2     │ │  │
│          │  └─────────────────────────────────┘ └────────────────────┘  │
│          │                                                              │
│          │  Recent Scans                                                │
│          │  ┌─────────┬────────────┬───────┬────────┬────────────────┐  │
│          │  │ Image   │ Date       │ Total │ Risk   │ Actions        │  │
│          │  ├─────────┼────────────┼───────┼────────┼────────────────┤  │
│          │  │nginx:lt │ 2h ago     │ 275   │ 67 🔴  │ 📊 View Report │  │
│          │  │python:3 │ 5h ago     │ 182   │ 34 🟢  │ 📊 View Report │  │
│          │  │node:20  │ 1d ago     │ 421   │ 82 🔴  │ 📊 View Report │  │
│          │  └─────────┴────────────┴───────┴────────┴────────────────┘  │
│          │                                              [+ New Scan]    │
└──────────┴──────────────────────────────────────────────────────────────┘
```

### Page 2: Vulnerabilities (`/vulnerabilities`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Vulnerabilities                                          [+ New Scan]  │
├──────────┬──────────────────────────────────────────────────────────────┤
│  Sidebar │  Filters: [Severity ▼] [Package] [Image] [Fixed only ✓]     │
│          │                                                              │
│          │  342 vulnerabilities · Showing 1-50 of 342                   │
│          │                                                              │
│          │  ┌─────┬──────────┬────────┬───────────┬────────┬────┬─────┐ │
│          │  │ CVE │ Severity │ Package│ Installed │ Fixed  │CVSS│ ↑↓  │ │
│          │  ├─────┼──────────┼────────┼───────────┼────────┼────┼─────┤ │
│          │  │CVE- │  🔴      │openssl  │ 1.1.1     │ 1.1.1g │ 9.8│     │ │
│          │  │2024-│  CRITICAL│         │           │        │    │     │ │
│          │  │1234 │          │         │           │        │    │     │ │
│          │  ├─────┼──────────┼────────┼───────────┼────────┼────┼─────┤ │
│          │  │CVE- │  🟠      │curl     │ 7.68      │ 7.79   │ 7.5│     │ │
│          │  │2024-│  HIGH    │         │           │        │    │     │ │
│          │  │5678 │          │         │           │        │    │     │ │
│          │  └─────┴──────────┴────────┴───────────┴────────┴────┴─────┘ │
│          │                                                              │
│          │  ← Previous  1  2  3  4  5  6  7  Next →                     │
│          │                                                              │
│          │  [Click any row → VulnDetailDialog with full CVE info]       │
└──────────┴──────────────────────────────────────────────────────────────┘
```

### Page 3: Images (`/images`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Docker Images                                            [+ New Scan]  │
├──────────┬──────────────────────────────────────────────────────────────┤
│  Sidebar │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐│
│          │  │ nginx:latest    │  │ python:3.11-slim│  │ node:20-alpine││
│          │  │                 │  │                 │  │               ││
│          │  │ Risk: 67 🔴     │  │ Risk: 34 🟢     │  │ Risk: 52 🟡   ││
│          │  │ Vulns: 275      │  │ Vulns: 182      │  │ Vulns: 98     ││
│          │  │                 │  │                 │  │               ││
│          │  │ 🔴2 🟠12 🟡45   │  │ 🔴0 🟠3 🟡28    │  │ 🔴1 🟠5 🟡32  ││
│          │  │                 │  │                 │  │               ││
│          │  │ Scanned: 2h ago │  │ Scanned: 5h ago │  │ Scanned: 1d   ││
│          │  │                 │  │                 │  │               ││
│          │  │ [View] [Scan ↻] │  │ [View] [Scan ↻] │  │ [View] [↻]    ││
│          │  └─────────────────┘  └─────────────────┘  └───────────────┘│
│          │                                                              │
│          │  [Click "View" → Image detail page with history chart]       │
└──────────┴──────────────────────────────────────────────────────────────┘
```

### Page 4: Hardening (`/hardening`)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Security Hardening                                       [Run Audit]   │
├──────────┬──────────────────────────────────────────────────────────────┤
│  Sidebar │  CIS Docker Benchmark v1.6.0                                 │
│          │  Overall Compliance: 72%                                     │
│          │                                                              │
│          │  ┌─────────────────────────────────────────────┐             │
│          │  │ Container Security Checks                   │             │
│          │  │                                             │             │
│          │  │ ✅ PASS  Privileged Mode Check      (14/14) │             │
│          │  │ ⚠️  WARN  Root User Check           (8/14)  │             │
│          │  │ ❌ FAIL  Read-Only Root Filesystem   (2/14)  │             │
│          │  │ ✅ PASS  Capabilities Check          (12/14) │             │
│          │  │ ⚠️  WARN  Resource Limits            (10/14) │             │
│          │  │ ✅ PASS  Network Mode Check          (14/14) │             │
│          │  └─────────────────────────────────────────────┘             │
│          │                                                              │
│          │  ┌─────────────────────────────────────────────┐             │
│          │  │ Dockerfile Analysis                         │             │
│          │  │                                             │             │
│          │  │ File                 Issues  Score  Status   │             │
│          │  │ ─────────────────────────────────────────── │             │
│          │  │ ./Dockerfile          3      B     🟡 Warn  │             │
│          │  │ ./Dockerfile.prod     0      A     ✅ Pass  │             │
│          │  │ ./Dockerfile.test     5      C     ⚠️ Warn  │             │
│          │  └─────────────────────────────────────────────┘             │
└──────────┴──────────────────────────────────────────────────────────────┘
```

---

## Phase 4: Color System & Design Tokens

```css
/* frontend/src/index.css - CSS Variables for shadcn + custom tokens */

:root {
  /* Severity colors */
  --severity-critical: hsl(0 84% 60%);    /* #E53E3E */
  --severity-high: hsl(25 95% 53%);        /* #ED8936 */
  --severity-medium: hsl(45 93% 47%);      /* #D69E2E */
  --severity-low: hsl(187 71% 49%);        /* #38B2AC */
  --severity-info: hsl(215 14% 34%);       /* #4A5568 */

  /* Risk thresholds */
  --risk-safe: hsl(142 76% 36%);           /* Green */
  --risk-warning: hsl(38 92% 50%);         /* Yellow */
  --risk-danger: hsl(0 84% 60%);           /* Red */

  /* Dashboard theme (dark sidebar, light content) */
  --sidebar-bg: hsl(222 47% 11%);          /* #1A202C */
  --sidebar-text: hsl(0 0% 98%);
  --sidebar-active: hsl(217 91% 60%);      /* #4C6EF5 */

  --background: hsl(0 0% 100%);
  --foreground: hsl(222 47% 11%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(222 47% 11%);
  --border: hsl(214 32% 91%);
  --muted: hsl(210 40% 96%);
}
```

---

## Phase 5: Implementation Order

### Step 1: Backend API (Days 1-2)
1. Create `src/api/main.py` - FastAPI app with CORS + SPA mount
2. Create `src/api/schemas/` - Pydantic response models
3. Create `src/api/routers/dashboard.py` - Summary + trend endpoints
4. Create `src/api/routers/scans.py` - Scan list + detail
5. Create `src/api/routers/vulnerabilities.py` - Filtered vuln list
6. Create `src/api/routers/images.py` - Image list + scan trigger
7. Create `src/api/routers/hardening.py` - Security check results
8. Update `pyproject.toml` - Add `fastapi`, `uvicorn`

### Step 2: Frontend Setup (Day 2-3)
9. Scaffold `frontend/` with Vite + React + TS
10. Install TailwindCSS + shadcn/ui
11. Install ECharts, Recharts, TanStack Table, React Query, React Router
12. Create `src/lib/utils.ts`, `src/api/client.ts`, `src/types/`
13. Create layout components (Sidebar, TopBar, Layout)

### Step 3: Dashboard Pages (Days 3-5)
14. Implement Overview page with KPI cards + charts
15. Implement Vulnerabilities page with filterable table
16. Implement Images page with health cards
17. Implement Hardening page with compliance grid
18. Implement ScanButton + ScanProgress (WebSocket)

### Step 4: Integration & Polish (Days 5-6)
19. Wire all pages to API via React Query hooks
20. Add loading states, error boundaries, empty states
21. Add responsive design (mobile/tablet breakpoints)
22. Add SPAStaticFiles mount in FastAPI for production
23. Create multi-stage Dockerfile

### Step 5: Testing (Day 6-7)
24. Backend: pytest for all API endpoints
25. Frontend: Vitest + React Testing Library for components
26. E2E: Playwright for critical user flows
27. Load test: k6 for API endpoints

---

## Deliverables

| Item | What |
|------|------|
| **Overview Dashboard** | KPI cards, risk gauge, trend chart, top vuln packages, recent scans table |
| **Vulnerability Explorer** | Full-text search, severity filter, package filter, sortable table, pagination |
| **Image Gallery** | Grid of image health cards, click-through to history, scan trigger |
| **Hardening Dashboard** | CIS compliance grid, per-container check results, Dockerfile analysis |
| **Real-time Scan** | WebSocket progress indicator, toast notifications |
| **Production Ready** | Multi-stage Dockerfile, single container serving both API + UI |
| **Tests** | >80% coverage on backend, component tests on frontend |

---

## Files Created

- **Backend**: ~15 new files in `src/api/`
- **Frontend**: ~60 files in `frontend/`
- **Config**: `Dockerfile`, `docker-compose.yml`, `pyproject.toml` updates
- **Tests**: ~10 new test files

Total: ~90 files, ~8000 lines of new code
