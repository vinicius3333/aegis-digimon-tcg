"""Collect legal-action demonstrations from the engine-backed training teacher."""

import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

import click

from bridge import Episode, describe, episode_scope, scheduled_episode, verify_recipe_pins
from features import FEATURE_VERSION


@click.command()
@click.option("--worker", type=click.Path(path_type=Path, exists=True), required=True)
@click.option("--output", type=click.Path(path_type=Path), required=True)
@click.option("--node", default="node")
@click.option("--games", default=80, type=click.IntRange(min=1))
@click.option("--seed", default=410000, type=int)
@click.option("--workers", default=1, type=click.IntRange(min=1))
@click.option("--curriculum", is_flag=True, help="Include complementary BT26/EX13 learning recipes.")
def main(
    worker: Path, output: Path, node: str, games: int, seed: int, workers: int, curriculum: bool
) -> None:
    if output.exists() and any(output.iterdir()):
        raise click.ClickException("Use a new output directory")
    output.mkdir(parents=True, exist_ok=True)
    metadata = describe(node, worker)
    scope = episode_scope(node, worker, metadata, curriculum)
    manifest = {
        "metadata": metadata,
        "featureVersion": FEATURE_VERSION,
        "seed": seed,
        "games": games,
        "workers": workers,
    }
    if curriculum:
        manifest["curriculum"] = scope
    (output / "config.json").write_text(json.dumps(manifest, indent=2))
    versions = [deck["version"] for deck in scope["decks"]]
    pins = {
        deck["version"]: {key: deck[key] for key in ("version", "sha256")}
        for deck in scope["decks"]
    }

    def collect(index: int) -> dict[str, Any]:
        decks, learner_seat = scheduled_episode(versions, index)
        config = {
            "seed": seed + index,
            "decks": decks,
            "deckPins": [pins[version] for version in decks],
            "learnerSeat": learner_seat,
            "teacher": True,
            "maxDecisions": 4000,
            "turnLimit": 60,
            "engineSha256": metadata["engineSha256"],
        }
        count = 0
        unavailable = 0
        temporary = output / f"episode-{index:05d}.partial"
        with temporary.open("w") as trajectory:
            with Episode(node, worker, config, output / f"episode-{index:05d}.log") as bridge:
                ready = bridge.receive()
                if (
                    ready.get("type") != "ready"
                    or ready.get("engineSha256") != metadata["engineSha256"]
                ):
                    raise RuntimeError("Unexpected worker handshake")
                verify_recipe_pins(ready, config)
                while True:
                    message: dict[str, Any] = bridge.receive()
                    if message["type"] == "decision":
                        if "teacher" not in message:
                            raise RuntimeError("Worker did not supply requested teacher labels")
                        label = message["teacher"]["action"]
                        if label is not None and (
                            not isinstance(label, int) or not 0 <= label < len(message["actions"])
                        ):
                            raise RuntimeError("Teacher returned an invalid action label")
                        # Keep fallback states for diagnosis, but never supervise their arbitrary action.
                        action = 0 if label is None else label
                        count += 1
                        unavailable += label is None
                        trajectory.write(
                            json.dumps(
                                {
                                    "window": message,
                                    "action": action,
                                    "supervised": label is not None,
                                }
                            )
                            + "\n"
                        )
                        bridge.send({"decisionId": message["decisionId"], "action": action})
                        continue
                    if message["type"] not in ("result", "truncated"):
                        raise RuntimeError(f"Demonstration failed: {message}")
                    if (
                        message.get("errors")
                        or message.get("rejections")
                        or message.get("asyncRejections")
                    ):
                        raise RuntimeError(f"Demonstration engine error: {message}")
                    complete = message["type"] == "result" and message.get("terminated")
                    record = {
                        "index": index,
                        "config": config,
                        "complete": bool(complete),
                        "decisions": count,
                        "unavailable": unavailable,
                        "result": message,
                    }
                    break
        if complete:
            temporary.replace(output / f"episode-{index:05d}.jsonl")
        return record

    records: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for record in pool.map(collect, range(games)):
            records.append(record)
            (output / "results.json").write_text(json.dumps(records, indent=2))
            click.echo(
                json.dumps(
                    {
                        "games": len(records),
                        "complete": sum(row["complete"] for row in records),
                        "decisions": sum(row["decisions"] for row in records),
                        "unavailable": sum(row["unavailable"] for row in records),
                    }
                )
            )


if __name__ == "__main__":
    main()
