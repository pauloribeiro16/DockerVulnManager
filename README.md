# 🛡️ DockerVulnManager

**Comprehensive Docker vulnerability scanning and security hardening tool**

A powerful CLI tool to scan, analyze, and manage vulnerabilities in Docker images and containers. Built with security, resilience, and developer experience in mind.

---

## 🎯 Features

### 🔍 Vulnerability Scanning
- **Multi-Engine Support** - Trivy integration (Grype coming soon)
- **Fast Scanning** - Scan any Docker image in seconds
- **CVE Detection** - Identifies known vulnerabilities with CVSS scores
- **Bulk Scanning** - Scan all local images at once

### 📊 Analysis & Reporting
- **Risk Scoring** - 0-100 risk score per image
- **Severity Classification** - CRITICAL, HIGH, MEDIUM, LOW, INFO
- **Multiple Export Formats** - JSON, CSV, HTML, Markdown
- **Historical Tracking** - Track vulnerability trends over time

### 🛡️ Security Hardening
- **CIS Docker Benchmark** - Automated compliance checks
- **Dockerfile Analysis** - Detect security anti-patterns
- **Runtime Security** - Detect privileged containers, root users
- **Resilience Checks** - Validate restart policies, health checks

### 📈 Trend Analysis
- **Vulnerability Tracking** - New, fixed, unchanged over time
- **Cross-Image Analysis** - Find common vulnerable packages
- **Comparative Reports** - Compare images side-by-side

---

## 🚀 Quick Start

### Prerequisites

```bash
# Python 3.10+
python --version

# Docker (for scanning local images)
docker --version

# Trivy (vulnerability scanner)
# Install: https://aquasecurity.github.io/trivy/
```

### Installation

```bash
# Clone the repository
git clone https://github.com/pauloribeiro16/DockerVulnManager.git
cd DockerVulnManager

# Install using shared virtual environment
pip install -e .

# Or with development dependencies
pip install -e ".[dev]"
```

### Basic Usage

```bash
# Scan a single image
dockervuln scan nginx:latest

# Scan all local Docker images
dockervuln scan-all

# View scan history
dockervuln list

# Generate HTML report
dockervuln report nginx:latest --format html

# Compare two images
dockervuln compare nginx:1.21 nginx:1.22

# Check security hardening
dockervuln harden --check

# Analyze a Dockerfile
dockervuln analyze Dockerfile

# View status
dockervuln status
```

---

## 📖 Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `scan` | Scan a Docker image | `dockervuln scan python:3.11-slim` |
| `scan-all` | Scan all local images | `dockervuln scan-all` |
| `list` | List scan history | `dockervuln list --limit 10` |
| `report` | Generate vulnerability report | `dockervuln report nginx:latest --format html` |
| `history` | Show scan history for image | `dockervuln history nginx` |
| `compare` | Compare two images | `dockervuln compare img1:tag img2:tag` |
| `harden` | Run security hardening checks | `dockervuln harden --check` |
| `analyze` | Analyze Dockerfile security | `dockervuln analyze ./Dockerfile` |
| `status` | Show app status | `dockervuln status` |

---

## 🏗️ Architecture

```
DockerVulnManager/
├── src/
│   ├── cli/           # CLI commands (Click)
│   ├── core/          # Scanner orchestration
│   ├── models/        # Data models (Pydantic)
│   ├── database/      # SQLite storage (SQLAlchemy)
│   ├── utils/         # Logging, helpers
│   └── config/        # Settings management
├── tests/             # Pytest test suite
├── config/            # Configuration files
├── scripts/           # Helper scripts
├── docs/              # Documentation
└── data/              # Sample data, templates
```

---

## 🔧 Configuration

Configure via environment variables or `.env` file:

```bash
# Scanner settings
SCANNER_TRIVY_PATH=trivy
SCANNER_TIMEOUT=300
SCANNER_CACHE_ENABLED=true

# Database
DB_PATH=~/.dockervuln/vulns.db

# Security checks
SECURITY_CIS_BENCHMARK_VERSION=1.6.0
SECURITY_CHECK_ROOT_USER=true
SECURITY_MIN_SEVERITY=MEDIUM
```

---

## 📊 Example Output

### Scan Result
```
Scanning nginx:latest...
Found 23 vulnerabilities:
  🔴 CRITICAL: 2
  🟠 HIGH:     5
  🟡 MEDIUM:   10
  🔵 LOW:      4
  ⚪ INFO:     2

Risk Score: 67/100

Top Critical:
  CVE-2024-1234 | OpenSSL buffer overflow | CVSS 9.8
  CVE-2024-5678 | Glibc privilege escalation | CVSS 8.5
```

### Security Hardening Report
```
Running CIS Docker Benchmark checks...

✅ PASS: Docker daemon TLS enabled
⚠️  WARN: Container running as root (nginx:latest)
❌ FAIL: Privileged container detected (test-container)

Security Score: 72/100
```

---

## 🧪 Development

### Run Tests
```bash
# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=src --cov-report=html

# Run specific phase tests
pytest tests/test_phase1.py -v
```

### Code Quality
```bash
# Linting
ruff check src/

# Type checking
mypy src/

# Code formatting
black src/
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/YOUR_USERNAME/DockerVulnManager/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/DockerVulnManager/discussions)
- 📧 **Contact**: [Your Email]

---

**Built with ❤️ for the cybersecurity community**
