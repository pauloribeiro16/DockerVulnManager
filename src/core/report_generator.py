"""Report generation system for vulnerability scans."""

import csv
import json
from datetime import datetime
from io import StringIO
from pathlib import Path

from jinja2 import BaseLoader, Environment, FileSystemLoader

from src.models.vulnerability import ScanResult, Severity
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ReportGenerator:
    """Generates vulnerability reports in multiple formats."""

    def __init__(self, template_dir: Path | None = None):
        """Initialize report generator.

        Args:
            template_dir: Directory containing Jinja2 templates
        """
        self.template_dir = template_dir
        if template_dir and template_dir.exists():
            self.env = Environment(loader=FileSystemLoader(str(template_dir)))
        else:
            self.env = Environment(loader=BaseLoader())
            self._load_builtin_templates()

    def _load_builtin_templates(self) -> None:
        """Load built-in HTML template."""
        from jinja2 import DictLoader
        self.env = Environment(loader=DictLoader({"report.html": HTML_TEMPLATE}))

    def generate(
        self,
        scan_result: ScanResult,
        format: str = "json",
        output_path: Path | None = None,
    ) -> str:
        """Generate a report in the specified format.

        Args:
            scan_result: Scan result to generate report for
            format: Output format (json, csv, html, markdown)
            output_path: Optional path to save report

        Returns:
            Report content as string
        """
        format = format.lower()

        if format == "json":
            content = self._generate_json(scan_result)
        elif format == "csv":
            content = self._generate_csv(scan_result)
        elif format == "html":
            content = self._generate_html(scan_result)
        elif format == "markdown" or format == "md":
            content = self._generate_markdown(scan_result)
        else:
            raise ValueError(f"Unsupported format: {format}. Use json, csv, html, or markdown")

        # Save to file if path provided
        if output_path:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(content)
            logger.info("Report saved to: {}", output_path)

        return content

    def _generate_json(self, scan_result: ScanResult) -> str:
        """Generate JSON report."""
        data = {
            "scan_summary": scan_result.get_summary(),
            "vulnerabilities": [v.model_dump() for v in scan_result.vulnerabilities],
            "generated_at": datetime.now().isoformat(),
        }
        return json.dumps(data, indent=2, default=str)

    def _generate_csv(self, scan_result: ScanResult) -> str:
        """Generate CSV report."""
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            "CVE ID", "Severity", "Package", "Installed Version",
            "Fixed Version", "CVSS Score", "Title"
        ])

        # Data rows
        for vuln in scan_result.vulnerabilities:
            writer.writerow([
                vuln.cve_id,
                vuln.severity.value,
                vuln.package_name,
                vuln.installed_version,
                vuln.fixed_version or "N/A",
                vuln.cvss_score or "N/A",
                vuln.title or "",
            ])

        return output.getvalue()

    def _generate_html(self, scan_result: ScanResult) -> str:
        """Generate HTML report."""
        template = self.env.get_template("report.html")

        return template.render(
            scan=scan_result,
            summary=scan_result.get_summary(),
            generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            severity_colors={
                "CRITICAL": "#dc3545",
                "HIGH": "#fd7e14",
                "MEDIUM": "#ffc107",
                "LOW": "#17a2b8",
                "INFO": "#6c757d",
            }
        )

    def _generate_markdown(self, scan_result: ScanResult) -> str:
        """Generate Markdown report."""
        lines = [
            "# Vulnerability Report",
            "",
            f"**Image**: {scan_result.image_name}:{scan_result.image_tag}",
            f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Risk Score**: {scan_result.risk_score:.1f}/100",
            "",
            "## Summary",
            "",
            f"- **Total Vulnerabilities**: {scan_result.total_count}",
            f"- **Critical**: {scan_result.critical_count}",
            f"- **High**: {scan_result.high_count}",
            f"- **Medium**: {scan_result.medium_count}",
            f"- **Low**: {scan_result.low_count}",
            "",
            "## Vulnerabilities",
            "",
        ]

        # Group by severity
        for severity in [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW, Severity.INFO]:
            vulns = [v for v in scan_result.vulnerabilities if v.severity == severity]
            if vulns:
                emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🔵", "INFO": "⚪"}
                lines.append(f"### {emoji[severity.value]} {severity.value} ({len(vulns)})")
                lines.append("")

                for vuln in vulns:
                    lines.append(f"#### {vuln.cve_id}")
                    lines.append(f"- **Package**: {vuln.package_name}")
                    lines.append(f"- **Installed**: {vuln.installed_version}")
                    if vuln.fixed_version:
                        lines.append(f"- **Fixed Version**: {vuln.fixed_version}")
                    if vuln.cvss_score:
                        lines.append(f"- **CVSS**: {vuln.cvss_score}")
                    if vuln.title:
                        lines.append(f"- **Description**: {vuln.title}")
                    lines.append("")

        return "\n".join(lines)


# Built-in HTML template
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vulnerability Report - {{ scan.image_name }}:{{ scan.image_tag }}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
        .stat { padding: 20px; border-radius: 8px; text-align: center; color: white; }
        .stat.critical { background: #dc3545; }
        .stat.high { background: #fd7e14; }
        .stat.medium { background: #ffc107; color: #333; }
        .stat.low { background: #17a2b8; }
        .stat.total { background: #6c757d; }
        .stat h3 { margin: 0; font-size: 2.5em; }
        .stat p { margin: 5px 0 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #343a40; color: white; padding: 12px; text-align: left; }
        td { padding: 10px 12px; border-bottom: 1px solid #dee2e6; }
        tr:hover { background: #f8f9fa; }
        .severity { padding: 4px 8px; border-radius: 4px; color: white; font-weight: bold; }
        .CRITICAL { background: #dc3545; }
        .HIGH { background: #fd7e14; }
        .MEDIUM { background: #ffc107; color: #333; }
        .LOW { background: #17a2b8; }
        .INFO { background: #6c757d; }
        .risk-score { font-size: 2em; font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Vulnerability Report</h1>
        <p><strong>Image:</strong> {{ scan.image_name }}:{{ scan.image_tag }}</p>
        <p><strong>Generated:</strong> {{ generated_at }}</p>

        <div class="summary">
            <div class="stat critical">
                <h3>{{ scan.critical_count }}</h3>
                <p>CRITICAL</p>
            </div>
            <div class="stat high">
                <h3>{{ scan.high_count }}</h3>
                <p>HIGH</p>
            </div>
            <div class="stat medium">
                <h3>{{ scan.medium_count }}</h3>
                <p>MEDIUM</p>
            </div>
            <div class="stat low">
                <h3>{{ scan.low_count }}</h3>
                <p>LOW</p>
            </div>
            <div class="stat total">
                <h3>{{ scan.total_count }}</h3>
                <p>TOTAL</p>
            </div>
        </div>

        <h2>Risk Score: <span class="risk-score">{{ "%.1f"|format(scan.risk_score) }}/100</span></h2>

        <h2>Vulnerabilities</h2>
        <table>
            <thead>
                <tr>
                    <th>CVE ID</th>
                    <th>Severity</th>
                    <th>Package</th>
                    <th>Installed</th>
                    <th>Fixed</th>
                    <th>CVSS</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                {% for vuln in scan.vulnerabilities %}
                <tr>
                    <td><code>{{ vuln.cve_id }}</code></td>
                    <td><span class="severity {{ vuln.severity.value }}">{{ vuln.severity.value }}</span></td>
                    <td>{{ vuln.package_name }}</td>
                    <td>{{ vuln.installed_version }}</td>
                    <td>{{ vuln.fixed_version or 'N/A' }}</td>
                    <td>{{ vuln.cvss_score or 'N/A' }}</td>
                    <td>{{ vuln.title or '-' }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>

        <div class="footer">
            <p>Generated by DockerVulnManager | Scan packages: {{ scan.packages_scanned }}</p>
        </div>
    </div>
</body>
</html>
"""
