"""Scans API routes."""

import asyncio
import uuid
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect

from src.api.schemas import ScanCreate, ScanResponse, ScanTriggerResponse, ScanProgressMessage
from src.core.docker_manager import DockerManager
from src.core.scanner import ScannerOrchestrator
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/scans", tags=["scans"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()


# WebSocket connection manager
active_connections: dict[str, WebSocket] = {}


@router.get("/", response_model=list[ScanResponse])
def list_scans(
    page: int = 1,
    size: int = 20,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> list[ScanResponse]:
    """List recent scans with pagination."""
    scans = orch.db.list_scans(limit=size * page)
    start = (page - 1) * size
    result = []
    for s in scans[start:start + size]:
        record = orch.db.get_scan(s["id"])
        if record:
            result.append(ScanResponse(
                id=s["id"],
                image_name=record.image_name,
                image_tag=record.image_tag,
                scan_timestamp=s["timestamp"],
                packages_scanned=record.packages_scanned,
                risk_score=s["risk_score"],
                total_count=record.total_count,
                critical_count=record.critical_count,
                high_count=record.high_count,
                medium_count=record.medium_count,
                low_count=record.low_count,
            ))
        else:
            result.append(ScanResponse(
                id=s["id"],
                image_name=s["image"].split(":")[0],
                image_tag=s["image"].split(":")[1] if ":" in s["image"] else "latest",
                scan_timestamp=s["timestamp"],
                packages_scanned=0,
                risk_score=s["risk_score"],
                total_count=s["vulns"],
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
            ))
    return result


@router.post("/", response_model=ScanTriggerResponse)
async def trigger_scan(
    data: ScanCreate,
    background_tasks: BackgroundTasks,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> ScanTriggerResponse:
    """Trigger a new scan in the background."""
    scan_id = str(uuid.uuid4())[:8]

    async def _run_scan():
        try:
            result = orch.scan_image(data.image, save_to_db=True)
            if scan_id in active_connections:
                await active_connections[scan_id].send_json(
                    ScanProgressMessage(
                        scan_id=scan_id,
                        progress=100,
                        status="complete",
                        message=f"Scan complete: {result.total_count} vulnerabilities found",
                    ).model_dump()
                )
        except Exception as e:
            logger.error("Scan failed: {}", str(e))
            if scan_id in active_connections:
                await active_connections[scan_id].send_json(
                    ScanProgressMessage(
                        scan_id=scan_id,
                        progress=0,
                        status="error",
                        message=str(e),
                    ).model_dump()
                )

    background_tasks.add_task(_run_scan)
    return ScanTriggerResponse(scan_id=scan_id, status="queued")


@router.post("/scan-all", response_model=ScanTriggerResponse)
def trigger_scan_all(
    background_tasks: BackgroundTasks,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> ScanTriggerResponse:
    """Trigger scans for all local Docker images."""
    scan_id = str(uuid.uuid4())[:8]

    def _run_scan_all():
        docker_mgr = DockerManager()
        images = docker_mgr.list_images()
        total = 0
        errors = 0
        for image in images:
            for tag_ref in image.get("tags", []):
                if tag_ref == "<none>":
                    continue
                try:
                    orch.scan_image(tag_ref, save_to_db=True)
                    total += 1
                except Exception as e:
                    logger.error("Scan failed for {}: {}", tag_ref, str(e))
                    errors += 1
        logger.info("Scan-all complete: {} images scanned, {} errors", total, errors)

    background_tasks.add_task(_run_scan_all)
    return ScanTriggerResponse(scan_id=scan_id, status="queued")


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    orch: ScannerOrchestrator = Depends(_get_orchestrator),
) -> ScanResponse:
    """Get scan details by ID."""
    record = orch.db.get_scan(scan_id)
    if not record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scan not found")

    return ScanResponse(
        id=record.id if hasattr(record, "id") else scan_id,
        image_name=record.image_name,
        image_tag=record.image_tag,
        scan_timestamp=record.scan_timestamp.isoformat(),
        packages_scanned=record.packages_scanned,
        risk_score=record.risk_score,
        total_count=record.total_count,
        critical_count=record.critical_count,
        high_count=record.high_count,
        medium_count=record.medium_count,
        low_count=record.low_count,
        vulnerabilities=record.vulnerabilities,
    )


@router.websocket("/ws/progress/{scan_id}")
async def scan_progress_ws(websocket: WebSocket, scan_id: str):
    """WebSocket endpoint for real-time scan progress."""
    await websocket.accept()
    active_connections[scan_id] = websocket
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.pop(scan_id, None)
