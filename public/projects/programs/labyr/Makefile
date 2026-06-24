.PHONY: all build test clean install dev lint format

PYTHON := python3
PIP := pip3
CARGO := cargo
VENV := .venv
VENV_BIN := $(VENV)/bin

all: build

$(VENV)/bin/activate:
	$(PYTHON) -m venv $(VENV)
	$(VENV_BIN)/pip install --upgrade pip
	$(VENV_BIN)/pip install -e ".[dev]"

dev: $(VENV)/bin/activate
	@echo "Development environment ready"
	@echo "Activate with: source $(VENV)/bin/activate"

build-python: $(VENV)/bin/activate
	$(VENV_BIN)/python -m build

build-daemon:
	cd guest/labyr_daemon && $(CARGO) build --release

build: build-python build-daemon

test: $(VENV)/bin/activate
	$(VENV_BIN)/pytest tests/ -v --cov=engine --cov=diegetic --cov-report=term-missing

lint: $(VENV)/bin/activate
	$(VENV_BIN)/ruff check .
	$(VENV_BIN)/mypy engine/ diegetic/ host/

format: $(VENV)/bin/activate
	$(VENV_BIN)/black engine/ diegetic/ host/ tests/
	$(VENV_BIN)/ruff check --fix .

clean:
	rm -rf build/ dist/ *.egg-info
	rm -rf $(VENV)
	rm -rf guest/labyr_daemon/target
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

install: build
	$(PIP) install dist/*.whl

demo: $(VENV)/bin/activate
	$(VENV_BIN)/labyr-engine -d 2 -s 20 20 -e 0.85 --visualize

run-vm: build
	$(VENV_BIN)/labyr launch --memory 512 --cpus 2

build-initramfs:
	cd guest/initramfs && $(MAKE)

security-scan: $(VENV)/bin/activate
	$(VENV_BIN)/pip install safety bandit
	$(VENV_BIN)/safety check
	$(VENV_BIN)/bandit -r engine/ diegetic/ host/

docs: $(VENV)/bin/activate
	$(VENV_BIN)/pip install sphinx
	cd docs && $(VENV_BIN)/sphinx-build -b html . _build/html

help:
	@echo "Labyr Project Makefile"
	@echo "======================"
	@echo ""
	@echo "Targets:"
	@echo "  dev           - Set up development environment"
	@echo "  build         - Build all components"
	@echo "  test          - Run test suite"
	@echo "  lint          - Run linters"
	@echo "  format        - Format code"
	@echo "  clean         - Clean build artifacts"
	@echo "  demo          - Run labyrinth generation demo"
	@echo "  run-vm        - Launch ephemeral VM"
	@echo "  security-scan - Run security checks"
	@echo "  docs          - Build documentation"
