"""Vulnerabilities API routes."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query

from src.api.schemas import PaginatedResponse, Vulnerability
from src.core.scanner import ScannerOrchestrator

router = APIRouter(prefix="/vulnerabilities", tags=["vulnerabilities"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()





@router.get("/", response_model=list[Vulnerability])
def list_vulnerabilities(
    severity: Optional[list[str]] = Query(None),
    package: Optional[str] = None,
    image: Optional[str] = None,
    min_cvss: Optional[float] = None,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> list[Vulnerability]:
    """List vulnerabilities with filtering."""
    scans = orch.db.list_scans(limit=50)
    all_vulns: list[Vulnerability] = []

    for scan in scans:
        scan_detail = orch.db.get_scan(scan["id"])
        if scan_detail:
            all_vulns.extend(scan_detail.vulnerabilities)

    # Apply filters
    if severity:
        all_vulns = [v for v in all_vulns if v.severity.value in severity]
    if package:
        all_vulns = [v for v in all_vulns if package.lower() in v.package_name.lower()]
    if image:
        all_vulns = [v for v in all_vulns if image.lower() in v.package_name.lower()]
    if min_cvss is not None:
        all_vulns = [v for v in all_vulns if v.cvss_score and v.cvss_score >= min_cvss]

    return all_vulns[:200]  # Limit response size


@router.get("/{cve_id}", response_model=Vulnerability)
def get_vulnerability(
    cve_id: str,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> Vulnerability:
    """Get vulnerability details by CVE ID."""
    scans = orch.db.list_scans(limit=50)
    for scan in scans:
        scan_detail = orch.db.get_scan(scan["id"])
        if scan_detail:
            for vuln in scan_detail.vulnerabilities:
                if vuln.cve_id == cve_id:
                    return vuln
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail="Vulnerability not found")
