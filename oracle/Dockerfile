# Oracle runner image. emu2 is built from a pinned commit and runs as its own executable.
# Nothing of the dead program is in the image: it arrives in the per-case temp drive.
#
# Build (from the repository root):
#   docker build -f oracle/Dockerfile --build-arg EMU2_COMMIT=<sha> -t oracle-bones-runner:<sha12> oracle
# oracle/sandbox.py builds it with the commit from oracle/harness.json.

FROM debian:bookworm-slim AS build
ARG EMU2_REPO=https://github.com/dmsc/emu2
ARG EMU2_COMMIT
RUN test -n "$EMU2_COMMIT" \
 && apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates git gcc make libc6-dev \
 && rm -rf /var/lib/apt/lists/*
RUN git clone "$EMU2_REPO" /src/emu2 \
 && cd /src/emu2 \
 && git checkout --detach "$EMU2_COMMIT" \
 && test "$(git rev-parse HEAD)" = "$EMU2_COMMIT" \
 && make \
 && install -m 0755 emu2 /usr/local/bin/emu2

FROM debian:bookworm-slim
ARG EMU2_COMMIT
LABEL oracle-bones.emu2-commit="$EMU2_COMMIT"
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pyte libfaketime \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin oracle
COPY --from=build /usr/local/bin/emu2 /usr/local/bin/emu2
COPY runner/agent.py runner/settle.py /opt/oracle/runner/
ENV EMU2_COMMIT=$EMU2_COMMIT PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
USER 10001:10001
WORKDIR /drive
ENTRYPOINT ["python3", "/opt/oracle/runner/agent.py"]
