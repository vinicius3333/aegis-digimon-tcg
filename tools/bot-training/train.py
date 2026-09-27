"""A bounded, reproducible PPO pilot against the frozen Aegis heuristic opponent."""

import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import click
import numpy as np
import torch
from numpy.typing import NDArray
from torch.distributions import Categorical

from bridge import Episode, describe
from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy


@dataclass
class Transition:
    state: NDArray[np.float32]
    actions: NDArray[np.float32]
    selected: int
    log_probability: float
    value: float
    advantage: float = 0.0
    target: float = 0.0


def expected_payment_forfeit(config: dict[str, Any], message: dict[str, Any]) -> bool:
    failure = message.get("trainingForfeit")
    return (
        config.get("forfeitOnCostRefusal") is True
        and isinstance(failure, dict)
        and failure.get("kind") == "unaffordablePaymentRefusal"
        and isinstance(failure.get("sourceInstanceId"), str)
        and bool(failure["sourceInstanceId"])
        and message.get("type") == "result"
        and message.get("terminated") is True
        and message.get("truncated") is False
        and message.get("reason") == "surrender"
        and message.get("winnerSeat") == 1 - config["learnerSeat"]
        and not message.get("errors")
        and not message.get("rejections")
        and message.get("asyncRejections") == [
            {"kind": "actionRejected", "intent": "playCard", "reason": "insufficient-memory"}
        ]
    )


def infer(
    model: CandidatePolicy,
    encoder: FeatureEncoder,
    message: dict[str, Any],
    device: torch.device,
    greedy: bool,
) -> Transition:
    state, actions = encoder.encode(message)
    with torch.no_grad():
        logits, value = model(
            torch.from_numpy(state[None]).to(device),
            torch.from_numpy(actions[None]).to(device),
            torch.ones((1, len(actions)), dtype=torch.bool, device=device),
        )
        distribution = Categorical(logits=logits)
        selected = logits.argmax(dim=-1) if greedy else distribution.sample()
        return Transition(
            state,
            actions,
            int(selected.item()),
            float(distribution.log_prob(selected).item()),
            float(value.item()),
        )


def episode(
    model: CandidatePolicy,
    encoder: FeatureEncoder,
    config: dict[str, Any],
    node: str,
    worker: Path,
    output: Path,
    device: torch.device,
    greedy: bool,
) -> tuple[list[Transition], dict[str, Any]]:
    transitions: list[Transition] = []
    with Episode(node, worker, config, output / f"episode-{config['seed']}.log") as bridge:
        ready = bridge.receive()
        if (
            ready["type"] != "ready"
            or ready["seed"] != config["seed"]
            or ready["engineSha256"] != config["engineSha256"]
        ):
            raise RuntimeError("Unexpected worker handshake")
        while True:
            message = bridge.receive()
            if message["type"] == "decision":
                transition = infer(model, encoder, message, device, greedy)
                transitions.append(transition)
                bridge.send({"decisionId": message["decisionId"], "action": transition.selected})
                continue
            if message["type"] == "truncated":
                return [], {**message, "seed": config["seed"], "usable": False}
            payment_forfeit = expected_payment_forfeit(config, message)
            if (
                message["type"] != "result"
                or message.get("errors")
                or message.get("rejections")
                or (message.get("asyncRejections") and not payment_forfeit)
                or ("trainingForfeit" in message and not payment_forfeit)
            ):
                (output / f"failure-{config['seed']}.json").write_text(
                    json.dumps({"config": config, "message": message}, indent=2)
                )
                raise RuntimeError(f"Episode {config['seed']} failed: {message}")
            exit_code = bridge.process.wait(timeout=5)
            if exit_code != 0:
                raise RuntimeError(f"Worker exited with code {exit_code}")
            if not message["terminated"]:
                return [], {**message, "usable": False}
            reward = (
                0.0
                if message.get("winnerSeat") is None
                else (1.0 if message["winnerSeat"] == config["learnerSeat"] else -1.0)
            )
            following_value = 0.0
            advantage = 0.0
            for index in range(len(transitions) - 1, -1, -1):
                transition = transitions[index]
                immediate_reward = reward if index == len(transitions) - 1 else 0.0
                delta = immediate_reward + 0.99 * following_value - transition.value
                advantage = delta + 0.99 * 0.95 * advantage
                transition.advantage = advantage
                transition.target = advantage + transition.value
                following_value = transition.value
            return transitions, {**message, "usable": True, "reward": reward}


def update(
    model: CandidatePolicy,
    optimizer: torch.optim.Optimizer,
    transitions: list[Transition],
    device: torch.device,
) -> dict[str, float]:
    if not transitions:
        raise RuntimeError("No complete, valid trajectories available for an update")
    advantages = np.array([transition.advantage for transition in transitions], dtype=np.float32)
    advantages = (advantages - advantages.mean()) / max(float(advantages.std()), 1e-6)
    losses = []
    for _ in range(4):
        indexes = np.random.permutation(len(transitions))
        for start in range(0, len(indexes), 128):
            selected_indexes = indexes[start : start + 128]
            batch = [transitions[index] for index in selected_indexes]
            count = max(len(transition.actions) for transition in batch)
            padded = np.zeros((len(batch), count, batch[0].actions.shape[1]), dtype=np.float32)
            mask = np.zeros((len(batch), count), dtype=np.bool_)
            for row, transition in enumerate(batch):
                padded[row, : len(transition.actions)] = transition.actions
                mask[row, : len(transition.actions)] = True
            logits, values = model(
                torch.from_numpy(np.stack([transition.state for transition in batch])).to(device),
                torch.from_numpy(padded).to(device),
                torch.from_numpy(mask).to(device),
            )
            distribution = Categorical(logits=logits)
            actions = torch.tensor([transition.selected for transition in batch], device=device)
            old_log_probability = torch.tensor(
                [transition.log_probability for transition in batch], device=device
            )
            advantage = torch.from_numpy(advantages[selected_indexes]).to(device)
            ratio = (distribution.log_prob(actions) - old_log_probability).exp()
            policy_loss = -torch.minimum(
                ratio * advantage, ratio.clamp(0.8, 1.2) * advantage
            ).mean()
            targets = torch.tensor([transition.target for transition in batch], device=device)
            loss = (
                policy_loss
                + 0.5 * (values - targets).square().mean()
                - 0.01 * distribution.entropy().mean()
            )
            if not torch.isfinite(loss):
                raise RuntimeError("Nonfinite PPO loss")
            optimizer.zero_grad()
            loss.backward()
            gradient = torch.nn.utils.clip_grad_norm_(
                model.parameters(), 0.5, error_if_nonfinite=True
            )
            optimizer.step()
            losses.append((float(loss.detach()), float(gradient)))
    return {
        "loss": float(np.mean([loss for loss, _ in losses])),
        "gradientNorm": max(gradient for _, gradient in losses),
    }


@click.command()
@click.option(
    "--worker", type=click.Path(path_type=Path, exists=True, dir_okay=False), required=True
)
@click.option("--output", type=click.Path(path_type=Path, file_okay=False), required=True)
@click.option("--node", default="node")
@click.option("--games", default=32, type=click.IntRange(min=1))
@click.option("--batch-games", default=8, type=click.IntRange(min=1))
@click.option("--max-decisions", default=4000, type=click.IntRange(min=1))
@click.option("--seed", default=260001, type=int)
@click.option("--device", default="cpu", type=click.Choice(["cpu", "cuda"]))
@click.option("--checkpoint", type=click.Path(path_type=Path, exists=True, dir_okay=False))
@click.option("--evaluate", is_flag=True, help="Greedy held-out evaluation; never updates weights.")
def main(
    worker: Path,
    output: Path,
    node: str,
    games: int,
    batch_games: int,
    max_decisions: int,
    seed: int,
    device: str,
    checkpoint: Path | None,
    evaluate: bool,
) -> None:
    if output.exists() and any(output.iterdir()):
        raise click.ClickException("Use a new output directory so prior evidence is preserved")
    output.mkdir(parents=True, exist_ok=True)
    metadata = describe(node, worker)
    if metadata.get("statusFields") != list(STATUS_FIELDS):
        raise click.ClickException("Worker public-status schema differs from this encoder")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.set_num_threads(2)
    target_device = torch.device(device)
    if device == "cuda" and not torch.cuda.is_available():
        raise click.ClickException("CUDA is unavailable")
    encoder = FeatureEncoder(metadata["cardIds"], metadata["keywords"])
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim).to(target_device)
    optimizer = torch.optim.Adam(model.parameters(), lr=3e-4)
    if checkpoint is not None:
        saved = torch.load(checkpoint, map_location=target_device, weights_only=True)
        if saved["metadata"] != metadata or saved["featureVersion"] != FEATURE_VERSION:
            raise click.ClickException(
                "Checkpoint deck/observation schema differs from this worker"
            )
        model.load_state_dict(saved["model"])
        if not evaluate:
            optimizer.load_state_dict(saved["optimizer"])
    elif evaluate:
        raise click.ClickException("Evaluation requires --checkpoint")
    initial = torch.cat([parameter.detach().flatten().cpu() for parameter in model.parameters()])
    config = {
        "seed": seed,
        "games": games,
        "batchGames": batch_games,
        "maxDecisions": max_decisions,
        "device": device,
        "featureVersion": FEATURE_VERSION,
        "metadata": metadata,
        "evaluate": evaluate,
        "forfeitOnCostRefusal": not evaluate,
        "torchVersion": str(torch.__version__),
        "parameters": sum(parameter.numel() for parameter in model.parameters()),
    }
    (output / "config.json").write_text(json.dumps(config, indent=2))
    pending: list[Transition] = []
    records = []
    started = time.monotonic()
    for index in range(games):
        versions = [deck["version"] for deck in metadata["decks"]]
        episode_config = {
            "seed": seed + index,
            "decks": [versions[(index // 2) % 2], versions[index % 2]],
            "learnerSeat": (index // 4) % 2,
            "maxDecisions": max_decisions,
            "turnLimit": 60,
            "forfeitOnCostRefusal": not evaluate,
            "engineSha256": metadata["engineSha256"],
        }
        transitions, result = episode(
            model, encoder, episode_config, node, worker, output, target_device, evaluate
        )
        pending.extend(transitions)
        records.append(result)
        metrics: dict[str, float] = {}
        if not evaluate and ((index + 1) % batch_games == 0 or index + 1 == games):
            metrics = update(model, optimizer, pending, target_device)
            pending.clear()
            saved = {
                "model": model.state_dict(),
                "optimizer": optimizer.state_dict(),
                "metadata": metadata,
                "featureVersion": FEATURE_VERSION,
                "games": index + 1,
                "seed": seed,
            }
            temporary = output / "checkpoint.tmp"
            torch.save(saved, temporary)
            temporary.replace(output / "checkpoint.pt")
        summary = {
            "games": index + 1,
            "decisions": sum(record["decisions"] for record in records),
            "wins": sum(record.get("reward") == 1 for record in records),
            "losses": sum(record.get("reward") == -1 for record in records),
            "unusable": sum(not record["usable"] for record in records),
            "paymentForfeits": sum("trainingForfeit" in record for record in records),
            "elapsedSeconds": time.monotonic() - started,
            **metrics,
        }
        (output / "results.json").write_text(
            json.dumps({"summary": summary, "episodes": records}, indent=2)
        )
        click.echo(json.dumps(summary))
    final = torch.cat([parameter.detach().flatten().cpu() for parameter in model.parameters()])
    changed = float((final - initial).abs().max())
    if not evaluate and changed == 0:
        raise click.ClickException("Training completed without changing any model parameter")
    if not evaluate:
        loaded = CandidatePolicy(encoder.state_dim, encoder.action_dim).to(target_device)
        loaded.load_state_dict(
            torch.load(output / "checkpoint.pt", map_location=target_device, weights_only=True)[
                "model"
            ]
        )
        if any(
            not torch.equal(a, b)
            for a, b in zip(model.parameters(), loaded.parameters(), strict=True)
        ):
            raise click.ClickException("Checkpoint reload differs from trained parameters")
    (output / "verification.json").write_text(
        json.dumps(
            {
                "maxParameterChange": changed,
                "checkpointReloadExact": not evaluate,
                "completeEpisodes": sum(record["usable"] for record in records),
                "paymentForfeits": sum("trainingForfeit" in record for record in records),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
