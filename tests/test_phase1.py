"""Tests for Phase 1: Project Setup & Core Architecture."""

import pytest
from pathlib import Path

from src.config.settings import Settings, ScannerConfig, DatabaseConfig, SecurityConfig
from src.models.vulnerability import Vulnerability, Severity, ScanResult
from src.exceptions import DockerVulnError, ScannerError, TrivyNotFoundError
from src.database.manager import DatabaseManager


class TestSettings:
    """Test configuration system."""

    def test_default_settings(self):
        """Test default configuration loading."""
        settings = Settings()
        assert settings.app_name == "DockerVulnManager"
        assert settings.version == "0.1.0"
        assert settings.scanner.trivy_path == "trivy"
        assert settings.scanner.trivy_timeout == 300

    def test_ensure_dirs(self):
        """Test directory creation."""
        settings = Settings()
        settings.ensure_dirs()
        assert settings.database.db_path.parent.exists()

    def test_security_config(self):
        """Test security configuration."""
        config = SecurityConfig()
        assert config.cis_benchmark_version == "1.6.0"
        assert config.check_root_user is True
        assert config.check_privileged is True


class TestVulnerabilityModel:
    """Test vulnerability data models."""

    def test_vulnerability_creation(self):
        """Test creating a vulnerability."""
        vuln = Vulnerability(
            cve_id="CVE-2024-1234",
            severity=Severity.HIGH,
            package_name="openssl",
            installed_version="1.1.1",
            fixed_version="1.1.1g",
            cvss_score=7.5,
        )
        assert vuln.cve_id == "CVE-2024-1234"
        assert vuln.severity == Severity.HIGH
        assert vuln.severity.weight == 7

    def test_severity_weights(self):
        """Test severity weight calculations."""
        assert Severity.CRITICAL.weight == 10
        assert Severity.HIGH.weight == 7
        assert Severity.MEDIUM.weight == 4
        assert Severity.LOW.weight == 2
        assert Severity.INFO.weight == 1


class TestScanResult:
    """Test scan result model."""

    def test_scan_result_counts(self):
        """Test vulnerability counting."""
        vulns = [
            Vulnerability(cve_id="CVE-1", severity=Severity.CRITICAL, package_name="pkg1", installed_version="1.0"),
            Vulnerability(cve_id="CVE-2", severity=Severity.HIGH, package_name="pkg2", installed_version="2.0"),
            Vulnerability(cve_id="CVE-3", severity=Severity.MEDIUM, package_name="pkg3", installed_version="3.0"),
        ]
        result = ScanResult(
            image_name="nginx",
            image_tag="latest",
            vulnerabilities=vulns,
            packages_scanned=10,
        )
        assert result.total_count == 3
        assert result.critical_count == 1
        assert result.high_count == 1
        assert result.medium_count == 1

    def test_risk_score(self):
        """Test risk score calculation."""
        vulns = [
            Vulnerability(cve_id="CVE-1", severity=Severity.CRITICAL, package_name="pkg1", installed_version="1.0"),
        ]
        result = ScanResult(image_name="test", image_tag="latest", vulnerabilities=vulns)
        assert result.risk_score == 100.0

    def test_empty_scan_risk_score(self):
        """Test empty scan has zero risk."""
        result = ScanResult(image_name="test", image_tag="latest")
        assert result.risk_score == 0.0

    def test_get_summary(self):
        """Test summary generation."""
        result = ScanResult(
            image_name="nginx",
            image_tag="latest",
            vulnerabilities=[],
            packages_scanned=5,
        )
        summary = result.get_summary()
        assert summary["image"] == "nginx:latest"
        assert summary["total_vulnerabilities"] == 0
        assert "risk_score" in summary


class TestExceptions:
    """Test custom exceptions."""

    def test_base_exception(self):
        """Test base exception."""
        with pytest.raises(DockerVulnError):
            raise DockerVulnError("Test error", "Details")

    def test_trivy_not_found(self):
        """Test TrivyNotFoundError."""
        with pytest.raises(TrivyNotFoundError) as exc_info:
            raise TrivyNotFoundError()
        assert "Trivy not found" in str(exc_info.value.message)

    def test_scanner_error(self):
        """Test ScannerError."""
        with pytest.raises(ScannerError):
            raise ScannerError("Scanner failed", "Additional details")


class TestDatabase:
    """Test database initialization."""

    def test_database_initialization(self, tmp_path):
        """Test database creation."""
        db_path = tmp_path / "test.db"
        db = DatabaseManager(db_path=db_path)
        db.initialize()
        assert db_path.exists()

    def test_save_and_retrieve_scan(self, tmp_path):
        """Test saving and retrieving scans."""
        db_path = tmp_path / "test.db"
        db = DatabaseManager(db_path=db_path)
        db.initialize()

        result = ScanResult(
            image_name="nginx",
            image_tag="latest",
            vulnerabilities=[],
            packages_scanned=10,
        )
        scan_id = db.save_scan(result)
        assert scan_id > 0

        saved = db.get_scan(scan_id)
        assert saved is not None
        assert saved.image_name == "nginx"
        assert saved.image_tag == "latest"

    def test_list_scans(self, tmp_path):
        """Test listing scans."""
        db_path = tmp_path / "test.db"
        db = DatabaseManager(db_path=db_path)
        db.initialize()

        for i in range(3):
            db.save_scan(
                ScanResult(
                    image_name="test",
                    image_tag=f"v{i}",
                    vulnerabilities=[],
                )
            )

        scans = db.list_scans()
        assert len(scans) == 3
