"""Scanner orchestration - combines Docker and Trivy for complete scanning."""


from src.core.docker_manager import DockerManager
from src.core.trivy_scanner import TrivyScanner
from src.database.manager import DatabaseManager
from src.exceptions import ScannerError
from src.models.vulnerability import ScanResult
from src.utils.logger import get_logger

logger = get_logger(__name__)


class ScannerOrchestrator:
    """Orchestrates scanning operations across multiple components."""

    def __init__(
        self,
        docker_manager: DockerManager | None = None,
        trivy_scanner: TrivyScanner | None = None,
        database: DatabaseManager | None = None,
    ):
        """Initialize scanner orchestrator.

        Args:
            docker_manager: Docker manager instance
            trivy_scanner: Trivy scanner instance
            database: Database manager instance
        """
        self.docker = docker_manager or DockerManager()
        self.trivy = trivy_scanner or TrivyScanner()
        self.db = database or DatabaseManager()

        # Ensure database is initialized
        self.db.initialize()

        logger.info("Scanner orchestrator initialized")

    def scan_image(self, image_name: str, save_to_db: bool = True) -> ScanResult:
        """Scan a Docker image and optionally save results.

        Args:
            image_name: Image name to scan
            save_to_db: Whether to save results to database

        Returns:
            ScanResult with vulnerabilities
        """
        logger.info("Scanning image: {}", image_name)

        # Parse image name
        name, tag = self.docker.parse_image_name(image_name)

        # Run vulnerability scan
        result = self.trivy.scan_image(image_name)

        # Fix image name in result
        result.image_name = name
        result.image_tag = tag

        # Save to database if requested
        if save_to_db:
            scan_id = self.db.save_scan(result)
            logger.info("Scan saved to database with ID: {}", scan_id)

        return result

    def scan_all_local_images(self, save_to_db: bool = True) -> list[ScanResult]:
        """Scan all local Docker images.

        Args:
            save_to_db: Whether to save results to database

        Returns:
            List of ScanResult objects
        """
        logger.info("Scanning all local images")

        images = self.docker.list_images()
        results = []

        for image in images:
            # Skip images without tags
            for tag in image["tags"]:
                if tag == "<none>":
                    continue

                try:
                    result = self.scan_image(tag, save_to_db=save_to_db)
                    results.append(result)
                except ScannerError as e:
                    logger.warning("Failed to scan {}: {}", tag, e.message)

        logger.info("Scanned {} images successfully", len(results))
        return results

    def get_scan_history(self, limit: int = 20) -> list[dict]:
        """Get scan history from database.

        Args:
            limit: Maximum number of results

        Returns:
            List of scan summaries
        """
        return self.db.list_scans(limit=limit)

    def get_image_history(self, image_name: str) -> ScanResult | None:
        """Get latest scan for a specific image.

        Args:
            image_name: Image name

        Returns:
            Latest ScanResult or None
        """
        name, tag = self.docker.parse_image_name(image_name)
        return self.db.get_latest_scan(name, tag)
