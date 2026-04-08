"""Images API routes."""

from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends

from src.api.schemas import ImageHealthResponse, ScanTriggerResponse
from src.core.docker_manager import DockerManager
from src.core.scanner import ScannerOrchestrator
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/images", tags=["images"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()


def _get_docker() -> DockerManager:
    return DockerManager()



DockerDep = Annotated[DockerManager, Depends(_get_docker)]


@router.get("/", response_model=list[ImageHealthResponse])
def list_images(
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> list[ImageHealthResponse]:
    """List all scanned images with health status."""
    scans = orch.db.list_scans(limit=100)
    images: dict[str, ImageHealthResponse] = {}

    for scan in scans:
        key = scan["image"]
        if key not in images:
            name, tag = (key.split(":") + ["latest"])[:2]
            images[key] = ImageHealthResponse(
                name=name,
                tag=tag,
                last_scan=scan["timestamp"],
                risk_score=scan["risk_score"],
                total_vulns=scan["vulns"],
                critical=0,
                high=0,
                medium=0,
                low=0,
                status="safe",
            )

    # Calculate status from risk_score
    for img in images.values():
        if img.risk_score >= 70:
            img.status = "danger"
        elif img.risk_score >= 40:
            img.status = "warning"
        else:
            img.status = "safe"

    return list(images.values())


@router.post("/{name}/{tag}/scan", response_model=ScanTriggerResponse)
async def scan_image(
    name: str,
    tag: str,
    background_tasks: BackgroundTasks,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> ScanTriggerResponse:
    """Trigger a scan for a specific image."""
    import uuid
    scan_id = str(uuid.uuid4())[:8]
    image = f"{name}:{tag}"

    async def _run_scan():
        try:
            orch.scan_image(image, save_to_db=True)
        except Exception as e:
            logger.error("Image scan failed: {}", str(e))

    background_tasks.add_task(_run_scan)
    return ScanTriggerResponse(scan_id=scan_id, status="queued")


@router.get("/{name}/{tag}/history", response_model=list)
def get_image_history(
    name: str,
    tag: str,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> list:
    """Get scan history for a specific image."""
    return orch.db.list_scans(limit=20)
