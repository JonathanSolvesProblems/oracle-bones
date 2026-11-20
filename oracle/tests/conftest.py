import pytest

from oracle import fetch, profile, sandbox

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
