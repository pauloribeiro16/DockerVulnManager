"""Docker integration for listing and managing images and containers."""


import docker
from docker.errors import DockerException, ImageNotFound, NotFound
from docker.models.containers import Container
from docker.models.images import Image

from src.exceptions import DockerConnectionError, ImageNotFoundError
from src.utils.logger import get_logger

logger = get_logger(__name__)


class DockerManager:
    """Manages Docker daemon connections and operations."""

    def __init__(self):
        """Initialize Docker client."""
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Connected to Docker daemon")
        except DockerException as e:
            raise DockerConnectionError(f"Cannot connect to Docker daemon: {e}")

    def list_images(self) -> list[dict]:
        """List all local Docker images.

        Returns:
            List of image dictionaries with metadata
        """
        try:
            images = self.client.images.list()
            result = []
            for img in images:
                result.append({
                    "id": img.short_id,
                    "tags": img.tags if img.tags else ["<none>"],
                    "created": img.attrs.get("Created", ""),
                    "size": img.attrs.get("Size", 0),
                })
            logger.info("Found {} local images", len(result))
            return result
        except DockerException as e:
            raise DockerConnectionError(f"Failed to list images: {e}")

    def get_image(self, image_name: str) -> Image:
        """Get a Docker image by name.

        Args:
            image_name: Image name (e.g., 'nginx:latest')

        Returns:
            Docker Image object
        """
        try:
            image = self.client.images.get(image_name)
            logger.info("Found image: {}", image_name)
            return image
        except ImageNotFound:
            raise ImageNotFoundError(image_name)
        except DockerException as e:
            raise DockerConnectionError(f"Failed to get image: {e}")

    def pull_image(self, image_name: str) -> Image:
        """Pull a Docker image.

        Args:
            image_name: Image name to pull

        Returns:
            Pulled Docker Image object
        """
        try:
            logger.info("Pulling image: {}", image_name)
            image = self.client.images.pull(image_name)
            logger.info("Successfully pulled: {}", image_name)
            return image
        except DockerException as e:
            raise DockerConnectionError(f"Failed to pull image: {e}")

    def list_containers(self, running_only: bool = True) -> list[dict]:
        """List Docker containers.

        Args:
            running_only: If True, only list running containers

        Returns:
            List of container dictionaries with metadata
        """
        try:
            containers = self.client.containers.list(all=not running_only)
            result = []
            for container in containers:
                result.append({
                    "id": container.short_id,
                    "name": container.name,
                    "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                    "status": container.status,
                    "created": container.attrs.get("Created", ""),
                })
            logger.info("Found {} containers", len(result))
            return result
        except DockerException as e:
            raise DockerConnectionError(f"Failed to list containers: {e}")

    def get_container(self, container_id: str) -> Container:
        """Get a Docker container by ID or name.

        Args:
            container_id: Container ID or name

        Returns:
            Docker Container object
        """
        try:
            container = self.client.containers.get(container_id)
            logger.info("Found container: {}", container_id)
            return container
        except NotFound:
            raise ImageNotFoundError(f"Container not found: {container_id}")
        except DockerException as e:
            raise DockerConnectionError(f"Failed to get container: {e}")

    def parse_image_name(self, image_name: str) -> tuple[str, str]:
        """Parse image name into name and tag.

        Args:
            image_name: Full image name (e.g., 'nginx:latest')

        Returns:
            Tuple of (name, tag)
        """
        if ":" in image_name:
            name, tag = image_name.rsplit(":", 1)
        else:
            name = image_name
            tag = "latest"
        return name, tag
