"""Local JSONL checkpoint scorer. The engine supplies the complete legal candidate list."""

import hashlib
import io
import json
import sys
from pathlib import Path
from typing import Any, BinaryIO, TextIO

import click
import torch

from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy

PROTOCOL_VERSION = 1
MAX_FRAME_BYTES = 16 * 1024 * 1024


class CheckpointScorer:
    def __init__(self, checkpoint: Path, device: str) -> None:
        self.device = torch.device(device)
        contents = checkpoint.read_bytes()
        saved = torch.load(io.BytesIO(contents), map_location=self.device, weights_only=True)
        if saved["featureVersion"] != FEATURE_VERSION:
            raise ValueError("Checkpoint feature version differs from this encoder")
        self.metadata: dict[str, Any] = saved["metadata"]
        if self.metadata["statusFields"] != list(STATUS_FIELDS):
            raise ValueError("Checkpoint public-status schema differs from this encoder")
        self.encoder = FeatureEncoder(self.metadata["cardIds"], self.metadata["keywords"])
        self.model = CandidatePolicy(self.encoder.state_dim, self.encoder.action_dim).to(
            self.device
        )
        self.model.load_state_dict(saved["model"])
        self.model.eval()
        if any(not torch.isfinite(parameter).all().item() for parameter in self.model.parameters()):
            raise ValueError("Checkpoint contains nonfinite parameters")
        self.checkpoint_sha256 = hashlib.sha256(contents).hexdigest()

    def choose(self, window: dict[str, Any]) -> int:
        if not isinstance(window.get("actions"), list) or not window["actions"]:
            raise ValueError("Expected a nonempty legal candidate list")
        state, actions = self.encoder.encode(window)
        with torch.inference_mode():
            logits, _ = self.model(
                torch.from_numpy(state[None]).to(self.device),
                torch.from_numpy(actions[None]).to(self.device),
                torch.ones((1, len(actions)), dtype=torch.bool, device=self.device),
            )
            if not torch.isfinite(logits).all().item():
                raise ValueError("Model produced nonfinite candidate scores")
            return int(logits.argmax(dim=-1).item())


def serve(scorer: CheckpointScorer, source: BinaryIO, destination: TextIO) -> None:
    def send(message: dict[str, Any]) -> None:
        destination.write(json.dumps(message, allow_nan=False) + "\n")
        destination.flush()

    send(
        {
            "type": "ready",
            "protocolVersion": PROTOCOL_VERSION,
            "featureVersion": FEATURE_VERSION,
            "metadata": scorer.metadata,
            "checkpointSha256": scorer.checkpoint_sha256,
        }
    )
    while line := source.readline(MAX_FRAME_BYTES + 1):
        if len(line) > MAX_FRAME_BYTES or not line.endswith(b"\n"):
            raise ValueError("Oversized or incomplete inference frame")
        request = json.loads(line)
        if (
            not isinstance(request, dict)
            or request.get("type") != "choose"
            or type(request.get("requestId")) is not int
            or request["requestId"] < 1
            or not isinstance(request.get("window"), dict)
        ):
            raise ValueError("Invalid inference request")
        send(
            {
                "type": "choice",
                "requestId": request["requestId"],
                "action": scorer.choose(request["window"]),
            }
        )


@click.command()
@click.option(
    "--checkpoint", type=click.Path(path_type=Path, exists=True, dir_okay=False), required=True
)
@click.option("--device", default="cpu", type=click.Choice(["cpu", "cuda"]))
def main(checkpoint: Path, device: str) -> None:
    torch.set_num_threads(2)
    serve(CheckpointScorer(checkpoint, device), sys.stdin.buffer, sys.stdout)


if __name__ == "__main__":
    main()
