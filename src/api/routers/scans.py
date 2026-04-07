"""Scans API routes."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, WebSocket, WebSocketDisconnect

from src.api.schemas import ScanCreate, ScanResponse, ScanTriggerResponse, ScanProgressMessage
from src.core.scanner import ScannerOrchestrator
from src.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/scans", tags=["scans"])


def _get_orchestrator() -> ScannerOrchestrator:
    return ScannerOrchestrator()


OrchestratorDep = Annotated[ScannerOrchestrator, Depends(_get_orchestrator)]

# WebSocket connection manager
active_connections: dict[str, WebSocket] = {}


@router.get("/", response_model=list[ScanResponse])
def list_scans(
    page: int = 1,
    size: int = 20,
    orch: OrchestratorDep = Depends(_get_orchestrator),
) -> list[ScanResponse]:
    """List recent scans with pagination."""
    scans = orch.db.list_scans(limit=size * page)
    start = (page - 1) * size
    return [
        ScanResponse(
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
        )
        for s in scans[start:start + size]
    ]


@router.post("/", response_model=ScanTriggerResponse)
async def trigger_scan(
    data: ScanCreate,
    background_tasks: BackgroundTasks,
    orch: OrchestratorDep = Depends(_get_orchestrator),
) -> ScanTriggerResponse:
    """Trigger a new scan in the background."""
    import uuid
    scan_id = str(uuid.uuid4())[:8]

    async def _run_scan():
        try:
            result = orch.scan_image(data.image, save_to_db=True)
            # Notify WebSocket clients
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


@router.get("/{scan_id}", response_model=ScanResponse)
def get_scan(
    scan_id: int,
    orch: OrchestratorDep = Depends(_get_orchestrator),
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
