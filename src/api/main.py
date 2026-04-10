"""FastAPI application - Main entry point for the API server."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.api.routers import dashboard, scans, vulnerabilities, images, hardening
from src.config.settings import settings
from src.utils.logger import setup_logging

# Initialize logging
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize settings and DB on startup."""
    settings.ensure_dirs()
    from src.database.manager import db
    db.initialize()
    yield


class SPAStaticFiles(StaticFiles):
    """Static files handler that serves index.html for SPA routing."""

    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except (HTTPException, StarletteHTTPException) as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise


# Create FastAPI app
app = FastAPI(
    title="DockerVulnManager API",
    description="Docker vulnerability management and security hardening API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware (for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8888"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(scans.router, prefix="/api/v1")
app.include_router(vulnerabilities.router, prefix="/api/v1")
app.include_router(images.router, prefix="/api/v1")
app.include_router(hardening.router, prefix="/api/v1")


# Health check
@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "version": "0.1.0"}


# Mount SPA (only if frontend dist exists)
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    app.mount("/", SPAStaticFiles(directory=str(FRONTEND_DIST), html=True), name="spa")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
