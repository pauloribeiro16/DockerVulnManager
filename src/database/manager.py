"""Database manager for storing and querying scan results."""

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, Column, DateTime, Float, Integer, String, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from src.config.settings import settings
from src.exceptions import DatabaseError
from src.models.vulnerability import ScanResult, Vulnerability
from src.utils.logger import get_logger

logger = get_logger(__name__)

Base = declarative_base()


class ScanResultModel(Base):
    """SQLAlchemy model for scan results."""

    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    image_name = Column(String, nullable=False, index=True)
    image_tag = Column(String, nullable=False)
    scan_timestamp = Column(DateTime, nullable=False)
    scanner_version = Column(String, nullable=True)
    packages_scanned = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    vulnerabilities_json = Column(JSON, nullable=False)

    def to_scan_result(self) -> ScanResult:
        """Convert to Pydantic ScanResult."""
        vulns = [Vulnerability(**v) for v in self.vulnerabilities_json]
        return ScanResult(
            image_name=self.image_name,
            image_tag=self.image_tag,
            scan_timestamp=self.scan_timestamp,
            scanner_version=self.scanner_version,
            vulnerabilities=vulns,
            packages_scanned=self.packages_scanned,
        )

    @classmethod
    def from_scan_result(cls, result: ScanResult) -> "ScanResultModel":
        """Create from Pydantic ScanResult."""
        vulns_json = [v.model_dump() for v in result.vulnerabilities]
        return cls(
            image_name=result.image_name,
            image_tag=result.image_tag,
            scan_timestamp=result.scan_timestamp,
            scanner_version=result.scanner_version,
            packages_scanned=result.packages_scanned,
            risk_score=result.risk_score,
            vulnerabilities_json=vulns_json,
        )


class ScanJobModel(Base):
    """SQLAlchemy model for tracking in-progress scan jobs."""

    __tablename__ = "scan_jobs"

    scan_id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="queued", index=True)
    image = Column(String, nullable=True)
    total_images = Column(Integer, nullable=True)
    scanned_images = Column(Integer, default=0)
    message = Column(String, nullable=True)
    vulns_found = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))


class DatabaseManager:
    """Manages database operations for scan results."""

    def __init__(self, db_path: Path | None = None):
        """Initialize database connection.

        Args:
            db_path: Path to SQLite database (uses settings if None)
        """
        self.db_path = db_path or settings.database.db_path
        self.engine = create_engine(f"sqlite:///{self.db_path}")
        self.SessionLocal = sessionmaker(bind=self.engine)

    def initialize(self) -> None:
        """Create tables if they don't exist."""
        try:
            Base.metadata.create_all(self.engine)
            logger.info("Database initialized at {}", self.db_path)
        except Exception as e:
            raise DatabaseError(f"Failed to initialize database: {e}")

    def save_scan(self, result: ScanResult) -> int:
        """Save scan result to database.

        Args:
            result: ScanResult to save

        Returns:
            Database ID of saved record
        """
        session = self.SessionLocal()
        try:
            record = ScanResultModel.from_scan_result(result)
            session.add(record)
            session.commit()
            scan_id = record.id
            logger.info("Saved scan result for {}:{} (ID: {})", result.image_name, result.image_tag, scan_id)
            return scan_id
        except Exception as e:
            session.rollback()
            raise DatabaseError(f"Failed to save scan: {e}")
        finally:
            session.close()

    def get_scan(self, scan_id: int) -> ScanResult | None:
        """Get scan result by ID.

        Args:
            scan_id: Database ID

        Returns:
            ScanResult or None if not found
        """
        session = self.SessionLocal()
        try:
            record = session.query(ScanResultModel).filter(ScanResultModel.id == scan_id).first()
            return record.to_scan_result() if record else None
        finally:
            session.close()

    def get_latest_scan(self, image_name: str, image_tag: str) -> ScanResult | None:
        """Get most recent scan for an image.

        Args:
            image_name: Image name
            image_tag: Image tag

        Returns:
            Latest ScanResult or None
        """
        session = self.SessionLocal()
        try:
            record = (
                session.query(ScanResultModel)
                .filter(
                    ScanResultModel.image_name == image_name,
                    ScanResultModel.image_tag == image_tag,
                )
                .order_by(ScanResultModel.scan_timestamp.desc())
                .first()
            )
            return record.to_scan_result() if record else None
        finally:
            session.close()

    def list_scans_for_image(self, image_name: str, image_tag: str, limit: int = 20) -> list[ScanResult]:
        """List all scans for a specific image.

        Args:
            image_name: Image name
            image_tag: Image tag
            limit: Maximum number of results

        Returns:
            List of ScanResult objects ordered by timestamp desc
        """
        session = self.SessionLocal()
        try:
            records = (
                session.query(ScanResultModel)
                .filter(
                    ScanResultModel.image_name == image_name,
                    ScanResultModel.image_tag == image_tag,
                )
                .order_by(ScanResultModel.scan_timestamp.desc())
                .limit(limit)
                .all()
            )
            return [r.to_scan_result() for r in records]
        finally:
            session.close()

    def list_scans(self, limit: int = 20) -> list[dict]:
        """List recent scans.

        Args:
            limit: Maximum number of results

        Returns:
            List of scan summaries
        """
        session = self.SessionLocal()
        try:
            records = (
                session.query(ScanResultModel)
                .order_by(ScanResultModel.scan_timestamp.desc())
                .limit(limit)
                .all()
            )
            return [
                {
                    "id": r.id,
                    "image": f"{r.image_name}:{r.image_tag}",
                    "timestamp": r.scan_timestamp.isoformat(),
                    "risk_score": r.risk_score,
                    "vulns": len(r.vulnerabilities_json),
                }
                for r in records
            ]
        finally:
            session.close()

    # ── Scan Job Tracking ──────────────────────────────────────────

    def create_scan_job(self, scan_id: str, image: str | None = None, total_images: int | None = None) -> None:
        """Create a new scan job with status 'queued'."""
        session = self.SessionLocal()
        try:
            job = ScanJobModel(
                scan_id=scan_id,
                status="queued",
                image=image,
                total_images=total_images,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(job)
            session.commit()
        except Exception as e:
            session.rollback()
            raise DatabaseError(f"Failed to create scan job: {e}")
        finally:
            session.close()

    def update_scan_job(self, scan_id: str, **kwargs) -> None:
        """Update fields of an existing scan job (status, message, scanned_images, vulns_found)."""
        session = self.SessionLocal()
        try:
            job = session.query(ScanJobModel).filter(ScanJobModel.scan_id == scan_id).first()
            if job:
                for key, value in kwargs.items():
                    if hasattr(job, key):
                        setattr(job, key, value)
                job.updated_at = datetime.now(timezone.utc)
                session.commit()
        except Exception as e:
            session.rollback()
            raise DatabaseError(f"Failed to update scan job: {e}")
        finally:
            session.close()

    def get_scan_job(self, scan_id: str) -> dict | None:
        """Get scan job status by ID."""
        session = self.SessionLocal()
        try:
            job = session.query(ScanJobModel).filter(ScanJobModel.scan_id == scan_id).first()
            if not job:
                return None
            return {
                "scan_id": job.scan_id,
                "status": job.status,
                "image": job.image,
                "total_images": job.total_images,
                "scanned_images": job.scanned_images,
                "message": job.message,
                "vulns_found": job.vulns_found,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
            }
        finally:
            session.close()

    def cleanup_old_jobs(self, max_age_hours: int = 24) -> int:
        """Delete completed/failed jobs older than max_age_hours. Returns count deleted."""
        session = self.SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc).replace(microsecond=0) - __import__('datetime', fromlist=['timedelta']).timedelta(hours=max_age_hours)
            deleted = session.query(ScanJobModel).filter(
                ScanJobModel.status.in_(["complete", "failed"]),
                ScanJobModel.updated_at < cutoff,
            ).delete(synchronize_session=False)
            session.commit()
            return deleted
        except Exception:
            session.rollback()
            return 0
        finally:
            session.close()


# Global database instance
db = DatabaseManager()
