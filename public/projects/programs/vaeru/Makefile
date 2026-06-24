.PHONY: test demo init status clean

init:
	PYTHONPATH=src python3 -m vaeru init

demo:
	PYTHONPATH=src python3 -m vaeru demo

status:
	PYTHONPATH=src python3 -m vaeru status

test:
	PYTHONPATH=src python3 -m unittest discover -s tests -v

clean:
	rm -rf .vaeru .pytest_cache .mypy_cache .ruff_cache
	find . -name '__pycache__' -type d -prune -exec rm -rf {} +
