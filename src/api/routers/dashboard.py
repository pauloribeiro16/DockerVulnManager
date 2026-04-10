"""Dashboard API routes."""

from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends

from src.api.schemas import DashboardSummary, TrendPoint
from src.core.scanner import ScannerOrchestrator
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(orch: ScannerOrchestrator = Depends(_get_orchestrator)) -> DashboardSummary:
    """Get KPI summary for the overview page."""
    scans = orch.db.list_scans(limit=100)
    if not scans:
        return DashboardSummary(
            total_images=0, total_vulns=0, critical=0, high=0,
            medium=0, low=0, info=0, risk_score=0.0,
        )

    # Count unique images
    unique_images = set(s["image"] for s in scans)

    # Sum severities from all scans
    critical = high = medium = low = 0
    risk_scores = []
    for s in scans:
        record = orch.db.get_scan(s["id"])
        if record:
            critical += record.critical_count
            high += record.high_count
            medium += record.medium_count
            low += record.low_count
        risk_scores.append(s["risk_score"])

    total_vulns = sum(s["vulns"] for s in scans)
    avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

    # Build trend from actual scan data grouped by date
    trend = _build_trend(orch)

    return DashboardSummary(
        total_images=len(unique_images),
        total_vulns=total_vulns,
        critical=critical, high=high, medium=medium, low=low,
        info=0, risk_score=round(avg_risk, 1),
        last_scan=scans[0]["timestamp"] if scans else None,
        trend=trend,
    )


@router.get("/trend", response_model=list[TrendPoint])
def get_trend_data(orch: ScannerOrchestrator = Depends(_get_orchestrator)) -> list[TrendPoint]:
    """Get 30-day vulnerability trend."""
    return _build_trend(orch)


def _build_trend(orch: ScannerOrchestrator) -> list[TrendPoint]:
    """Build 7-day trend from actual scan data."""
    scans = orch.db.list_scans(limit=500)
    if not scans:
        return []

    # Group vulnerabilities by date
    daily_counts: dict[str, dict[str, int]] = defaultdict(lambda: {"critical": 0, "high": 0, "medium": 0, "low": 0})

    for s in scans:
        record = orch.db.get_scan(s["id"])
        if record:
            date_str = s["timestamp"][:10]  # "YYYY-MM-DD"
            daily_counts[date_str]["critical"] += record.critical_count
            daily_counts[date_str]["high"] += record.high_count
            daily_counts[date_str]["medium"] += record.medium_count
            daily_counts[date_str]["low"] += record.low_count

    # Build 7-day series, filling missing days with zeros
    trend = []
    for i in range(7):
        date = datetime.now() - timedelta(days=6 - i)
        date_str = date.strftime("%Y-%m-%d")
        counts = daily_counts.get(date_str, {"critical": 0, "high": 0, "medium": 0, "low": 0})
        trend.append(TrendPoint(
            date=date_str,
            critical=counts["critical"],
            high=counts["high"],
            medium=counts["medium"],
            low=counts["low"],
        ))

    return trend
