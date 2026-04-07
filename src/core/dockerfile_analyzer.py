"""Dockerfile security analysis."""

import re
from pathlib import Path

from pydantic import BaseModel

from src.utils.logger import get_logger

logger = get_logger(__name__)


class DockerfileIssue(BaseModel):
    """Represents a Dockerfile security issue."""

    line_number: int
    severity: str
    rule: str
    message: str
    recommendation: str


class DockerfileAnalyzer:
    """Analyzes Dockerfiles for security issues."""

    def analyze(self, dockerfile_path: Path) -> list[DockerfileIssue]:
        """Analyze a Dockerfile for security issues.

        Args:
            dockerfile_path: Path to Dockerfile

        Returns:
            List of security issues found
        """
        if not dockerfile_path.exists():
            raise FileNotFoundError(f"Dockerfile not found: {dockerfile_path}")

        content = dockerfile_path.read_text()
        lines = content.splitlines()

        issues = []
        issues.extend(self._check_user(lines))
        issues.extend(self._check_add_vs_copy(lines))
        issues.extend(self._check_latest_tag(lines))
        issues.extend(self._check_secrets(lines))
        issues.extend(self._check_healthcheck(lines))
        issues.extend(self._check_run_apt(lines))
        issues.extend(self._check_expose(lines))

        logger.info("Analyzed {}: found {} issues", dockerfile_path.name, len(issues))
        return issues

    def _check_user(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for USER instruction."""
        issues = []
        has_user = False
        last_user_line = 0

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.upper().startswith("USER "):
                has_user = True
                last_user_line = i
                user = stripped.split(None, 1)[1] if len(stripped.split()) > 1 else ""
                if user.lower() == "root" or user == "0":
                    issues.append(DockerfileIssue(
                        line_number=i,
                        severity="HIGH",
                        rule="DF001",
                        message="Container runs as root user",
                        recommendation="Use a non-root user: USER appuser",
                    ))

        if not has_user:
            issues.append(DockerfileIssue(
                line_number=len(lines),
                severity="MEDIUM",
                rule="DF002",
                message="No USER instruction found",
                recommendation="Add USER instruction to run as non-root user",
            ))

        return issues

    def _check_add_vs_copy(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for ADD vs COPY usage."""
        issues = []

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.upper().startswith("ADD "):
                # ADD is okay for URLs and tar files, but warn for regular files
                if not any(x in stripped.lower() for x in ["http://", "https://", ".tar", ".gz", ".bz2"]):
                    issues.append(DockerfileIssue(
                        line_number=i,
                        severity="LOW",
                        rule="DF003",
                        message="ADD used instead of COPY",
                        recommendation="Use COPY for regular files, ADD only for URLs and tar extraction",
                    ))

        return issues

    def _check_latest_tag(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for :latest tag in FROM instructions."""
        issues = []

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.upper().startswith("FROM "):
                parts = stripped.split()
                if len(parts) > 1:
                    image = parts[1]
                    if ":" not in image:
                        issues.append(DockerfileIssue(
                            line_number=i,
                            severity="MEDIUM",
                            rule="DF004",
                            message=f"Base image '{image}' uses implicit :latest tag",
                            recommendation="Pin base image version: FROM image:tag or FROM image@sha256:digest",
                        ))
                    elif image.endswith(":latest"):
                        issues.append(DockerfileIssue(
                            line_number=i,
                            severity="MEDIUM",
                            rule="DF005",
                            message=f"Base image '{image}' uses :latest tag",
                            recommendation="Pin to specific version for reproducibility",
                        ))

        return issues

    def _check_secrets(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for hardcoded secrets."""
        issues = []
        secret_patterns = [
            (r'(?:PASSWORD|SECRET|API_KEY|TOKEN|ACCESS_KEY)\s*=\s*["\'][^"\']{8,}["\']', "Hardcoded secret detected"),
            (r'AKIA[0-9A-Z]{16}', "AWS Access Key ID detected"),
            (r'(?:-----BEGIN.*PRIVATE KEY-----)', "Private key embedded in Dockerfile"),
        ]

        for i, line in enumerate(lines, 1):
            for pattern, message in secret_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    issues.append(DockerfileIssue(
                        line_number=i,
                        severity="CRITICAL",
                        rule="DF006",
                        message=message,
                        recommendation="Use Docker secrets, build args, or mount secrets at runtime",
                    ))

        return issues

    def _check_healthcheck(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for HEALTHCHECK instruction."""
        issues = []
        has_healthcheck = any(line.strip().upper().startswith("HEALTHCHECK ") for line in lines)

        if not has_healthcheck:
            issues.append(DockerfileIssue(
                line_number=len(lines),
                severity="LOW",
                rule="DF007",
                message="No HEALTHCHECK instruction found",
                recommendation="Add HEALTHCHECK to enable container health monitoring",
            ))

        return issues

    def _check_run_apt(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for apt-get without cleanup."""
        issues = []
        has_apt_install = False
        has_apt_cleanup = False

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if "apt-get install" in stripped or "apt install" in stripped:
                has_apt_install = True
            if "apt-get clean" in stripped or "rm -rf /var/lib/apt/lists" in stripped:
                has_apt_cleanup = True

        if has_apt_install and not has_apt_cleanup:
            issues.append(DockerfileIssue(
                line_number=len(lines),
                severity="LOW",
                rule="DF008",
                message="apt-get install without cleanup",
                recommendation="Add '&& apt-get clean && rm -rf /var/lib/apt/lists/*' to reduce image size",
            ))

        return issues

    def _check_expose(self, lines: list[str]) -> list[DockerfileIssue]:
        """Check for EXPOSE instruction."""
        issues = []
        has_expose = any(line.strip().upper().startswith("EXPOSE ") for line in lines)

        if not has_expose:
            issues.append(DockerfileIssue(
                line_number=len(lines),
                severity="INFO",
                rule="DF009",
                message="No EXPOSE instruction found",
                recommendation="Add EXPOSE to document which ports the container listens on",
            ))

        return issues
