"""Backend API tests."""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestDashboardAPI:
    """Test dashboard endpoints."""

    def test_health_check(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_dashboard_summary(self, client):
        response = client.get("/api/v1/dashboard/summary")
        assert response.status_code == 200
        data = response.json()
        assert "total_images" in data
        assert "total_vulns" in data
        assert "risk_score" in data

    def test_trend_data(self, client):
        response = client.get("/api/v1/dashboard/trend")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestScansAPI:
    """Test scans endpoints."""

    def test_list_scans(self, client):
        response = client.get("/api/v1/scans/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_trigger_scan(self, client):
        response = client.post("/api/v1/scans/", json={"image": "nginx:latest"})
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data
        assert data["status"] == "queued"


class TestVulnerabilitiesAPI:
    """Test vulnerabilities endpoints."""

    def test_list_vulnerabilities(self, client):
        response = client.get("/api/v1/vulnerabilities/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_filter_by_severity(self, client):
        response = client.get("/api/v1/vulnerabilities/?severity=CRITICAL")
        assert response.status_code == 200


class TestImagesAPI:
    """Test images endpoints."""

    def test_list_images(self, client):
        response = client.get("/api/v1/images/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_trigger_image_scan(self, client):
        response = client.post("/api/v1/images/nginx/latest/scan")
        assert response.status_code == 200
        data = response.json()
        assert "scan_id" in data


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
