"""Tests for Phase 2-5 and 9: Scanner, Reports, CLI, Security."""

import pytest
import json
from pathlib import Path
from datetime import datetime

from src.models.vulnerability import Vulnerability, Severity, ScanResult
from src.core.report_generator import ReportGenerator
from src.core.analysis import AnalysisEngine
from src.core.dockerfile_analyzer import DockerfileAnalyzer, DockerfileIssue
from src.core.container_auditor import SecurityCheck


class TestReportGenerator:
    """Test report generation system."""

    @pytest.fixture
    def sample_scan(self):
        return ScanResult(
            image_name="nginx",
            image_tag="latest",
            vulnerabilities=[
                Vulnerability(
                    cve_id="CVE-2024-1234",
                    severity=Severity.CRITICAL,
                    package_name="openssl",
                    installed_version="1.1.1",
                    fixed_version="1.1.1g",
                    cvss_score=9.8,
                ),
                Vulnerability(
                    cve_id="CVE-2024-5678",
                    severity=Severity.HIGH,
                    package_name="curl",
                    installed_version="7.68",
                    fixed_version="7.79",
                    cvss_score=7.5,
                ),
            ],
            packages_scanned=50,
        )

    def test_json_report(self, sample_scan):
        """Test JSON report generation."""
        generator = ReportGenerator()
        content = generator.generate(sample_scan, format="json")
        data = json.loads(content)

        assert "scan_summary" in data
        assert "vulnerabilities" in data
        assert data["scan_summary"]["critical"] == 1

    def test_csv_report(self, sample_scan):
        """Test CSV report generation."""
        generator = ReportGenerator()
        content = generator.generate(sample_scan, format="csv")
        lines = content.strip().split("\n")

        assert len(lines) == 3  # Header + 2 vulns
        assert "CVE ID" in lines[0]
        assert "CVE-2024-1234" in lines[1]

    def test_html_report(self, sample_scan):
        """Test HTML report generation."""
        generator = ReportGenerator()
        content = generator.generate(sample_scan, format="html")

        assert "<!DOCTYPE html>" in content
        assert "CVE-2024-1234" in content
        assert "nginx:latest" in content

    def test_markdown_report(self, sample_scan):
        """Test Markdown report generation."""
        generator = ReportGenerator()
        content = generator.generate(sample_scan, format="markdown")

        assert "# Vulnerability Report" in content
        assert "CVE-2024-1234" in content
        assert "openssl" in content

    def test_save_to_file(self, sample_scan, tmp_path):
        """Test saving report to file."""
        generator = ReportGenerator()
        output_path = tmp_path / "report.html"
        generator.generate(sample_scan, format="html", output_path=output_path)

        assert output_path.exists()
        assert output_path.stat().st_size > 0


class TestAnalysisEngine:
    """Test vulnerability analysis engine."""

    def test_compare_scans(self):
        """Test scan comparison."""
        scan1 = ScanResult(
            image_name="nginx",
            image_tag="1.21",
            vulnerabilities=[
                Vulnerability(cve_id="CVE-1", severity=Severity.HIGH, package_name="pkg1", installed_version="1.0"),
                Vulnerability(cve_id="CVE-2", severity=Severity.MEDIUM, package_name="pkg2", installed_version="2.0"),
            ],
        )

        scan2 = ScanResult(
            image_name="nginx",
            image_tag="1.22",
            vulnerabilities=[
                Vulnerability(cve_id="CVE-2", severity=Severity.MEDIUM, package_name="pkg2", installed_version="2.0"),
                Vulnerability(cve_id="CVE-3", severity=Severity.LOW, package_name="pkg3", installed_version="3.0"),
            ],
        )

        engine = AnalysisEngine()
        comparison = engine.compare_scans(scan1, scan2)

        assert comparison["new_vulnerabilities"] == 1
        assert comparison["fixed_vulnerabilities"] == 1
        assert comparison["common_vulnerabilities"] == 1

    def test_find_common_vulnerabilities(self):
        """Test finding common vulnerabilities."""
        scans = [
            ScanResult(
                image_name="img1",
                image_tag="latest",
                vulnerabilities=[
                    Vulnerability(cve_id="CVE-1", severity=Severity.HIGH, package_name="openssl", installed_version="1.0"),
                ],
            ),
            ScanResult(
                image_name="img2",
                image_tag="latest",
                vulnerabilities=[
                    Vulnerability(cve_id="CVE-1", severity=Severity.HIGH, package_name="openssl", installed_version="1.0"),
                ],
            ),
        ]

        engine = AnalysisEngine()
        common = engine.find_common_vulnerabilities(scans)

        assert "CVE-1" in common
        assert len(common["CVE-1"]) == 2

    def test_trend_analysis(self):
        """Test vulnerability trend analysis."""
        scans = [
            ScanResult(
                image_name="test",
                image_tag="v1",
                vulnerabilities=[
                    Vulnerability(cve_id="CVE-1", severity=Severity.HIGH, package_name="pkg", installed_version="1.0"),
                    Vulnerability(cve_id="CVE-2", severity=Severity.MEDIUM, package_name="pkg2", installed_version="2.0"),
                ],
            ),
            ScanResult(
                image_name="test",
                image_tag="v2",
                vulnerabilities=[
                    Vulnerability(cve_id="CVE-3", severity=Severity.LOW, package_name="pkg3", installed_version="3.0"),
                ],
            ),
        ]

        engine = AnalysisEngine()
        trend = engine.get_trend(scans)

        assert trend["total_change"] == -1
        assert trend["improving"] is True

    def test_fix_recommendations(self):
        """Test fix recommendation generation."""
        scan = ScanResult(
            image_name="test",
            image_tag="latest",
            vulnerabilities=[
                Vulnerability(cve_id="CVE-1", severity=Severity.CRITICAL, package_name="openssl", installed_version="1.0", fixed_version="1.1"),
            ],
        )

        engine = AnalysisEngine()
        recommendations = engine.get_fix_recommendations(scan)

        assert len(recommendations) == 1
        assert "Upgrade openssl" in recommendations[0]["action"]

    def test_security_summary(self):
        """Test security summary generation."""
        scan = ScanResult(
            image_name="nginx",
            image_tag="latest",
            vulnerabilities=[
                Vulnerability(cve_id="CVE-1", severity=Severity.CRITICAL, package_name="openssl", installed_version="1.0"),
            ],
        )

        engine = AnalysisEngine()
        summary = engine.generate_security_summary(scan)

        assert "nginx:latest" in summary
        assert "CRITICAL" in summary


class TestDockerfileAnalyzer:
    """Test Dockerfile security analysis."""

    def test_analyze_secure_dockerfile(self, tmp_path):
        """Test analysis of a secure Dockerfile."""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text("""
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
USER appuser
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/ || exit 1
CMD ["python", "app.py"]
""")

        analyzer = DockerfileAnalyzer()
        issues = analyzer.analyze(dockerfile)

        # Should have minimal or no issues
        critical_issues = [i for i in issues if i.severity == "CRITICAL"]
        assert len(critical_issues) == 0

    def test_detect_root_user(self, tmp_path):
        """Test detection of root user."""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text("""
FROM python:3.11
USER root
CMD ["python", "app.py"]
""")

        analyzer = DockerfileAnalyzer()
        issues = analyzer.analyze(dockerfile)

        root_issues = [i for i in issues if "root" in i.message.lower()]
        assert len(root_issues) > 0

    def test_detect_latest_tag(self, tmp_path):
        """Test detection of :latest tag."""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text("""
FROM python
CMD ["python", "app.py"]
""")

        analyzer = DockerfileAnalyzer()
        issues = analyzer.analyze(dockerfile)

        latest_issues = [i for i in issues if "latest" in i.message.lower()]
        assert len(latest_issues) > 0

    def test_detect_secrets(self, tmp_path):
        """Test detection of hardcoded secrets."""
        dockerfile = tmp_path / "Dockerfile"
        dockerfile.write_text("""
FROM python:3.11-slim
ENV API_KEY="supersecretkey1234567890"
CMD ["python", "app.py"]
""")

        analyzer = DockerfileAnalyzer()
        issues = analyzer.analyze(dockerfile)

        secret_issues = [i for i in issues if i.severity == "CRITICAL"]
        assert len(secret_issues) > 0


class TestContainerSecurityAuditor:
    """Test container runtime security checks."""

    def test_security_check_creation(self):
        """Test security check object creation."""
        check = SecurityCheck(
            check_id="TEST001",
            name="Test Check",
            description="A test security check",
            passed=True,
            severity="HIGH",
            details="All good",
        )

        assert check.check_id == "TEST001"
        assert check.passed is True
        assert check.severity == "HIGH"

    def test_security_check_severity_levels(self):
        """Test different severity levels."""
        severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]

        for severity in severities:
            check = SecurityCheck(
                check_id="TEST",
                name="Test",
                description="Test",
                passed=False,
                severity=severity,
            )
            assert check.severity == severity


class TestIntegration:
    """Integration tests for full workflows."""

    def test_scan_to_report(self, tmp_path):
        """Test full workflow: scan -> report -> save."""
        # Create a mock scan result
        scan = ScanResult(
            image_name="test",
            image_tag="latest",
            vulnerabilities=[
                Vulnerability(cve_id="CVE-2024-0001", severity=Severity.HIGH, package_name="test-pkg", installed_version="1.0"),
            ],
        )

        # Generate report
        generator = ReportGenerator()
        output_path = tmp_path / "report.json"
        content = generator.generate(scan, format="json", output_path=output_path)

        # Verify
        assert output_path.exists()
        data = json.loads(content)
        assert data["scan_summary"]["total_vulnerabilities"] == 1

    def test_analysis_workflow(self):
        """Test complete analysis workflow."""
        scans = [
            ScanResult(
                image_name="app",
                image_tag="v1",
                vulnerabilities=[
                    Vulnerability(cve_id="CVE-1", severity=Severity.HIGH, package_name="pkg", installed_version="1.0"),
                ],
            ),
            ScanResult(
                image_name="app",
                image_tag="v2",
                vulnerabilities=[],
            ),
        ]

        engine = AnalysisEngine()

        # Compare
        comparison = engine.compare_scans(scans[0], scans[1])
        assert comparison["fixed_vulnerabilities"] == 1

        # Trend
        trend = engine.get_trend(scans)
        assert trend["improving"] is True

        # Recommendations
        recommendations = engine.get_fix_recommendations(scans[0])
        assert len(recommendations) == 1
