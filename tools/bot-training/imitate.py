"""Behavior cloning with episode-separated validation and the same masked policy as PPO."""

import copy
import hashlib
import json
import math
from pathlib import Path
from typing import Any, TypedDict

import click
import numpy as np
import torch
from numpy.typing import NDArray

from adaptation import VocabularyAdaptation
from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy

type Sample = tuple[NDArray[np.float32], NDArray[np.float32], int]
type TensorBatch = tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]
COMPOUND_ACTIONS = frozenset({"linkCard", "appFusion", "dnaDigivolve"})


class ActionMetrics(TypedDict):
    accuracy: float
    loss: float
    decisions: int


class Metrics(ActionMetrics):
    byActionType: dict[str, ActionMetrics]


def cache_demonstrations(
    dataset: Path, output: Path, encoder: FeatureEncoder
) -> tuple[list[Sample], list[Sample], dict[str, str], dict[str, list[str]]]:
    """Keep encoded features on disk; only each optimization batch needs resident RAM."""
    source_hashes = {
        "config.json": hashlib.sha256((dataset / "config.json").read_bytes()).hexdigest()
    }
    split: dict[str, list[str]] = {"training": [], "validation": []}
    references: dict[str, list[tuple[int, int, int]]] = {"training": [], "validation": []}
    action_types: dict[str, list[str]] = {"training": [], "validation": []}
    cache_path = output / "encoded-samples.f32"
    offset = 0
    with cache_path.open("wb") as cache:
        for path in sorted(dataset.glob("episode-*.jsonl")):
            index = int(path.stem.split("-")[-1])
            name = "validation" if index % 5 == 0 else "training"
            split[name].append(path.name)
            content = path.read_bytes()
            source_hashes[path.name] = hashlib.sha256(content).hexdigest()
            for line in content.decode().splitlines():
                row = json.loads(line)
                if not row["supervised"]:
                    continue
                state, actions = encoder.encode(row["window"])
                if len(actions) <= 1:
                    continue
                state.tofile(cache)
                actions.tofile(cache)
                references[name].append((offset, len(actions), row["action"]))
                action_types[name].append(row["window"]["actions"][row["action"]]["intent"]["type"])
                offset += state.size + actions.size
    if not references["training"] or not references["validation"]:
        raise click.ClickException("Need completed episodes in both training and validation folds")
    (output / "sample-types.json").write_text(json.dumps(action_types), encoding="utf-8")
    features = np.memmap(cache_path, dtype=np.float32, mode="r")

    def samples(name: str) -> list[Sample]:
        result: list[Sample] = []
        for start, count, label in references[name]:
            end = start + encoder.state_dim
            actions_end = end + count * encoder.action_dim
            result.append(
                (
                    features[start:end],
                    features[end:actions_end].reshape(count, encoder.action_dim),
                    label,
                )
            )
        return result

    return samples("training"), samples("validation"), source_hashes, split


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


def metrics(
    model: CandidatePolicy,
    samples: list[Sample],
    device: torch.device,
    action_types: list[str] | None = None,
) -> Metrics:
    if action_types is not None and len(action_types) != len(samples):
        raise ValueError("Action types must match the cached sample order")
    correct = 0
    loss = 0.0
    grouped: dict[str, dict[str, float | int]] = {}
    with torch.no_grad():
        for start in range(0, len(samples), 128):
            states, actions, mask, labels = batch_tensors(samples[start : start + 128], device)
            logits, _ = model(states, actions, mask)
            losses = torch.nn.functional.cross_entropy(logits, labels, reduction="none")
            matches = logits.argmax(-1) == labels
            loss += float(losses.sum())
            correct += int(matches.sum())
            if action_types is not None:
                for kind, match, item_loss in zip(
                    action_types[start : start + 128],
                    matches.cpu().tolist(),
                    losses.cpu().tolist(),
                    strict=True,
                ):
                    row = grouped.setdefault(kind, {"correct": 0, "loss": 0.0, "decisions": 0})
                    row["correct"] += match
                    row["loss"] += item_loss
                    row["decisions"] += 1
    return {
        "accuracy": correct / len(samples),
        "loss": loss / len(samples),
        "decisions": len(samples),
        "byActionType": {
            kind: {
                "accuracy": row["correct"] / row["decisions"],
                "loss": row["loss"] / row["decisions"],
                "decisions": int(row["decisions"]),
            }
            for kind, row in grouped.items()
        },
    }


def training_setup(
    encoder: FeatureEncoder,
    metadata: dict[str, Any],
    device: torch.device,
    *,
    checkpoint: Path | None,
    learning_rate: float | None,
    policy_anchor: float,
) -> tuple[CandidatePolicy, torch.optim.Adam, CandidatePolicy | None, dict[str, Any]]:
    if policy_anchor > 0 and checkpoint is None:
        raise click.ClickException("--policy-anchor requires a source checkpoint")
    saved = None
    source: dict[str, Any] = {}
    width = 128
    if checkpoint is not None:
        saved = torch.load(checkpoint, map_location=device, weights_only=True)
        if saved.get("featureVersion") != FEATURE_VERSION or saved.get("metadata") != metadata:
            raise click.ClickException(
                "Checkpoint deck/observation schema differs from the dataset"
            )
        if "optimizer" not in saved:
            raise click.ClickException("Warm-start imitation requires the source Adam state")
        width = saved["model"]["state.0.weight"].shape[0]
        with checkpoint.open("rb") as stream:
            source = {
                "checkpoint": str(checkpoint.resolve()),
                "sha256": hashlib.file_digest(stream, "sha256").hexdigest(),
                "games": saved.get("games"),
                "imitationEpoch": saved.get("imitationEpoch"),
            }
        if "vocabularyMigration" in saved:
            source["vocabularyMigration"] = copy.deepcopy(saved["vocabularyMigration"])
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim, width=width).to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)
    if saved is not None:
        model.load_state_dict(saved["model"])
        optimizer.load_state_dict(saved["optimizer"])
    if learning_rate is not None:
        for group in optimizer.param_groups:
            group["lr"] = learning_rate
    anchor = copy.deepcopy(model).eval().requires_grad_(False) if policy_anchor > 0 else None
    return model, optimizer, anchor, source


def policy_divergence(
    logits: torch.Tensor,
    reference_logits: torch.Tensor,
    mask: torch.Tensor,
    anchored: torch.Tensor | None = None,
) -> torch.Tensor:
    """KL(reference || learner), excluding padded candidates before subtraction."""
    current = torch.log_softmax(logits.masked_fill(~mask, -torch.inf), dim=-1)
    reference = torch.log_softmax(reference_logits.masked_fill(~mask, -torch.inf), dim=-1)
    probabilities = reference.exp()
    current = current.masked_fill(~mask, 0)
    reference = reference.masked_fill(~mask, 0)
    divergences = (probabilities * (reference - current)).sum(-1)
    if anchored is not None:
        divergences = divergences * anchored
    return divergences.mean()


def epoch_order(
    action_types: list[str], rng: np.random.Generator, compound_share: float
) -> tuple[NDArray[np.int64], NDArray[np.bool_]]:
    """Keep every original training sample; add only compound examples from that fold."""
    order = rng.permutation(len(action_types))
    if compound_share == 0:
        return order, np.ones(len(order), dtype=np.bool_)
    compounds = np.array(
        [index for index, kind in enumerate(action_types) if kind in COMPOUND_ACTIONS],
        dtype=np.int64,
    )
    if not len(compounds):
        raise click.ClickException("--compound-share requires training-fold compound labels")
    extra = max(
        0,
        math.ceil((compound_share * len(order) - len(compounds)) / (1 - compound_share)),
    )
    order = np.concatenate((order, rng.choice(compounds, size=extra, replace=True)))
    rng.shuffle(order)
    # These declarations are the behavior being introduced. Anchoring them to a source
    # that rejects every such label would directly oppose that learning objective.
    anchored = np.array([action_types[index] not in COMPOUND_ACTIONS for index in order])
    return order, anchored


def save_checkpoint(output: Path, saved: dict[str, Any], *, epoch: int, selected: bool) -> None:
    temporary = output / "checkpoint.tmp"
    torch.save(saved, temporary)
    snapshot = output / f"checkpoint-epoch-{epoch:03d}.pt"
    temporary.replace(snapshot)
    if selected:
        with snapshot.open("rb") as source, (output / "checkpoint.tmp").open("wb") as target:
            target.write(source.read())
        (output / "checkpoint.tmp").replace(output / "checkpoint.pt")


@click.command()
@click.option("--dataset", type=click.Path(path_type=Path, exists=True), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=True)
@click.option("--epochs", default=20, type=click.IntRange(min=1))
@click.option("--seed", default=420000, type=int)
@click.option("--device", default="cpu", type=click.Choice(["cpu", "cuda"]))
@click.option("--checkpoint", type=click.Path(path_type=Path, exists=True, dir_okay=False))
@click.option("--learning-rate", type=click.FloatRange(min=0, min_open=True), default=None)
@click.option("--policy-anchor", type=click.FloatRange(min=0), default=0.0)
@click.option(
    "--compound-share",
    type=click.FloatRange(min=0, max=1, max_open=True),
    default=0.0,
    help="Reach at least this training fraction with compound resamples; anchor other types.",
)
@click.option(
    "--compound-only",
    is_flag=True,
    help="Teach compound labels while retaining the source policy on all other label types.",
)
@click.option(
    "--new-card-columns-only",
    is_flag=True,
    help="Learn only identities added by a saved vocabulary migration; retain other weights/moments.",
)
def main(
    dataset: Path,
    output: Path,
    epochs: int,
    seed: int,
    device: str,
    checkpoint: Path | None,
    learning_rate: float | None,
    policy_anchor: float,
    compound_share: float,
    compound_only: bool,
    new_card_columns_only: bool,
) -> None:
    if output.exists() and any(output.iterdir()):
        raise click.ClickException("Use a new output directory")
    if (
        not np.isfinite(policy_anchor)
        or not np.isfinite(compound_share)
        or (learning_rate is not None and not np.isfinite(learning_rate))
    ):
        raise click.ClickException("Learning rate, policy anchor and compound share must be finite")
    if compound_only and (checkpoint is None or policy_anchor <= 0 or compound_share <= 0):
        raise click.ClickException(
            "--compound-only requires --checkpoint, positive --policy-anchor and --compound-share"
        )
    manifest = json.loads((dataset / "config.json").read_text(encoding="utf-8"))
    metadata = manifest["metadata"]
    if manifest["featureVersion"] != FEATURE_VERSION or metadata["statusFields"] != list(
        STATUS_FIELDS
    ):
        raise click.ClickException("Dataset feature schema differs from this encoder")
    encoder = FeatureEncoder(metadata["cardIds"], metadata["keywords"])
    torch.manual_seed(seed)
    torch.set_num_threads(2)
    rng = np.random.default_rng(seed)
    target = torch.device(device)
    model, optimizer, anchor, source = training_setup(
        encoder,
        metadata,
        target,
        checkpoint=checkpoint,
        learning_rate=learning_rate,
        policy_anchor=policy_anchor,
    )
    adaptation = None
    if new_card_columns_only:
        migration = source.get("vocabularyMigration")
        if migration is None or "sourceCardIds" not in migration:
            raise click.ClickException("--new-card-columns-only requires a migrated checkpoint")
        try:
            adaptation = VocabularyAdaptation(model, optimizer, encoder, migration["sourceCardIds"])
        except ValueError as error:
            raise click.ClickException(str(error)) from error
    output.mkdir(parents=True, exist_ok=True)
    training, validation, source_hashes, split = cache_demonstrations(dataset, output, encoder)
    action_types = json.loads((output / "sample-types.json").read_text(encoding="utf-8"))
    config = {
        "dataset": str(dataset.resolve()),
        "sourceHashes": source_hashes,
        "seed": seed,
        "epochs": epochs,
        "split": split,
        "metadata": metadata,
        "featureVersion": FEATURE_VERSION,
        "sourceCheckpoint": source,
        "learningRate": optimizer.param_groups[0]["lr"],
        "learningRateOverride": learning_rate,
        "policyAnchor": policy_anchor,
        "compoundShare": compound_share,
        "compoundPolicyAnchor": 0 if compound_share > 0 else policy_anchor,
        "teacherLossScope": "compound" if compound_only else "all",
        "newCardColumnsOnly": new_card_columns_only,
        "adaptedCardIds": adaptation.added_card_ids if adaptation is not None else [],
        "trainableIdentityParameters": (
            adaptation.trainable_identity_parameters if adaptation is not None else None
        ),
        "torchVersion": str(torch.__version__),
        "device": device,
        "encodedCacheBytes": (output / "encoded-samples.f32").stat().st_size,
        "implementationHashes": {
            name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
            for name in ["imitate.py", "features.py", "model.py", "adaptation.py", "migrate.py"]
        },
    }
    (output / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    history = [
        {
            "epoch": 0,
            "training": metrics(model, training, target, action_types["training"]),
            "validation": metrics(model, validation, target, action_types["validation"]),
        }
    ]
    best_loss = history[0]["validation"]["loss"]
    updates = 0
    initial = [parameter.detach().cpu().clone() for parameter in model.parameters()]

    def checkpoint_state(epoch: int) -> dict[str, Any]:
        saved = {
            "model": model.state_dict(),
            "optimizer": optimizer.state_dict(),
            "metadata": metadata,
            "featureVersion": FEATURE_VERSION,
            "games": len(split["training"]),
            "seed": seed,
            "imitationEpoch": epoch,
            "imitationUpdates": updates,
            "imitationSource": source,
        }
        if "vocabularyMigration" in source:
            saved["vocabularyMigration"] = source["vocabularyMigration"]
        return saved

    save_checkpoint(output, checkpoint_state(0), epoch=0, selected=True)
    (output / "results.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    click.echo(json.dumps(history[0]))
    for epoch in range(epochs):
        order, anchored = epoch_order(action_types["training"], rng, compound_share)
        for start in range(0, len(order), 128):
            samples = [training[index] for index in order[start : start + 128]]
            states, actions, mask, labels = batch_tensors(samples, target)
            logits, _ = model(states, actions, mask)
            anchored_batch = torch.from_numpy(anchored[start : start + 128]).to(target)
            teacher_losses = torch.nn.functional.cross_entropy(logits, labels, reduction="none")
            if compound_only:
                teacher_losses = teacher_losses * ~anchored_batch
            loss = teacher_losses.mean()
            if anchor is not None:
                with torch.no_grad():
                    reference, _ = anchor(states, actions, mask)
                loss = loss + policy_anchor * policy_divergence(
                    logits,
                    reference,
                    mask,
                    anchored_batch,
                )
            if not torch.isfinite(loss):
                raise RuntimeError("Nonfinite imitation loss")
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 0.5, error_if_nonfinite=True)
            optimizer.step()
            if adaptation is not None:
                adaptation.restore_existing_columns(optimizer)
            updates += 1
        record = {
            "epoch": epoch + 1,
            "training": metrics(model, training, target, action_types["training"]),
            "validation": metrics(model, validation, target, action_types["validation"]),
            "updates": updates,
            "trainingSamples": len(order),
            "unanchoredSamples": int((~anchored).sum()),
            "parameterChangeNorm": float(
                torch.sqrt(
                    sum(
                        (parameter.detach().cpu() - original).square().sum()
                        for parameter, original in zip(model.parameters(), initial, strict=True)
                    )
                )
            ),
        }
        history.append(record)
        selected = record["validation"]["loss"] < best_loss
        if selected:
            best_loss = record["validation"]["loss"]
        save_checkpoint(output, checkpoint_state(epoch + 1), epoch=epoch + 1, selected=selected)
        (output / "results.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
        click.echo(json.dumps(record))


if __name__ == "__main__":
    main()
