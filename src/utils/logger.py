"""Logging configuration for DockerVulnManager."""

import sys
from pathlib import Path

from loguru import logger

from src.config.settings import settings


def setup_logging(
    log_file: Path | None = None,
    verbose: bool = False,
) -> None:
    """Configure application logging.

    Args:
        log_file: Optional path to log file
        verbose: Enable verbose (DEBUG) logging
    """
    # Remove default handler
    logger.remove()

    # Set log level
    log_level = "DEBUG" if verbose or settings.debug else "INFO"

    # Console handler with rich formatting
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
    )

    # File handler (if specified)
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_file,
            level="DEBUG",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            rotation="10 MB",
            retention="30 days",
        )

    logger.info("Logging initialized at level: {}", log_level)


def get_logger(name: str):
    """Get a logger instance with the given name.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    return logger.bind(name=name)
