"""Local JSONL worker process with bounded waits and deterministic episode configuration."""

import json
import selectors
import subprocess
from contextlib import ExitStack
from pathlib import Path
from typing import Any


def scheduled_episode(versions: list[str], index: int) -> tuple[list[str], int]:
    """Balance learner deck/seat each 2N games, then rotate opponents; matches decks.ts."""
    count = len(versions)
    learner = index % count
    opponent = (learner + index // (2 * count)) % count
    seat = (index // count) % 2
    pair = [versions[learner], versions[opponent]]
    return pair if seat == 0 else pair[::-1], seat


def describe(node: str, worker: Path) -> dict[str, Any]:
    return _describe(node, worker, "--describe")


def _describe(node: str, worker: Path, flag: str) -> dict[str, Any]:
    if not worker.is_file():
        raise ValueError(f"Build the API first; missing worker: {worker}")
    result = subprocess.run(
        [node, str(worker), flag], check=True, capture_output=True, text=True, timeout=30
    )
    return json.loads(result.stdout)


def episode_scope(
    node: str, worker: Path, metadata: dict[str, Any], curriculum: bool
) -> dict[str, Any]:
    """Record additional recipe pins separately so the checkpoint encoder scope stays compatible."""
    if not curriculum:
        return metadata
    scope = _describe(node, worker, "--describe-curriculum")
    decks = scope.get("decks")
    if (
        scope.get("schemaVersion") != 1
        or scope.get("engineSha256") != metadata["engineSha256"]
        or not isinstance(decks, list)
        or decks[: len(metadata["decks"])] != metadata["decks"]
        or len(decks) <= len(metadata["decks"])
    ):
        raise ValueError("Curriculum manifest differs from this worker's catalog or runtime")
    versions = []
    for deck in decks:
        if not isinstance(deck, dict):
            raise ValueError("Malformed curriculum recipe")
        version = deck.get("version")
        digest = deck.get("sha256")
        if (
            not isinstance(version, str)
            or not version
            or not isinstance(deck.get("name"), str)
            or not isinstance(digest, str)
            or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
            or version in versions
        ):
            raise ValueError("Curriculum requires unique versions and SHA-256 recipe pins")
        versions.append(version)
    return scope


def verify_recipe_pins(ready: dict[str, Any], config: dict[str, Any]) -> None:
    """Check the dealt recipes against the run's recorded manifest, including seat order."""
    if "deckPins" in config and ready.get("decks") != config["deckPins"]:
        raise RuntimeError("Worker dealt recipes that differ from the recorded manifest")


class Episode:
    def __init__(
        self, node: str, worker: Path, config: dict[str, Any], log_path: Path, timeout: float = 30
    ) -> None:
        self.timeout = timeout
        self.pending = bytearray()
        with ExitStack() as resources:
            self.log = resources.enter_context(log_path.open("wb"))
            self.process = subprocess.Popen(
                [node, str(worker)],
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
