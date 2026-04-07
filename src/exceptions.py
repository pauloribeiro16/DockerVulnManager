"""Custom exceptions for DockerVulnManager."""



class DockerVulnError(Exception):
    """Base exception for all DockerVulnManager errors."""

    def __init__(self, message: str, details: str | None = None):
        self.message = message
        self.details = details
        super().__init__(self.message)


class ScannerError(DockerVulnError):
    """Raised when scanner encounters an error."""

    pass


class TrivyNotFoundError(ScannerError):
    """Raised when Trivy is not installed or not found in PATH."""

    def __init__(self):
        super().__init__(
            message="Trivy not found. Please install it: https://aquasecurity.github.io/trivy/",
            details="Run: sudo apt-get install wget apt-transport-https gnupg lsb-release\n"
            "wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -\n"
            "echo deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main | sudo tee -a /etc/apt/sources.list.d/trivy.list\n"
            "sudo apt-get update && sudo apt-get install trivy",
        )


class DockerConnectionError(DockerVulnError):
    """Raised when cannot connect to Docker daemon."""

    def __init__(self, details: str | None = None):
        super().__init__(
            message="Cannot connect to Docker daemon",
            details=details or "Is Docker running? Try: systemctl status docker",
        )


class ImageNotFoundError(DockerVulnError):
    """Raised when Docker image is not found."""

    def __init__(self, image: str):
        super().__init__(
            message=f"Image not found: {image}",
            details="Image does not exist locally. Try: docker pull {image}",
        )


class DatabaseError(DockerVulnError):
    """Raised when database operation fails."""

    pass


class ReportGenerationError(DockerVulnError):
    """Raised when report generation fails."""

    pass


class SecurityCheckError(DockerVulnError):
    """Raised when security hardening check fails."""

    pass
