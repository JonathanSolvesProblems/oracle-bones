import os
import tempfile

# Tests never write the committed ledger: point it at a scratch file before oracle is imported.
os.environ.setdefault("ORACLE_LEDGER", os.path.join(tempfile.mkdtemp(prefix="oracle-test-ledger-"), "ledger.json"))
# Nor the committed goldens: recording tests write into a scratch directory.
os.environ.setdefault("ORACLE_GOLDENS", os.path.join(tempfile.mkdtemp(prefix="oracle-test-goldens-"), "goldens"))

import pytest  # noqa: E402

from oracle import fetch, profile, sandbox  # noqa: E402

_docker = None


def docker_ready():
    global _docker
    if _docker is None:
        _docker = sandbox.docker_available()
    return _docker


@pytest.fixture
def live():
    """Skip unless Docker runs and setup has verified the program."""
    if not docker_ready():
        pytest.skip("Docker is not available")
    prof = profile.load()
    try:
        fetch.require_verified(prof)
    except Exception as e:  # setup_required
        pytest.skip(str(e))
    sandbox.ensure_image()
    return prof


def pytest_configure(config):
    config.addinivalue_line("markers", "live: needs Docker and the verified program")


def pytest_collection_modifyitems(config, items):
    """Mark every test that uses the `live` fixture, directly or through another fixture, so
    `-m "not live"` runs only the offline tests."""
    for item in items:
        if "live" in getattr(item, "fixturenames", ()):
            item.add_marker(pytest.mark.live)
