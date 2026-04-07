"""Configuration management for DockerVulnManager."""

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class ScannerConfig(BaseSettings):
    """Scanner-specific configuration."""

    trivy_path: str = Field(default="trivy", description="Path to Trivy binary")
    trivy_timeout: int = Field(default=300, description="Scan timeout in seconds")
    cache_enabled: bool = Field(default=True, description="Enable scan result caching")
    cache_ttl: int = Field(default=3600, description="Cache time-to-live in seconds")

    model_config = {"env_prefix": "SCANNER_"}


class DatabaseConfig(BaseSettings):
    """Database configuration."""

    db_path: Path = Field(
        default=Path.home() / ".dockervuln" / "vulns.db",
        description="SQLite database path",
    )
    pool_size: int = Field(default=5, description="Connection pool size")

    model_config = {"env_prefix": "DB_"}


class SecurityConfig(BaseSettings):
    """Security hardening configuration."""

    cis_benchmark_version: str = Field(default="1.6.0", description="CIS Docker Benchmark version")
    check_root_user: bool = Field(default=True, description="Check for containers running as root")
    check_privileged: bool = Field(default=True, description="Check for privileged containers")
    min_severity: str = Field(default="MEDIUM", description="Minimum severity to report")

    model_config = {"env_prefix": "SECURITY_"}


class Settings(BaseSettings):
    """Main application settings."""

    app_name: str = Field(default="DockerVulnManager", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")
    debug: bool = Field(default=False, description="Enable debug mode")

    # Sub-configs
    scanner: ScannerConfig = Field(default_factory=ScannerConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }

    def ensure_dirs(self) -> None:
        """Ensure all required directories exist."""
        self.database.db_path.parent.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
