"""Local JSONL worker process with bounded waits and deterministic episode configuration."""

import json
import selectors
import subprocess
from contextlib import ExitStack
from pathlib import Path
from typing import Any

# V8 heap ceiling for every worker; about eight workers must fit in the desktop's 7 GB WSL instance.
NODE_HEAP_LIMIT_MB = 1024


def node_command(node: str, worker: Path, *args: str) -> list[str]:
    return [node, f"--max-old-space-size={NODE_HEAP_LIMIT_MB}", str(worker), *args]


def scheduled_episode(versions: list[str], index: int) -> tuple[list[str], int]:
    """Cycle every ordered deck pairing, then switch the learner seat; matches decks.ts."""
    count = len(versions)
    pairing = index % (count * count)
    return [versions[pairing // count], versions[pairing % count]], (index // (count * count)) % 2


def describe(node: str, worker: Path) -> dict[str, Any]:
    if not worker.is_file():
        raise ValueError(f"Build the API first; missing worker: {worker}")
    result = subprocess.run(
        node_command(node, worker, "--describe"),
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return json.loads(result.stdout)


class Episode:
    def __init__(
        self, node: str, worker: Path, config: dict[str, Any], log_path: Path, timeout: float = 30
    ) -> None:
        self.timeout = timeout
        self.pending = bytearray()
        with ExitStack() as resources:
            self.log = resources.enter_context(log_path.open("wb"))
            self.process = subprocess.Popen(
                node_command(node, worker),
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=self.log,
                bufsize=0,
            )
            for stream in (self.process.stdin, self.process.stdout):
                if stream is not None:
                    resources.callback(stream.close)
            resources.callback(self._stop_process)
            self.selector = resources.enter_context(selectors.DefaultSelector())
            self.selector.register(self.process.stdout, selectors.EVENT_READ)
            self.send(config)
            self.resources = resources.pop_all()

    def _stop_process(self) -> None:
        if self.process.poll() is None:
            self.process.kill()
        self.process.wait(timeout=5)

    def send(self, message: dict[str, Any]) -> None:
        if self.process.stdin is None or self.process.poll() is not None:
            raise RuntimeError("Training worker exited before receiving a response")
        self.process.stdin.write((json.dumps(message) + "\n").encode())
        self.process.stdin.flush()

    def receive(self) -> dict[str, Any]:
        while b"\n" not in self.pending:
            if not self.selector.select(self.timeout):
                raise TimeoutError("Training worker did not produce its next decision")
            if self.process.stdout is None:
                raise RuntimeError("Training worker has no stdout")
            chunk = self.process.stdout.read(65536)
            if not chunk:
                raise RuntimeError(
                    f"Training worker closed its output (exit={self.process.poll()})"
                )
            self.pending.extend(chunk)
            if len(self.pending) > 16_000_000:
                raise RuntimeError("Training worker message exceeds 16 MB")
        line, _, rest = self.pending.partition(b"\n")
        self.pending = bytearray(rest)
        message = json.loads(line)
        if not isinstance(message, dict) or "type" not in message:
            raise ValueError("Malformed training worker message")
        return message

    def close(self) -> None:
        self.resources.close()

    def __enter__(self) -> "Episode":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()
