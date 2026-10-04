"""Explicit, zero-update expansion of a checkpoint's card vocabulary."""

import copy
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import click
import torch

from bridge import describe
from features import FEATURE_VERSION, STATUS_FIELDS, FeatureColumn, FeatureEncoder
from model import CandidatePolicy


@dataclass(frozen=True)
class ColumnMap:
    sources: tuple[int, ...]
    added: tuple[bool, ...]


def column_map(source: tuple[FeatureColumn, ...], target: tuple[FeatureColumn, ...]) -> ColumnMap:
    positions = {column: index for index, column in enumerate(source)}
    if len(positions) != len(source) or len(set(target)) != len(target):
        raise ValueError("Ambiguous feature column identities")
    indexes = []
    added = []
    for column in target:
        is_new = column not in positions
        fallback = (column[0], None)
        if is_new and (not column[0].endswith(".identity") or fallback not in positions):
            raise ValueError("Migration may only add card identity columns")
        indexes.append(positions[fallback] if is_new else positions[column])
        added.append(is_new)
    if not set(source).issubset(target):
        raise ValueError("Migration cannot remove feature columns")
    return ColumnMap(tuple(indexes), tuple(added))


def expand_columns(value: torch.Tensor, mapping: ColumnMap, *, moments: bool) -> torch.Tensor:
    result = value.index_select(1, torch.tensor(mapping.sources, device=value.device))
    if moments:
        result[:, torch.tensor(mapping.added, device=value.device)] = 0
    return result


def migrate_checkpoint(saved: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    """Preserve model behavior and old Adam state; new identities inherit unknown weights."""
    if saved.get("featureVersion") != FEATURE_VERSION:
        raise ValueError("Checkpoint feature version differs from this encoder")
    original = saved["metadata"]
    expected = {
        **original,
        "engineSha256": metadata["engineSha256"],
        "cardIds": metadata["cardIds"],
    }
    if expected != metadata or metadata.get("schemaVersion") != 4:
        raise ValueError("Migration cannot change deck, keyword or observation metadata")
    if metadata.get("statusFields") != list(STATUS_FIELDS):
        raise ValueError("Checkpoint status fields differ from this encoder")
    old = FeatureEncoder(original["cardIds"], original["keywords"])
    new = FeatureEncoder(metadata["cardIds"], metadata["keywords"])
    if not set(old.card_ids) < set(new.card_ids):
        raise ValueError("Migration requires an expanded vocabulary without removed cards")
    width = saved["model"]["state.0.weight"].shape[0]
    source_model = CandidatePolicy(old.state_dim, old.action_dim, width=width)
    source_model.load_state_dict(saved["model"])
    target_model = CandidatePolicy(new.state_dim, new.action_dim, width=width)
    mappings = {
        "state.0.weight": column_map(old.state_columns, new.state_columns),
        "action.0.weight": column_map(old.action_columns, new.action_columns),
    }
    result = copy.deepcopy(saved)
    for name, mapping in mappings.items():
        result["model"][name] = expand_columns(saved["model"][name], mapping, moments=False)
    if any(not torch.isfinite(value).all() for value in result["model"].values()):
        raise ValueError("Checkpoint contains nonfinite model weights")
    target_model.load_state_dict(result["model"])
    migrate_optimizer(result, source_model, mappings)
    result["metadata"] = copy.deepcopy(metadata)
    result["vocabularyMigration"] = {
        "schemaVersion": 1,
        "sourceEngineSha256": original["engineSha256"],
        "targetEngineSha256": metadata["engineSha256"],
        "sourceCardIds": list(old.card_ids),
        "addedCardIds": sorted(set(new.card_ids) - set(old.card_ids)),
        "sourceDimensions": [old.state_dim, old.action_dim],
        "targetDimensions": [new.state_dim, new.action_dim],
        "newIdentityWeights": "source unknown-card column",
        "newIdentityAdamMoments": "zero",
        "learningUpdates": 0,
    }
    return result


def migrate_optimizer(
    saved: dict[str, Any], model: CandidatePolicy, mappings: dict[str, ColumnMap]
) -> None:
    if "optimizer" not in saved:
        return
    optimizer = saved["optimizer"]
    parameters = dict(model.named_parameters())
    groups = optimizer["param_groups"]
    if len(groups) != 1 or len(groups[0]["params"]) != len(parameters):
        raise ValueError("Migration requires the trainer's single Adam parameter group")
    ids = groups[0]["params"]
    if len(set(ids)) != len(ids) or not set(optimizer["state"]).issubset(ids):
        raise ValueError("Optimizer parameter identities differ from this model")
    names = dict(zip(ids, parameters, strict=True))
    for parameter_id, state in optimizer["state"].items():
        name = names[parameter_id]
        if not {"step", "exp_avg", "exp_avg_sq"}.issubset(state):
            raise ValueError("Migration requires Adam moment state")
        if groups[0].get("amsgrad") and "max_exp_avg_sq" not in state:
            raise ValueError("AMSGrad maximum moments are missing")
        for field, value in state.items():
            if field == "step":
                if (
                    not isinstance(value, torch.Tensor)
                    or value.ndim != 0
                    or not torch.isfinite(value)
                ):
                    raise ValueError("Adam step must be a finite scalar tensor")
                continue
            if field not in {"exp_avg", "exp_avg_sq", "max_exp_avg_sq"}:
                raise ValueError("Unsupported Adam state field")
            if not isinstance(value, torch.Tensor) or value.shape != parameters[name].shape:
                raise ValueError("Optimizer tensor differs from its source parameter")
            if not torch.isfinite(value).all():
                raise ValueError("Optimizer contains nonfinite state")
            if name in mappings:
                state[field] = expand_columns(value, mappings[name], moments=True)
    # Adam additionally validates the retained parameter-group format.
    target_state = saved["model"]
    validation = CandidatePolicy(
        target_state["state.0.weight"].shape[1],
        target_state["action.0.weight"].shape[1],
        width=target_state["state.0.weight"].shape[0],
    )
    torch.optim.Adam(validation.parameters()).load_state_dict(optimizer)


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


@click.command()
@click.option(
    "--checkpoint", type=click.Path(path_type=Path, exists=True, dir_okay=False), required=True
)
@click.option(
    "--worker", type=click.Path(path_type=Path, exists=True, dir_okay=False), required=True
)
@click.option("--output", type=click.Path(path_type=Path), required=True)
@click.option("--node", default="node")
def main(checkpoint: Path, worker: Path, output: Path, node: str) -> None:
    """Write a distinct checkpoint and receipt; leave the original checkpoint untouched."""
    if output.exists():
        raise click.ClickException("Use a new output directory")
    torch.set_num_threads(2)
    source_hash = digest(checkpoint)
    saved = torch.load(checkpoint, map_location="cpu", weights_only=True)
    try:
        result = migrate_checkpoint(saved, describe(node, worker))
    except (ValueError, RuntimeError) as error:
        raise click.ClickException(str(error)) from error
    if digest(checkpoint) != source_hash:
        raise click.ClickException("Source checkpoint changed during migration")
    result["vocabularyMigration"]["sourceCheckpointSha256"] = source_hash
    output.mkdir(parents=True)
    temporary = output / "checkpoint.tmp"
    torch.save(result, temporary)
    temporary.replace(output / "checkpoint.pt")
    receipt = {
        **result["vocabularyMigration"],
        "checkpointSha256": digest(output / "checkpoint.pt"),
    }
    (output / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    click.echo(json.dumps(receipt))


if __name__ == "__main__":
    main()
