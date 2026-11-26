"""resurrection-power task 4.1: when Docker is missing or stopped, a tool that needs it returns one
plain message saying which, starts no other process and writes no file (Requirement 8.1)."""

import subprocess

import pytest

from oracle import sandbox
from oracle.tests.test_power_workspace import Client, no_workspace  # noqa: F401  (fixture)

STOPPED = ("error during connect: Get \"http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.47/version\": "
           "open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.")


@pytest.fixture
def fake_docker(monkeypatch):
    """Stand in for every process start. state is 'missing' or 'stopped'."""
    calls = []
    state = {"now": "missing"}

    def run(args, **kw):
        calls.append(list(args))
        if args[:2] == ["docker", "version"] and state["now"] == "missing":
            raise FileNotFoundError(2, "The system cannot find the file specified")
        if args[:2] == ["docker", "version"]:
            return subprocess.CompletedProcess(args, 1, "Client: 27.3.1\n", STOPPED)
        raise AssertionError("a second process was started: %s" % args)

    def popen(args, **kw):
        calls.append(list(args))
        raise AssertionError("a process was started: %s" % args)

    monkeypatch.setattr(subprocess, "run", run)
    monkeypatch.setattr(subprocess, "Popen", popen)
    return calls, state


@pytest.mark.parametrize("state,words", [("missing", "not installed"), ("stopped", "not running")])
@pytest.mark.parametrize("tool,args", [("boot_target", {}),
                                       ("run_case", {"mode": "normal_depth", "shape": "trapezoid", "inputs": {}}),
                                       ("run_batch", {"seed": 1, "count": 1})])
def test_docker_problems_get_one_message(no_workspace, tmp_path, fake_docker, state, words, tool, args):
    calls, s = fake_docker
    s["now"] = state
    c = Client()
    assert c.tool("set_workspace", path=str(tmp_path))["workspace"]
    out = c.tool(tool, **args)
    assert out["error"]["category"] == "docker_unavailable"
    assert words in out["error"]["message"]
    assert [a[:2] for a in calls] == [["docker", "version"]]
    assert c.made == [] and list(tmp_path.iterdir()) == []


def test_the_check_names_each_case(monkeypatch, fake_docker):
    calls, s = fake_docker
    for state, words in (("missing", "not installed"), ("stopped", "installed but not running")):
        s["now"] = state
        with pytest.raises(sandbox.OracleError) as e:
            sandbox.docker_check()
        assert words in e.value.message
