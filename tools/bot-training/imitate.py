"""Behavior cloning with episode-separated validation and the same masked policy as PPO."""

import hashlib
import json
from pathlib import Path
from typing import TypedDict

import click
import numpy as np
import torch
from numpy.typing import NDArray

from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy


type Sample = tuple[NDArray[np.float32], NDArray[np.float32], int]
type TensorBatch = tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]


class Metrics(TypedDict):
    accuracy: float
    loss: float
    decisions: int


def batch_tensors(samples: list[Sample], device: torch.device) -> TensorBatch:
    count = max(len(actions) for _, actions, _ in samples)
    padded = np.zeros((len(samples), count, samples[0][1].shape[1]), dtype=np.float32)
    mask = np.zeros((len(samples), count), dtype=np.bool_)
    for index, (_, actions, _) in enumerate(samples):
        padded[index, : len(actions)] = actions
        mask[index, : len(actions)] = True
    return (
        torch.from_numpy(np.stack([state for state, _, _ in samples])).to(device),
        torch.from_numpy(padded).to(device),
        torch.from_numpy(mask).to(device),
        torch.tensor([label for _, _, label in samples], device=device),
    )


def metrics(model: CandidatePolicy, samples: list[Sample], device: torch.device) -> Metrics:
    correct = 0
    loss = 0.0
    with torch.no_grad():
        for start in range(0, len(samples), 128):
            states, actions, mask, labels = batch_tensors(samples[start : start + 128], device)
            logits, _ = model(states, actions, mask)
            loss += float(torch.nn.functional.cross_entropy(logits, labels, reduction="sum"))
            correct += int((logits.argmax(-1) == labels).sum())
    return {
        "accuracy": correct / len(samples),
        "loss": loss / len(samples),
        "decisions": len(samples),
    }


@click.command()
@click.option("--dataset", type=click.Path(path_type=Path, exists=True), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=True)
@click.option("--epochs", default=20, type=click.IntRange(min=1))
@click.option("--seed", default=420000, type=int)
@click.option("--device", default="cpu", type=click.Choice(["cpu", "cuda"]))
def main(dataset: Path, output: Path, epochs: int, seed: int, device: str) -> None:
    if output.exists() and any(output.iterdir()):
        raise click.ClickException("Use a new output directory")
    output.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((dataset / "config.json").read_text())
    metadata = manifest["metadata"]
    if manifest["featureVersion"] != FEATURE_VERSION or metadata["statusFields"] != list(
        STATUS_FIELDS
    ):
        raise click.ClickException("Dataset feature schema differs from this encoder")
    encoder = FeatureEncoder(metadata["cardIds"], metadata["keywords"])
    training: list[Sample] = []
    validation: list[Sample] = []
    source_hashes = {
        "config.json": hashlib.sha256((dataset / "config.json").read_bytes()).hexdigest()
    }
    split = {"training": [], "validation": []}
    for path in sorted(dataset.glob("episode-*.jsonl")):
        index = int(path.stem.split("-")[-1])
        name = "validation" if index % 5 == 0 else "training"
        split[name].append(path.name)
        destination = validation if name == "validation" else training
        content = path.read_bytes()
        source_hashes[path.name] = hashlib.sha256(content).hexdigest()
        for line in content.decode().splitlines():
            row = json.loads(line)
            if row["supervised"]:
                state, actions = encoder.encode(row["window"])
                if len(actions) > 1:
                    destination.append((state, actions, row["action"]))
    if not training or not validation:
        raise click.ClickException("Need completed episodes in both training and validation folds")
    torch.manual_seed(seed)
    torch.set_num_threads(2)
    rng = np.random.default_rng(seed)
    target = torch.device(device)
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim).to(target)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)
    config = {
        "dataset": str(dataset.resolve()),
        "sourceHashes": source_hashes,
        "seed": seed,
        "epochs": epochs,
        "split": split,
        "metadata": metadata,
        "featureVersion": FEATURE_VERSION,
    }
    (output / "config.json").write_text(json.dumps(config, indent=2))
    history = [
        {
            "epoch": 0,
            "training": metrics(model, training, target),
            "validation": metrics(model, validation, target),
        }
    ]
    best_loss = float("inf")
    for epoch in range(epochs):
        order = rng.permutation(len(training))
        for start in range(0, len(order), 128):
            samples = [training[index] for index in order[start : start + 128]]
            states, actions, mask, labels = batch_tensors(samples, target)
            logits, _ = model(states, actions, mask)
            loss = torch.nn.functional.cross_entropy(logits, labels)
            if not torch.isfinite(loss):
                raise RuntimeError("Nonfinite imitation loss")
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 0.5, error_if_nonfinite=True)
            optimizer.step()
        record = {
            "epoch": epoch + 1,
            "training": metrics(model, training, target),
            "validation": metrics(model, validation, target),
        }
        history.append(record)
        if record["validation"]["loss"] < best_loss:
            best_loss = record["validation"]["loss"]
            temporary = output / "checkpoint.tmp"
            torch.save(
                {
                    "model": model.state_dict(),
                    "optimizer": optimizer.state_dict(),
                    "metadata": metadata,
                    "featureVersion": FEATURE_VERSION,
                    "games": len(split["training"]),
                    "seed": seed,
                    "imitationEpoch": epoch + 1,
                },
                temporary,
            )
            temporary.replace(output / "checkpoint.pt")
        (output / "results.json").write_text(json.dumps(history, indent=2))
        click.echo(json.dumps(record))


if __name__ == "__main__":
    main()
