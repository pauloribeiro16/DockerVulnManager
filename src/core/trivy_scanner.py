"""Trivy vulnerability scanner integration."""

import json
import os
import shutil
import subprocess

from src.config.settings import settings
from src.exceptions import ScannerError, TrivyNotFoundError
from src.models.vulnerability import ScanResult, Severity, Vulnerability
from src.utils.logger import get_logger

logger = get_logger(__name__)


class TrivyScanner:
    """Trivy vulnerability scanner wrapper."""

    def __init__(self, trivy_path: str | None = None):
        """Initialize Trivy scanner.

        Args:
            trivy_path: Path to Trivy binary (uses settings if None)
        """
        self.trivy_path = trivy_path or settings.scanner.trivy_path

        # Check if Trivy is available
        if not self._is_trivy_available():
            raise TrivyNotFoundError()

        logger.info("Trivy found at: {}", self.trivy_path)

    def _is_trivy_available(self) -> bool:
        """Check if Trivy is installed and accessible.

        Returns:
            True if Trivy is available
        """
        return shutil.which(self.trivy_path) is not None

    def get_version(self) -> str:
        """Get Trivy version.

        Returns:
            Version string
        """
        try:
            result = subprocess.run(
                [self.trivy_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            return "unknown"
        except Exception as e:
            logger.warning("Failed to get Trivy version: {}", e)
            return "unknown"

    def scan_image(self, image_name: str, timeout: int | None = None) -> ScanResult:
        """Scan a Docker image for vulnerabilities.

        Args:
            image_name: Docker image name (e.g., 'nginx:latest')
            timeout: Scan timeout in seconds (uses settings if None)

        Returns:
            ScanResult with all vulnerabilities found

        Raises:
            ScannerError: If scan fails
        """
        timeout = timeout or settings.scanner.trivy_timeout

        logger.info("Starting Trivy scan for: {}", image_name)

        try:
            # Run Trivy scan
            cmd = [
                self.trivy_path,
                "image",
                "--format", "json",
                "--security-checks", "vuln",
                "--scanners", "vuln",
                image_name,
            ]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                env={**os.environ, "TRIVY_QUIET": "true"},
            )

            if result.returncode not in [0, 1]:  # 0 = no vulns, 1 = vulns found
                error_msg = result.stderr.strip() if result.stderr else "Unknown error"
                raise ScannerError(f"Trivy scan failed: {error_msg}")

            # Parse JSON output
            scan_data = json.loads(result.stdout)
            vulnerabilities = self._parse_trivy_output(scan_data, image_name)

            # Count packages scanned
            packages_scanned = 0
            if "Results" in scan_data:
                for result_item in scan_data["Results"]:
                    if "Packages" in result_item:
                        packages_scanned += len(result_item["Packages"])

            scan_result = ScanResult(
                image_name=vulnerabilities[0].package_name if vulnerabilities else image_name.split(":")[0],
                image_tag=image_name.split(":")[1] if ":" in image_name else "latest",
                vulnerabilities=vulnerabilities,
                packages_scanned=packages_scanned,
                scanner_version=self.get_version(),
            )

            logger.info(
                "Scan complete: {} vulnerabilities found ({} critical, {} high)",
                scan_result.total_count,
                scan_result.critical_count,
                scan_result.high_count,
            )

            return scan_result

        except subprocess.TimeoutExpired:
            raise ScannerError(f"Scan timed out after {timeout} seconds")
        except json.JSONDecodeError as e:
            raise ScannerError(f"Failed to parse Trivy output: {e}")
        except ScannerError:
            raise
        except Exception as e:
            raise ScannerError(f"Unexpected error during scan: {e}")

    def _parse_trivy_output(self, scan_data: dict, image_name: str) -> list[Vulnerability]:
        """Parse Trivy JSON output into Vulnerability objects.

        Args:
            scan_data: Raw Trivy JSON output
            image_name: Image that was scanned

        Returns:
            List of Vulnerability objects
        """
        vulnerabilities = []

        if "Results" not in scan_data:
            return vulnerabilities

        for result in scan_data["Results"]:
            if "Vulnerabilities" not in result:
                continue

            for vuln in result["Vulnerabilities"]:
                severity = self._normalize_severity(vuln.get("Severity", "UNKNOWN"))

                # Extract CVSS score if available
                cvss_score = None
                if "CVSS" in vuln:
                    for vendor_cvss in vuln["CVSS"].values():
                        if "V3Score" in vendor_cvss:
                            cvss_score = vendor_cvss["V3Score"]
                            break

                vulnerability = Vulnerability(
                    cve_id=vuln.get("VulnerabilityID", "UNKNOWN"),
                    severity=severity,
                    package_name=vuln.get("PkgName", "unknown"),
                    installed_version=vuln.get("InstalledVersion", "unknown"),
                    fixed_version=vuln.get("FixedVersion"),
                    title=vuln.get("Title") or vuln.get("Description", ""),
                    cvss_score=cvss_score,
                    references=vuln.get("References", [])[:5],  # Limit to 5 references
                )
                vulnerabilities.append(vulnerability)

        return vulnerabilities

    def _normalize_severity(self, severity: str) -> Severity:
        """Normalize Trivy severity to our Severity enum.

        Args:
            severity: Raw severity string from Trivy

        Returns:
            Normalized Severity enum value
        """
        severity_map = {
            "CRITICAL": Severity.CRITICAL,
            "HIGH": Severity.HIGH,
            "MEDIUM": Severity.MEDIUM,
            "LOW": Severity.LOW,
            "INFO": Severity.INFO,
            "UNKNOWN": Severity.INFO,
        }
        return severity_map.get(severity.upper(), Severity.INFO)
