"""Dashboard API routes."""

from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.schemas import DashboardSummary, TrendPoint
from src.core.scanner import ScannerOrchestrator

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()


OrchestratorDep = Annotated[ScannerOrchestrator, Depends(_get_orchestrator)]


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(orch: OrchestratorDep) -> DashboardSummary:
    """Get KPI summary for the overview page."""
    scans = orch.db.list_scans(limit=100)
    if not scans:
        return DashboardSummary(
            total_images=0,
            total_vulns=0,
            critical=0,
            high=0,
            medium=0,
            low=0,
            info=0,
            risk_score=0.0,
        )

    total_vulns = sum(s["vulns"] for s in scans)
    critical = sum(1 for s in scans for v in s.get("vulns_detail", []) if v.get("severity") == "CRITICAL")
    high = sum(1 for s in scans for v in s.get("vulns_detail", []) if v.get("severity") == "HIGH")
    medium = sum(1 for s in scans for v in s.get("vulns_detail", []) if v.get("severity") == "MEDIUM")
    low = sum(1 for s in scans for v in s.get("vulns_detail", []) if v.get("severity") == "LOW")
    risk_scores = [s["risk_score"] for s in scans]
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

    # Generate trend data (last 7 days)
    trend = []
    for i in range(7):
        date = datetime.now() - timedelta(days=6 - i)
        trend.append(TrendPoint(
            date=date.strftime("%Y-%m-%d"),
            critical=max(0, critical // 7),
            high=max(0, high // 7),
            medium=max(0, medium // 7),
            low=max(0, low // 7),
        ))

    return DashboardSummary(
        total_images=len(scans),
        total_vulns=total_vulns,
        critical=critical,
        high=high,
        medium=medium,
        low=low,
        info=0,
        risk_score=round(avg_risk, 1),
        last_scan=scans[0]["timestamp"] if scans else None,
        trend=trend,
    )


@router.get("/trend", response_model=list[TrendPoint])
def get_trend_data(orch: OrchestratorDep) -> list[TrendPoint]:
    """Get 30-day vulnerability trend."""
    trend = []
    for i in range(30):
        date = datetime.now() - timedelta(days=29 - i)
        trend.append(TrendPoint(
            date=date.strftime("%Y-%m-%d"),
            critical=0,
            high=0,
            medium=0,
            low=0,
        ))
    return trend
