"""Container runtime security checks."""


from docker.models.containers import Container

from src.core.docker_manager import DockerManager
from src.utils.logger import get_logger

logger = get_logger(__name__)


class SecurityCheck:
    """Represents a security check result."""

    def __init__(
        self,
        check_id: str,
        name: str,
        description: str,
        passed: bool,
        severity: str,
        details: str = "",
        recommendation: str = "",
    ):
        self.check_id = check_id
        self.name = name
        self.description = description
        self.passed = passed
        self.severity = severity
        self.details = details
        self.recommendation = recommendation


class ContainerSecurityAuditor:
    """Audits running containers for security issues."""

    def __init__(self, docker_manager: DockerManager | None = None):
        """Initialize security auditor.

        Args:
            docker_manager: Docker manager instance
        """
        self.docker = docker_manager or DockerManager()

    def audit_container(self, container_id: str) -> list[SecurityCheck]:
        """Audit a specific container.

        Args:
            container_id: Container ID or name

        Returns:
            List of security check results
        """
        container = self.docker.get_container(container_id)
        checks = []

        checks.append(self._check_privileged(container))
        checks.append(self._check_root_user(container))
        checks.append(self._check_read_only_rootfs(container))
        checks.append(self._check_capabilities(container))
        checks.append(self._check_resource_limits(container))
        checks.append(self._check_network_mode(container))
        checks.append(self._check_restart_policy(container))
        checks.append(self._check_healthcheck(container))
        checks.append(self._check_pid_mode(container))
        checks.append(self._check_ipc_mode(container))

        passed = sum(1 for c in checks if c.passed)
        logger.info(
            "Container audit complete: {}/{} checks passed",
            passed,
            len(checks),
        )

        return checks

    def audit_all_containers(self) -> dict[str, list[SecurityCheck]]:
        """Audit all running containers.

        Returns:
            Dictionary mapping container names to their security checks
        """
        containers = self.docker.list_containers(running_only=True)
        results = {}

        for container_info in containers:
            try:
                checks = self.audit_container(container_info["name"])
                results[container_info["name"]] = checks
            except Exception as e:
                logger.warning("Failed to audit {}: {}", container_info["name"], str(e))

        return results

    def _check_privileged(self, container: Container) -> SecurityCheck:
        """Check if container is running in privileged mode."""
        privileged = container.attrs.get("HostConfig", {}).get("Privileged", False)

        return SecurityCheck(
            check_id="CS001",
            name="Privileged Container",
            description="Check if container runs in privileged mode",
            passed=not privileged,
            severity="CRITICAL",
            details="Container is running in privileged mode" if privileged else "Container is not privileged",
            recommendation="Remove --privileged flag and use specific capabilities instead" if privileged else "",
        )

    def _check_root_user(self, container: Container) -> SecurityCheck:
        """Check if container is running as root."""
        config = container.attrs.get("Config", {})
        user = config.get("User", "")
        is_root = user == "" or user == "root" or user == "0"

        return SecurityCheck(
            check_id="CS002",
            name="Root User",
            description="Check if container runs as root user",
            passed=not is_root,
            severity="HIGH",
            details=f"Container is running as user: {user or 'root (default)'}" if is_root else f"Container is running as user: {user}",
            recommendation="Add USER instruction to Dockerfile or use --user flag" if is_root else "",
        )

    def _check_read_only_rootfs(self, container: Container) -> SecurityCheck:
        """Check if container has read-only root filesystem."""
        read_only = container.attrs.get("HostConfig", {}).get("ReadonlyRootfs", False)

        return SecurityCheck(
            check_id="CS003",
            name="Read-Only Root Filesystem",
            description="Check if container has read-only root filesystem",
            passed=read_only,
            severity="MEDIUM",
            details="Root filesystem is writable" if not read_only else "Root filesystem is read-only",
            recommendation="Use --read-only flag to prevent filesystem modifications" if not read_only else "",
        )

    def _check_capabilities(self, container: Container) -> SecurityCheck:
        """Check container capabilities."""
        cap_add = container.attrs.get("HostConfig", {}).get("CapAdd", []) or []
        cap_drop = container.attrs.get("HostConfig", {}).get("CapDrop", []) or []

        has_all_caps = "ALL" in cap_add
        has_dangerous_caps = any(cap in cap_add for cap in ["SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE"])
        dropped_all = "ALL" in cap_drop

        passed = dropped_all and not has_all_caps and not has_dangerous_caps

        return SecurityCheck(
            check_id="CS004",
            name="Container Capabilities",
            description="Check container capabilities",
            passed=passed,
            severity="HIGH",
            details=f"Added: {cap_add}, Dropped: {cap_drop}",
            recommendation="Drop all capabilities with --cap-drop ALL and add only required ones" if not passed else "",
        )

    def _check_resource_limits(self, container: Container) -> SecurityCheck:
        """Check if container has resource limits set."""
        host_config = container.attrs.get("HostConfig", {})
        memory_limit = host_config.get("Memory", 0)
        cpu_limit = host_config.get("NanoCpus", 0) or host_config.get("CpuShares", 0)

        has_limits = memory_limit > 0 or cpu_limit > 0

        return SecurityCheck(
            check_id="CS005",
            name="Resource Limits",
            description="Check if container has resource limits",
            passed=has_limits,
            severity="MEDIUM",
            details=f"Memory: {memory_limit or 'unlimited'}, CPU: {cpu_limit or 'unlimited'}",
            recommendation="Set memory and CPU limits with --memory and --cpus flags" if not has_limits else "",
        )

    def _check_network_mode(self, container: Container) -> SecurityCheck:
        """Check container network mode."""
        network_mode = container.attrs.get("HostConfig", {}).get("NetworkMode", "")

        # host network mode is less secure
        is_host_network = network_mode == "host"

        return SecurityCheck(
            check_id="CS006",
            name="Network Mode",
            description="Check container network mode",
            passed=not is_host_network,
            severity="MEDIUM",
            details=f"Network mode: {network_mode}",
            recommendation="Avoid --network=host unless absolutely necessary" if is_host_network else "",
        )

    def _check_restart_policy(self, container: Container) -> SecurityCheck:
        """Check container restart policy."""
        restart_policy = container.attrs.get("HostConfig", {}).get("RestartPolicy", {})
        policy_name = restart_policy.get("Name", "")

        has_policy = policy_name in ["always", "unless-stopped", "on-failure"]

        return SecurityCheck(
            check_id="CS007",
            name="Restart Policy",
            description="Check if container has restart policy",
            passed=has_policy,
            severity="LOW",
            details=f"Restart policy: {policy_name or 'none'}",
            recommendation="Set restart policy with --restart=unless-stopped" if not has_policy else "",
        )

    def _check_healthcheck(self, container: Container) -> SecurityCheck:
        """Check if container has healthcheck configured."""
        healthcheck = container.attrs.get("Config", {}).get("Healthcheck")
        if not healthcheck:
            healthcheck = container.attrs.get("State", {}).get("Health")

        has_healthcheck = healthcheck is not None

        return SecurityCheck(
            check_id="CS008",
            name="Health Check",
            description="Check if container has health check configured",
            passed=has_healthcheck,
            severity="LOW",
            details="No health check configured" if not has_healthcheck else "Health check is configured",
            recommendation="Add HEALTHCHECK instruction to Dockerfile" if not has_healthcheck else "",
        )

    def _check_pid_mode(self, container: Container) -> SecurityCheck:
        """Check PID namespace mode."""
        pid_mode = container.attrs.get("HostConfig", {}).get("PidMode", "")

        # host PID namespace is less secure
        is_host_pid = pid_mode == "host"

        return SecurityCheck(
            check_id="CS009",
            name="PID Namespace",
            description="Check PID namespace mode",
            passed=not is_host_pid,
            severity="HIGH",
            details=f"PID mode: {pid_mode or 'private'}",
            recommendation="Avoid --pid=host to prevent process visibility" if is_host_pid else "",
        )

    def _check_ipc_mode(self, container: Container) -> SecurityCheck:
        """Check IPC namespace mode."""
        ipc_mode = container.attrs.get("HostConfig", {}).get("IpcMode", "")

        # host IPC namespace is less secure
        is_host_ipc = ipc_mode == "host"

        return SecurityCheck(
            check_id="CS010",
            name="IPC Namespace",
            description="Check IPC namespace mode",
            passed=not is_host_ipc,
            severity="HIGH",
            details=f"IPC mode: {ipc_mode or 'private'}",
            recommendation="Avoid --ipc=host to prevent shared memory access" if is_host_ipc else "",
        )
