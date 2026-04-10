"""Backend API tests."""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.models.vulnerability import ScanResult, Severity, Vulnerability


def _make_scan_result():
    return ScanResult(
        image_name="nginx",
        image_tag="latest",
        scan_timestamp=datetime.now(),
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
        packages_scanned=150,
    )


def _insert_test_scan(db):
    """Insert a test scan result into the database so list endpoints return data."""
    result = _make_scan_result()
    db.save_scan(result)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clear_db():
    """Ensure each test starts with a clean state (new db instance)."""
    yield
    # Re-initialize DB (drops and recreates tables via create_all)
    from src.database.manager import db
    db.initialize()


class TestDashboardAPI:
    """Test dashboard endpoints."""

    def test_health_check(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_dashboard_summary(self, client):
        from src.database.manager import db
        _insert_test_scan(db)

        response = client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_images" in data
        assert "total_vulns" in data
        assert "risk_score" in data
        assert data["total_images"] >= 1

    def test_trend_data(self, client):
        response = client.get("/api/v1/dashboard/trend")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestScansAPI:
    """Test scans endpoints."""

    def test_list_scans(self, client):
        from src.database.manager import db
        _insert_test_scan(db)

        response = client.get("/api/v1/scans/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    @patch("src.api.routers.scans.ScannerOrchestrator.scan_image")
    def test_trigger_scan(self, mock_scan, client):
        mock_result = _make_scan_result()
        mock_scan.return_value = mock_result

        response = client.post("/api/v1/scans/", json={"image": "nginx:latest"})
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data
        assert data["status"] == "queued"


class TestVulnerabilitiesAPI:
    """Test vulnerabilities endpoints."""

    def test_list_vulnerabilities(self, client):
        from src.database.manager import db
        _insert_test_scan(db)

        response = client.get("/api/v1/vulnerabilities/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        assert len(response.json()) >= 1

    def test_filter_by_severity(self, client):
        from src.database.manager import db
        _insert_test_scan(db)

        response = client.get("/api/v1/vulnerabilities/?severity=CRITICAL")
        assert response.status_code == 200
        data = response.json()
        for v in data:
            assert v["severity"] == "CRITICAL"


class TestImagesAPI:
    """Test images endpoints."""

    def test_list_images(self, client):
        from src.database.manager import db
        _insert_test_scan(db)

        response = client.get("/api/v1/images/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @patch("src.api.routers.images.ScannerOrchestrator.scan_image")
    def test_trigger_image_scan(self, mock_scan, client):
        mock_result = _make_scan_result()
        mock_scan.return_value = mock_result

        response = client.post("/api/v1/images/nginx/latest/scan")
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data

    @patch("src.api.routers.scans.DockerManager.list_images")
    @patch("src.api.routers.scans.ScannerOrchestrator.scan_image")
    def test_scan_all(self, mock_scan, mock_list, client):
        mock_list.return_value = [
            {"id": "abc123", "tags": ["nginx:latest"], "created": "", "size": 0},
            {"id": "def456", "tags": ["python:3.11-slim"], "created": "", "size": 0},
        ]
        mock_scan.return_value = _make_scan_result()

        response = client.post("/api/v1/scans/scan-all")
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data
        assert data["status"] == "queued"

    @patch("src.api.routers.scans.ScannerOrchestrator.scan_image")
    def test_scan_job_status_tracking(self, mock_scan, client):
        """Verify that a scan creates a job with queued status."""
        mock_scan.return_value = _make_scan_result()

        response = client.post("/api/v1/scans/", json={"image": "nginx:latest"})
        assert response.status_code == 200
        data = response.json()
        scan_id = data["scan_id"]

        # Check status endpoint
        status_resp = client.get(f"/api/v1/scans/status/{scan_id}")
        assert status_resp.status_code == 200
        status = status_resp.json()
        assert status["scan_id"] == scan_id
        assert status["status"] in ("queued", "running", "complete")

    def test_scan_status_not_found(self, client):
        """Check that non-existent scan job returns 404."""
        response = client.get("/api/v1/scans/status/nonexistent")
        assert response.status_code == 404


class TestHardeningAPI:
    """Test hardening endpoints."""

    def test_container_audits(self, client):
        response = client.get("/api/v1/hardening/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_dockerfile_analysis(self, client):
        response = client.get("/api/v1/hardening/dockerfile")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
