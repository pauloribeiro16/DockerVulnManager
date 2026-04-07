"""API schemas - Pydantic models for request/response."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.models.vulnerability import Severity, Vulnerability


class TrendPoint(BaseModel):
    date: str
    critical: int
    high: int
    medium: int
    low: int


class DashboardSummary(BaseModel):
    total_images: int
    total_vulns: int
    critical: int
    high: int
    medium: int
    low: int
    info: int
    risk_score: float
    last_scan: Optional[str] = None
    trend: list[TrendPoint] = Field(default_factory=list)


class ScanCreate(BaseModel):
    image: str = Field(..., description="Docker image name (e.g., nginx:latest)")


class ScanResponse(BaseModel):
    id: int
    image_name: str
    image_tag: str
    scan_timestamp: str
    packages_scanned: int
    risk_score: float
    total_count: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    vulnerabilities: Optional[list[Vulnerability]] = None


class ScanTriggerResponse(BaseModel):
    scan_id: str
    status: str = "queued"


class VulnFilter(BaseModel):
    severity: Optional[list[str]] = None
    package: Optional[str] = None
    fixed_only: bool = True
    image: Optional[str] = None
    min_cvss: Optional[float] = None


class PaginatedResponse[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int


class ImageHealthResponse(BaseModel):
    name: str
    tag: str
    last_scan: Optional[str] = None
    risk_score: float
    total_vulns: int
    critical: int
    high: int
    medium: int
    low: int
    status: str  # safe | warning | danger


class SecurityCheckResponse(BaseModel):
    check_id: str
    name: str
    description: str
    passed: bool
    severity: str
    details: str
    recommendation: str


class ContainerAuditResponse(BaseModel):
    container_name: str
    checks: list[SecurityCheckResponse]
    passed: int
    total: int
    score: float


class DockerfileIssueResponse(BaseModel):
    line_number: int
    severity: str
    rule: str
    message: str
    recommendation: str


class DockerfileAnalysisResponse(BaseModel):
    file: str
    issues: list[DockerfileIssueResponse]
    score: str


class ScanProgressMessage(BaseModel):
    scan_id: str
    progress: int
    status: str
    message: str
