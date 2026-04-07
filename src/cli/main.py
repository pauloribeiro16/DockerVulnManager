"""Main CLI entry point for DockerVulnManager."""

from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from src import __version__
from src.config.settings import settings
from src.core.analysis import AnalysisEngine
from src.core.container_auditor import ContainerSecurityAuditor
from src.core.docker_manager import DockerManager
from src.core.dockerfile_analyzer import DockerfileAnalyzer
from src.core.report_generator import ReportGenerator
from src.core.scanner import ScannerOrchestrator
from src.models.vulnerability import Severity
from src.utils.logger import get_logger, setup_logging

console = Console()
logger = get_logger(__name__)


@click.group(invoke_without_command=True)
@click.version_option(version=__version__, prog_name="DockerVulnManager")
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose output")
@click.pass_context
def cli(ctx, verbose):
    """DockerVulnManager - Scan and manage Docker vulnerabilities.

    \b
    Examples:
      dockervuln scan nginx:latest
      dockervuln scan-all
      dockervuln report nginx:latest --format html
      dockervuln harden --check
      dockervuln analyze Dockerfile
    """
    setup_logging(verbose=verbose)
    settings.ensure_dirs()

    if ctx.invoked_subcommand is None:
        ctx.invoke(status)


@cli.command()
def status():
    """Show application status and configuration."""
    table = Table(show_header=False, box=None)
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")

    table.add_row("App Version", __version__)
    table.add_row("Database", str(settings.database.db_path))
    table.add_row("Trivy Path", settings.scanner.trivy_path)
    table.add_row("Cache Enabled", str(settings.scanner.cache_enabled))

    console.print(Panel(table, title="DockerVulnManager Status", border_style="blue"))


@cli.command()
@click.argument("image")
@click.option("--save/--no-save", default=True, help="Save results to database")
@click.option("--pull", is_flag=True, help="Pull image if not found locally")
def scan(image, save, pull):
    """Scan a Docker image for vulnerabilities.

    \b
    Examples:
      dockervuln scan nginx:latest
      dockervuln scan python:3.11-slim
    """
    try:
        orchestrator = ScannerOrchestrator()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(f"Scanning {image}...", total=None)

            result = orchestrator.scan_image(image, save_to_db=save)
            progress.update(task, description="Scan complete!")

        # Display results
        _display_scan_result(result)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.option("--save/--no-save", default=True, help="Save results to database")
def scan_all(save):
    """Scan all local Docker images."""
    try:
        orchestrator = ScannerOrchestrator()
        docker_mgr = DockerManager()

        images = docker_mgr.list_images()
        console.print(f"[cyan]Found {len(images)} local images[/cyan]")

        results = []
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Scanning images...", total=len(images))

            for image in images:
                for tag in image["tags"]:
                    if tag == "<none>":
                        continue
                    try:
                        result = orchestrator.scan_image(tag, save_to_db=save)
                        results.append(result)
                    except Exception as e:
                        console.print(f"[yellow]Warning:[/yellow] Failed to scan {tag}: {e}")
                progress.advance(task)

        # Summary
        total_vulns = sum(r.total_count for r in results)
        total_critical = sum(r.critical_count for r in results)

        console.print(Panel(
            f"Scanned {len(results)} images\n"
            f"Total vulnerabilities: {total_vulns}\n"
            f"Total critical: {total_critical}",
            title="Scan Summary",
            border_style="green",
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.argument("image")
@click.option("--format", "fmt", type=click.Choice(["json", "csv", "html", "markdown"]), default="html")
@click.option("--output", "-o", type=click.Path(), help="Output file path")
@click.option("--severity", type=click.Choice(["CRITICAL", "HIGH", "MEDIUM", "LOW"]), help="Minimum severity")
def report(image, fmt, output, severity):
    """Generate vulnerability report for an image."""
    try:
        orchestrator = ScannerOrchestrator()

        # Get latest scan from database
        name, tag = orchestrator.docker.parse_image_name(image)
        result = orchestrator.db.get_latest_scan(name, tag)

        if not result:
            console.print(f"[yellow]No scan found for {image}. Running scan now...[/yellow]")
            result = orchestrator.scan_image(image)

        # Filter by severity if specified
        if severity:
            min_sev = Severity(severity)
            result.vulnerabilities = [
                v for v in result.vulnerabilities
                if v.severity.weight >= min_sev.weight
            ]

        # Generate report
        generator = ReportGenerator()
        output_path = Path(output) if output else None
        content = generator.generate(result, format=fmt, output_path=output_path)

        if output_path:
            console.print(f"[green]Report saved to:[/green] {output_path}")
        else:
            console.print(content)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.option("--limit", default=20, help="Number of results to show")
def list_scans(limit):
    """List scan history."""
    try:
        orchestrator = ScannerOrchestrator()
        scans = orchestrator.get_scan_history(limit=limit)

        if not scans:
            console.print("[yellow]No scan history found[/yellow]")
            return

        table = Table(title="Scan History")
        table.add_column("ID", style="cyan")
        table.add_column("Image", style="green")
        table.add_column("Timestamp", style="blue")
        table.add_column("Vulns", justify="right")
        table.add_column("Risk Score", justify="right")

        for scan in scans:
            table.add_row(
                str(scan["id"]),
                scan["image"],
                scan["timestamp"][:19],
                str(scan["vulns"]),
                f"{scan['risk_score']:.1f}",
            )

        console.print(table)

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.argument("image1")
@click.argument("image2")
def compare(image1, image2):
    """Compare vulnerabilities between two images."""
    try:
        orchestrator = ScannerOrchestrator()
        engine = AnalysisEngine()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("Scanning images...", total=None)
            result1 = orchestrator.scan_image(image1, save_to_db=False)
            task2 = progress.add_task(f"Scanning {image2}...", total=None)
            result2 = orchestrator.scan_image(image2, save_to_db=False)

        comparison = engine.compare_scans(result1, result2)

        # Display comparison
        table = Table(title="Image Comparison")
        table.add_column("Metric", style="cyan")
        table.add_column(image1, style="green", justify="right")
        table.add_column(image2, style="green", justify="right")

        table.add_row("Total Vulns", str(comparison["scan1"]["total_vulnerabilities"]), str(comparison["scan2"]["total_vulnerabilities"]))
        table.add_row("Critical", str(comparison["scan1"]["critical"]), str(comparison["scan2"]["critical"]))
        table.add_row("High", str(comparison["scan1"]["high"]), str(comparison["scan2"]["high"]))
        table.add_row("Risk Score", f"{comparison['scan1']['risk_score']:.1f}", f"{comparison['scan2']['risk_score']:.1f}")

        console.print(table)

        console.print(Panel(
            f"New in {image2}: {comparison['new_vulnerabilities']}\n"
            f"Fixed in {image2}: {comparison['fixed_vulnerabilities']}\n"
            f"Common: {comparison['common_vulnerabilities']}\n"
            f"Risk difference: {comparison['risk_difference']:+.2f}",
            title="Differences",
            border_style="yellow",
        ))

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.option("--check", is_flag=True, help="Run security checks on all containers")
@click.option("--container", help="Check specific container")
def harden(check, container):
    """Run Docker security hardening checks."""
    try:
        auditor = ContainerSecurityAuditor()

        if container:
            checks = auditor.audit_container(container)
            _display_security_checks(checks, container_name=container)
        elif check:
            results = auditor.audit_all_containers()
            for container_name, checks in results.items():
                _display_security_checks(checks, container_name)
                console.print()
        else:
            console.print("[yellow]Use --check to audit all containers or --container <name> for specific container[/yellow]")

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


@cli.command()
@click.argument("dockerfile", type=click.Path(exists=True))
def analyze(dockerfile):
    """Analyze a Dockerfile for security issues."""
    try:
        analyzer = DockerfileAnalyzer()
        issues = analyzer.analyze(Path(dockerfile))

        if not issues:
            console.print(f"[green]No security issues found in {dockerfile}[/green]")
            return

        table = Table(title=f"Dockerfile Analysis: {dockerfile}")
        table.add_column("Line", style="cyan", justify="right")
        table.add_column("Severity", style="bold")
        table.add_column("Rule", style="blue")
        table.add_column("Issue")
        table.add_column("Recommendation")

        for issue in issues:
            severity_emoji = {
                "CRITICAL": "🔴",
                "HIGH": "🟠",
                "MEDIUM": "🟡",
                "LOW": "🔵",
                "INFO": "⚪",
            }.get(issue.severity, "⚪")

            table.add_row(
                str(issue.line_number),
                f"{severity_emoji} {issue.severity}",
                issue.rule,
                issue.message,
                issue.recommendation,
            )

        console.print(table)
        console.print(f"\n[yellow]Total issues: {len(issues)}[/yellow]")

    except Exception as e:
        console.print(f"[red]Error:[/red] {str(e)}")
        raise SystemExit(1)


def _display_scan_result(result):
    """Display scan results to console."""
    summary = result.get_summary()

    # Summary panel
    panel_content = (
        f"Total Vulnerabilities: {result.total_count}\n"
        f"  🔴 CRITICAL: {result.critical_count}\n"
        f"  🟠 HIGH:     {result.high_count}\n"
        f"  🟡 MEDIUM:   {result.medium_count}\n"
        f"  🔵 LOW:      {result.low_count}\n\n"
        f"Risk Score: {result.risk_score:.1f}/100"
    )

    border_color = "red" if result.critical_count > 0 else "yellow" if result.high_count > 0 else "green"
    console.print(Panel(panel_content, title=f"Scan Results: {result.image_name}:{result.image_tag}", border_style=border_color))

    # Show critical and high vulnerabilities
    if result.critical_count > 0 or result.high_count > 0:
        table = Table(title="Critical & High Vulnerabilities")
        table.add_column("CVE ID", style="cyan")
        table.add_column("Severity")
        table.add_column("Package")
        table.add_column("Fixed Version")
        table.add_column("CVSS", justify="right")

        for vuln in result.vulnerabilities:
            if vuln.severity in [Severity.CRITICAL, Severity.HIGH]:
                severity_style = "red" if vuln.severity == Severity.CRITICAL else "yellow"
                table.add_row(
                    vuln.cve_id,
                    f"[{severity_style}]{vuln.severity.value}[/{severity_style}]",
                    vuln.package_name,
                    vuln.fixed_version or "N/A",
                    str(vuln.cvss_score or "N/A"),
                )

        console.print(table)


def _display_security_checks(checks, container_name=""):
    """Display security check results."""
    passed = sum(1 for c in checks if c.passed)
    total = len(checks)

    table = Table(title=f"Security Checks: {container_name}")
    table.add_column("ID", style="cyan")
    table.add_column("Check")
    table.add_column("Severity")
    table.add_column("Status", justify="center")
    table.add_column("Details")

    for check in checks:
        status = "✅ PASS" if check.passed else "❌ FAIL"
        severity = check.severity if not check.passed else "-"

        table.add_row(
            check.check_id,
            check.name,
            severity,
            status,
            check.details[:80] if check.details else "-",
        )

    console.print(table)
    console.print(f"[green]Passed: {passed}/{total}[/green]")


if __name__ == "__main__":
    cli()
