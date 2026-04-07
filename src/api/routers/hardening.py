"""Hardening API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.schemas import ContainerAuditResponse, DockerfileAnalysisResponse, SecurityCheckResponse
from src.core.container_auditor import ContainerSecurityAuditor
from src.core.dockerfile_analyzer import DockerfileAnalyzer
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/hardening", tags=["hardening"])


@router.get("/", response_model=list[ContainerAuditResponse])
def get_container_audits() -> list[ContainerAuditResponse]:
    """Get security audit results for all running containers."""
    try:
        auditor = ContainerSecurityAuditor()
        results = auditor.audit_all_containers()

        response = []
        for container_name, checks in results.items():
            passed = sum(1 for c in checks if c.passed)
            response.append(ContainerAuditResponse(
                container_name=container_name,
                checks=[
                    SecurityCheckResponse(
                        check_id=c.check_id,
                        name=c.name,
                        description=c.description,
                        passed=c.passed,
                        severity=c.severity,
                        details=c.details,
                        recommendation=c.recommendation,
                    )
                    for c in checks
                ],
                passed=passed,
                total=len(checks),
                score=(passed / len(checks) * 100) if checks else 0,
            ))
        return response
    except Exception as e:
        logger.warning("Container audit failed: {}", str(e))
        return []


@router.get("/dockerfile", response_model=list[DockerfileAnalysisResponse])
def get_dockerfile_analysis() -> list[DockerfileAnalysisResponse]:
    """Get Dockerfile security analysis results."""
    from pathlib import Path

    analyzer = DockerfileAnalyzer()
    dockerfiles = []

    # Check common Dockerfile locations
    for df_path in [Path("./Dockerfile"), Path("./Dockerfile.prod"), Path("./Dockerfile.dev")]:
        if df_path.exists():
            try:
                issues = analyzer.analyze(df_path)
                score = "A" if len(issues) == 0 else "B" if len(issues) <= 2 else "C" if len(issues) <= 5 else "D"
                dockerfiles.append(DockerfileAnalysisResponse(
                    file=str(df_path),
                    issues=issues,
                    score=score,
                ))
            except Exception as e:
                logger.warning("Dockerfile analysis failed for {}: {}", df_path, str(e))

    return dockerfiles
