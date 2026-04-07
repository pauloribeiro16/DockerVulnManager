"""Vulnerability analysis and comparison engine."""


from src.models.vulnerability import ScanResult, Severity
from src.utils.logger import get_logger

logger = get_logger(__name__)


class AnalysisEngine:
    """Analyzes and compares vulnerability scan results."""

    def compare_scans(self, scan1: ScanResult, scan2: ScanResult) -> dict:
        """Compare two scan results.

        Args:
            scan1: First scan result
            scan2: Second scan result

        Returns:
            Comparison dictionary
        """
        vulns1 = {v.cve_id: v for v in scan1.vulnerabilities}
        vulns2 = {v.cve_id: v for v in scan2.vulnerabilities}

        cves1 = set(vulns1.keys())
        cves2 = set(vulns2.keys())

        # Find new, fixed, and common vulnerabilities
        new_cves = cves2 - cves1
        fixed_cves = cves1 - cves2
        common_cves = cves1 & cves2

        # Check for severity changes in common CVEs
        severity_changes = []
        for cve in common_cves:
            if vulns1[cve].severity != vulns2[cve].severity:
                severity_changes.append({
                    "cve_id": cve,
                    "old_severity": vulns1[cve].severity.value,
                    "new_severity": vulns2[cve].severity.value,
                })

        comparison = {
            "scan1": scan1.get_summary(),
            "scan2": scan2.get_summary(),
            "new_vulnerabilities": len(new_cves),
            "fixed_vulnerabilities": len(fixed_cves),
            "common_vulnerabilities": len(common_cves),
            "severity_changes": severity_changes,
            "risk_difference": round(scan2.risk_score - scan1.risk_score, 2),
        }

        logger.info(
            "Comparison: {} new, {} fixed, {} common",
            len(new_cves),
            len(fixed_cves),
            len(common_cves),
        )

        return comparison

    def find_common_vulnerabilities(self, scans: list[ScanResult]) -> dict[str, list[str]]:
        """Find vulnerabilities common across multiple scans.

        Args:
            scans: List of scan results

        Returns:
            Dictionary mapping CVE IDs to list of affected images
        """
        cve_to_images: dict[str, list[str]] = {}

        for scan in scans:
            for vuln in scan.vulnerabilities:
                if vuln.cve_id not in cve_to_images:
                    cve_to_images[vuln.cve_id] = []
                cve_to_images[vuln.cve_id].append(f"{scan.image_name}:{scan.image_tag}")

        # Only return CVEs present in multiple images
        common = {
            cve: images
            for cve, images in cve_to_images.items()
            if len(images) > 1
        }

        logger.info("Found {} common vulnerabilities across {} scans", len(common), len(scans))
        return common

    def get_trend(self, scans: list[ScanResult]) -> dict:
        """Analyze vulnerability trend over multiple scans.

        Args:
            scans: List of scan results (chronologically ordered)

        Returns:
            Trend analysis dictionary
        """
        if len(scans) < 2:
            return {"error": "Need at least 2 scans for trend analysis"}

        # Sort by timestamp
        sorted_scans = sorted(scans, key=lambda s: s.scan_timestamp)

        first = sorted_scans[0]
        last = sorted_scans[-1]

        trend = {
            "first_scan": first.get_summary(),
            "latest_scan": last.get_summary(),
            "total_change": last.total_count - first.total_count,
            "critical_change": last.critical_count - first.critical_count,
            "high_change": last.high_count - first.high_count,
            "risk_score_change": round(last.risk_score - first.risk_score, 2),
            "improving": last.total_count < first.total_count,
            "scan_count": len(scans),
        }

        logger.info(
            "Trend: {} total change, risk score change: {}",
            trend["total_change"],
            trend["risk_score_change"],
        )

        return trend

    def get_fix_recommendations(self, scan: ScanResult, min_severity: Severity = Severity.MEDIUM) -> list[dict]:
        """Get prioritized fix recommendations.

        Args:
            scan: Scan result to analyze
            min_severity: Minimum severity to include

        Returns:
            List of fix recommendations
        """
        recommendations = []

        for vuln in scan.vulnerabilities:
            if vuln.severity.weight < min_severity.weight:
                continue

            if vuln.fixed_version:
                recommendations.append({
                    "cve_id": vuln.cve_id,
                    "severity": vuln.severity.value,
                    "package": vuln.package_name,
                    "current_version": vuln.installed_version,
                    "recommended_version": vuln.fixed_version,
                    "action": f"Upgrade {vuln.package_name} to {vuln.fixed_version}",
                    "cvss_score": vuln.cvss_score,
                })
            else:
                recommendations.append({
                    "cve_id": vuln.cve_id,
                    "severity": vuln.severity.value,
                    "package": vuln.package_name,
                    "current_version": vuln.installed_version,
                    "recommended_version": None,
                    "action": f"No fix available for {vuln.package_name} - consider alternative packages",
                    "cvss_score": vuln.cvss_score,
                })

        # Sort by CVSS score (highest first)
        recommendations.sort(key=lambda r: r.get("cvss_score") or 0, reverse=True)

        logger.info("Generated {} fix recommendations", len(recommendations))
        return recommendations

    def generate_security_summary(self, scan: ScanResult) -> str:
        """Generate a human-readable security summary.

        Args:
            scan: Scan result to summarize

        Returns:
            Summary string
        """
        lines = [
            f"Scan Summary for {scan.image_name}:{scan.image_tag}",
            "=" * 60,
            f"Total Vulnerabilities: {scan.total_count}",
            f"  CRITICAL: {scan.critical_count}",
            f"  HIGH:     {scan.high_count}",
            f"  MEDIUM:   {scan.medium_count}",
            f"  LOW:      {scan.low_count}",
            f"Risk Score: {scan.risk_score:.1f}/100",
            "",
        ]

        if scan.critical_count > 0:
            lines.append("🔴 CRITICAL vulnerabilities found:")
            for vuln in scan.vulnerabilities:
                if vuln.severity == Severity.CRITICAL:
                    lines.append(f"  - {vuln.cve_id}: {vuln.title or vuln.package_name}")
            lines.append("")

        if scan.high_count > 0:
            lines.append("🟠 HIGH severity vulnerabilities:")
            for vuln in scan.vulnerabilities:
                if vuln.severity == Severity.HIGH:
                    lines.append(f"  - {vuln.cve_id}: {vuln.title or vuln.package_name}")
            lines.append("")

        if scan.risk_score > 70:
            lines.append("⚠️  HIGH RISK: Immediate action recommended!")
        elif scan.risk_score > 40:
            lines.append("⚠️  MEDIUM RISK: Review and plan fixes")
        else:
            lines.append("✅ LOW RISK: Continue monitoring")

        return "\n".join(lines)
