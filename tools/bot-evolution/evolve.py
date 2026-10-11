"""Random-deck GEPA training followed by frozen-archive deck-pilot coevolution."""

import hashlib
import json
import shutil
import subprocess
from copy import deepcopy
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import click
import gepa

from adapter import REFLECTION_TEMPLATE, EvaluationConfig, HeuristicAdapter
from api_reflection import ApiReflection
from deterministic_proposals import DeterministicProposer, validate_plan
from evidence import paired_evidence, policy_hash, verify_neutral_control
from ladder import choose_training_rung, ladder_tasks
from proposals import guarded_proposer
from session_reflection import SessionReflection
from tune import tune


class EvolutionAudit:
    """Observe official GEPA proposals and decisions without changing selection."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def record(self, kind: str, event: dict[str, Any]) -> None:
        with self.path.open("a", encoding="utf-8") as stream:
            stream.write(json.dumps({"kind": kind, "event": event}) + "\n")

    def on_proposal_end(self, event: dict[str, Any]) -> None:
        self.record("proposal", event)

    def on_candidate_accepted(self, event: dict[str, Any]) -> None:
        self.record("accepted", event)

    def on_candidate_rejected(self, event: dict[str, Any]) -> None:
        self.record("rejected", event)

    def proposals(self) -> set[str]:
        if not self.path.is_file():
            return set()
        return {
            policy_hash(json.loads(record["event"]["new_instructions"]["heuristic"]))
            for record in (
                json.loads(line) for line in self.path.read_text(encoding="utf-8").splitlines()
            )
            if record["kind"] == "proposal"
        }


def task_sets(
    deck_versions: list[str],
    pilot: str | None,
    archive: dict[str, dict[str, Any]],
    pairs: int,
    generation: int,
) -> dict[str, list[dict[str, Any]]]:
    splits = {}
    for split_index, split in enumerate(("train", "validation", "test")):
        tasks = []
        for pair in range(pairs):
            seed = 100 + generation * 1000000 + split_index * 10000 + pair
            random_base = 1 + split_index * 10000 + pair * 2
            for learner_seat in (0, 1):
                if pilot is None:
                    decks: list[str | int] = [random_base, random_base + 1]
                else:
                    other = deck_versions[
                        (deck_versions.index(pilot) + pair + split_index + 1) % len(deck_versions)
                    ]
                    if other == pilot:
                        other = deck_versions[(deck_versions.index(pilot) + 1) % len(deck_versions)]
                    decks = [pilot, other] if learner_seat == 0 else [other, pilot]
                task = {
                    "seed": seed,
                    "learnerSeat": learner_seat,
                    "decks": decks,
                    "opponent": "mcts",
                    "searchSeed": 777 + split_index * 10000 + pair,
                }
                tasks.append(task)
                if pilot is not None:
                    # Freeze every opponent at generation start: later pilots cannot
                    # silently change the opponents used to score an earlier pilot.
                    other_version = str(decks[1 - learner_seat])
                    tasks.append(
                        {
                            **task,
                            "opponent": "heuristic",
                            "opponentProgram": deepcopy(archive[other_version]),
                        }
                    )
        splits[split] = tasks
    seed_sets = [{task["seed"] for task in tasks} for tasks in splits.values()]
    if any(seed_sets[left] & seed_sets[right] for left in range(3) for right in range(left)):
        raise ValueError("Training, selection, and final test game seeds overlap")
    return splits


def optimize_stage(
    *,
    stage: str,
    initial: dict[str, Any],
    splits: dict[str, list[dict[str, Any]]],
    run_dir: Path,
    metadata: dict[str, Any],
    node: str,
    simulations: int,
    metric_calls: int,
    reflection_model: str,
    numeric_proposals: int = 0,
    reflection_budget: dict[str, Any] | None = None,
) -> dict[str, Any]:
    stage_dir = run_dir / stage
    result_path = stage_dir / "selected.json"
    stage_fingerprint = hashlib.sha256(
        json.dumps(
            {
                "initial": initial,
                "splits": splits,
                "runnerSha256": metadata["runnerSha256"],
                "engineSha256": metadata["engineSha256"],
                "simulations": simulations,
                "metricCalls": metric_calls,
                "reflectionModel": reflection_model,
                "numericProposals": numeric_proposals,
                "adaptiveLadder": metadata.get("adaptiveLadder", False),
                "pairedProposalGates": metadata.get("pairedProposalGates", False),
                "reflectionBudget": reflection_budget,
                "deterministicPlan": metadata.get("deterministicPlan"),
                "proposalGateTasks": metadata.get("proposalGateTasks"),
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    if result_path.is_file():
        selected = json.loads(result_path.read_text(encoding="utf-8"))
        if selected.get("stageSha256") != stage_fingerprint:
            raise ValueError("Resumed stage inputs or runner changed; use a new run directory")
        return selected
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node=node,
            worker=Path(metadata["worker"]),
            run_dir=stage_dir / "games",
            engine_sha256=metadata["engineSha256"],
            simulations=simulations,
            desktop_host=metadata.get("desktopHost"),
            timeout=metadata["evaluationTimeout"],
            workers=metadata["evaluationWorkers"],
            cache_dir=Path(metadata["evaluationCache"]),
        ),
        metadata,
    )
    stage_dir.mkdir(parents=True, exist_ok=True)
    (stage_dir / "splits.json").write_text(json.dumps(splits, indent=2) + "\n", encoding="utf-8")
    if metadata.get("trainingControl") == "current projected-balanced" and all(
        rule["weight"] == 0 for rule in initial["rules"]
    ):
        neutral = adapter.evaluate(splits["validation"], {"heuristic": json.dumps(initial)}).outputs
        (stage_dir / "neutral-control.json").write_text(
            json.dumps(verify_neutral_control(neutral), indent=2) + "\n"
        )
    opponent = (
        "current projected-balanced control"
        if metadata.get("trainingControl") == "current projected-balanced"
        else f"{simulations} MCTS simulations per search"
    )
    click.echo(f"Optimizing {stage}: {opponent}", err=True)
    audit = EvolutionAudit(stage_dir / "evolution-audit.jsonl")
    rung = None
    if metadata.get("adaptiveLadder"):
        rung = choose_training_rung(
            adapter, initial, splits["train"], stage_dir / "ladder", simulations
        )
        simulations = max(1, rung["trainingRung"])
        adapter.config = replace(adapter.config, simulations=simulations)
        splits = {
            name: ladder_tasks(tasks, rung["trainingRung"], include_archive=True)
            for name, tasks in splits.items()
        }
        (stage_dir / "training-splits.json").write_text(json.dumps(splits, indent=2) + "\n")
    numeric = (
        tune(
            adapter,
            initial,
            splits["train"],
            seed=71,
            proposals=numeric_proposals,
            output=stage_dir / "numeric",
        )
        if numeric_proposals
        else None
    )
    starting_program = initial if numeric is None else numeric["program"]
    deterministic = reflection_model == "deterministic"
    if deterministic:
        plan = metadata["deterministicPlan"]
        validate_plan(plan, initial, metadata["engineSha256"])
        (stage_dir / "deterministic-plan.json").write_text(json.dumps(plan, indent=2) + "\n")
        proposer = DeterministicProposer(
            adapter, plan, metadata["proposalGateTasks"], stage_dir / "proposal-gates"
        )
        adapter.propose_new_texts = proposer
    reflector = (
        None
        if deterministic
        else (
            SessionReflection(stage_dir / "reflections")
            if reflection_model == "session"
            else ApiReflection(
                stage_dir / "reflections",
                Path(metadata["reflectionBudgetLedger"])
                if metadata.get("reflectionBudgetLedger")
                else run_dir / "reflection-budget.json",
                model=reflection_model,
                **(reflection_budget or {}),
            )
        )
    )
    if metadata.get("pairedProposalGates") and not deterministic:
        adapter.propose_new_texts = guarded_proposer(
            adapter,
            reflector,
            starting_program,
            splits["validation"],
            stage_dir / "proposal-gates",
            max(1, metric_calls // (4 * len(splits["validation"]))),
        )
    result = gepa.optimize(
        seed_candidate={"heuristic": json.dumps(starting_program)},
        trainset=splits["train"],
        valset=splits["validation"],
        adapter=adapter,
        reflection_lm=reflector,
        reflection_prompt_template=None
        if adapter.propose_new_texts is not None
        else REFLECTION_TEMPLATE,
        reflection_minibatch_size=min(
            metadata.get(
                "reflectionMinibatchSize", 24 if metadata.get("feedbackMode") == "thin" else 48
            ),
            len(splits["train"]),
        )
        or 2,
        max_metric_calls=metric_calls,
        run_dir=str(stage_dir / "gepa"),
        seed=71,
        skip_perfect_score=False,
        # GEPA's list loaders assign overlapping integer IDs to train and val.
        # Its internal cache keys only candidate + ID; our adapter cache keys
        # the complete game task, so it can safely provide all reuse instead.
        cache_evaluation=False,
        display_progress_bar=False,
        raise_on_exception=True,
        callbacks=[audit],
        stop_callbacks=(lambda state: proposer.failure is not None or proposer.exhausted(state))
        if deterministic
        else (lambda state: getattr(reflector, "failure", None) is not None),
    )
    if deterministic and proposer.failure is not None:
        raise RuntimeError(
            "Deterministic proposal gate failed; run stopped without selecting a policy"
        ) from proposer.failure
    if getattr(reflector, "failure", None) is not None:
        raise RuntimeError(
            "API reflection failed; run stopped without selecting a policy"
        ) from reflector.failure
    (stage_dir / "gepa-result.json").write_text(
        json.dumps(result.to_dict(), indent=2) + "\n", encoding="utf-8"
    )
    evaluated = [
        json.loads(path.read_text(encoding="utf-8"))
        for path in (stage_dir / "games").glob("*.json")
    ]
    proposals = audit.proposals() - {policy_hash(initial)}
    proposals |= {
        json.loads(path.read_text())["policySha256"]
        for path in (stage_dir / "numeric").glob("proposal-*.json")
    }
    proposals |= {
        policy_hash(record["program"])
        for path in (stage_dir / "proposal-gates").glob("proposal-*.json")
        if "program" in (record := json.loads(path.read_text()))
    }
    proposals.discard(policy_hash(initial))
    valid_evaluated = {game.get("policySha256") for game in evaluated if game.get("valid") is True}
    selected = {
        "stage": stage,
        "ladder": rung,
        "trainingSimulations": simulations,
        "proposals": len(proposals),
        "validEvaluatedProposals": len(proposals & valid_evaluated),
        "retainedStageInitial": policy_hash(json.loads(result.best_candidate["heuristic"]))
        == policy_hash(initial),
        "retainedOriginalSeed": json.loads(result.best_candidate["heuristic"])
        == metadata.get("seedProgram", initial),
        "stageSha256": stage_fingerprint,
        "program": json.loads(result.best_candidate["heuristic"]),
        "validationScore": result.val_aggregate_scores[result.best_idx],
        "candidates": result.num_candidates,
        "selectedIndex": result.best_idx,
        "metricCalls": result.total_metric_calls,
        "engineSha256": metadata["engineSha256"],
        "deterministicPlan": {
            "total": len(plan["programs"]),
            "attempted": proposer.calls,
            "completed": sum(
                json.loads(path.read_text()).get("status") in ("evaluated", "unchanged")
                for path in (stage_dir / "proposal-gates").glob("proposal-*.json")
            ),
            "stopReason": "plan-exhausted"
            if proposer.exhausted()
            else "stopped-before-plan-exhausted",
        }
        if deterministic
        else None,
    }
    result_path.write_text(json.dumps(selected, indent=2) + "\n", encoding="utf-8")
    return selected


def final_evaluation(
    *,
    stages: dict[str, dict[str, Any]],
    run_dir: Path,
    metadata: dict[str, Any],
    node: str,
    simulations: int,
    pairs: int,
    generations: int,
) -> dict[str, Any]:
    archive = {
        version: stage["program"] for version, stage in stages.items() if version != "generic"
    }
    results = {}
    for version, selected in stages.items():
        splits = task_sets(
            metadata["deckVersions"],
            None if version == "generic" else version,
            archive,
            pairs,
            generations + 1,
        )
        adapter = HeuristicAdapter(
            EvaluationConfig(
                node=node,
                worker=Path(metadata["worker"]),
                run_dir=run_dir / "held-out" / version,
                engine_sha256=metadata["engineSha256"],
                simulations=simulations,
                desktop_host=metadata.get("desktopHost"),
                timeout=metadata["evaluationTimeout"],
                workers=metadata["evaluationWorkers"],
                cache_dir=Path(metadata["evaluationCache"]),
            ),
            metadata,
        )
        tasks = splits["test"]
        # The initial policy is a paired control on the identical held-out games.
        chosen = adapter.evaluate(tasks, {"heuristic": json.dumps(selected["program"])}, True)
        control = adapter.evaluate(tasks, {"heuristic": json.dumps(metadata["seedProgram"])}, False)
        results[version] = {
            "selected": chosen.outputs,
            "control": control.outputs,
            "selectedScore": sum(chosen.scores) / len(chosen.scores),
            "controlScore": sum(control.scores) / len(control.scores),
            "pairedEvidence": paired_evidence(chosen.outputs, control.outputs),
            "played": len(chosen.scores),
            "allValid": all(
                output.get("valid") is True for output in chosen.outputs + control.outputs
            ),
        }
    report = {
        "schemaVersion": 1,
        "engineSha256": metadata["engineSha256"],
        "runnerSha256": metadata["runnerSha256"],
        "evaluationTimeout": metadata["evaluationTimeout"],
        "simulations": simulations,
        "results": results,
    }
    (run_dir / "held-out.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


@click.command()
@click.option("--run-dir", type=click.Path(path_type=Path), required=True)
@click.option("--node", default="node", show_default=True)
@click.option(
    "--desktop-host", default=None, help="SSH host for the Windows/WSL desktop evaluator."
)
@click.option("--worker", "worker_override", type=click.Path(path_type=Path), default=None)
@click.option(
    "--evaluation-timeout", default=7200, type=click.IntRange(60, 86400), show_default=True
)
@click.option("--evaluation-workers", default=4, type=click.IntRange(1, 4), show_default=True)
@click.option("--simulations", default=8, type=click.IntRange(1, 10000), show_default=True)
@click.option("--metric-calls", default=512, type=click.IntRange(12, 10000), show_default=True)
@click.option("--pairs", default=24, type=click.IntRange(1, 100), show_default=True)
@click.option("--generations", default=2, type=click.IntRange(1, 100), show_default=True)
@click.option("--reflection-model", default="openai/gpt-4.1", show_default=True)
@click.option("--adaptive-ladder/--fixed-opponent", default=True, show_default=True)
@click.option("--numeric-proposals", default=24, type=click.IntRange(0, 1000))
@click.option("--completion-tokens", default=4096, type=click.IntRange(1, 32768))
@click.option("--dollar-cap", default=None, type=click.FloatRange(min=0, min_open=True))
@click.option("--input-usd-per-million", default=None, type=click.FloatRange(min=0, min_open=True))
@click.option("--output-usd-per-million", default=None, type=click.FloatRange(min=0, min_open=True))
def main(
    run_dir: Path,
    node: str,
    desktop_host: str | None,
    worker_override: Path | None,
    simulations: int,
    evaluation_timeout: int,
    evaluation_workers: int,
    metric_calls: int,
    pairs: int,
    generations: int,
    reflection_model: str,
    numeric_proposals: int,
    adaptive_ladder: bool,
    completion_tokens: int,
    dollar_cap: float | None,
    input_usd_per_million: float | None,
    output_usd_per_million: float | None,
) -> None:
    reflection_budget = None
    if reflection_model != "session":
        if any(
            value is None for value in (dollar_cap, input_usd_per_million, output_usd_per_million)
        ):
            raise click.ClickException(
                "API reflection requires --dollar-cap and explicit input/output USD-per-million prices; unknown pricing cannot bypass the cap"
            )
        reflection_budget = {
            "completion_tokens": completion_tokens,
            "dollar_cap": dollar_cap,
            "input_usd_per_million": input_usd_per_million,
            "output_usd_per_million": output_usd_per_million,
        }
    if pairs < 24:
        raise click.ClickException("Selection requires at least 48 same-seed games (--pairs >=24)")
    root = Path(__file__).parent.parent.parent
    worker = worker_override or root / "apps/api/dist/bot/evolution/evaluateCli.js"
    if desktop_host is None and (shutil.which(node) is None or not worker.is_file()):
        raise click.ClickException("Node and a compiled API evolution worker are required")
    if metric_calls < pairs * 4 + 48:
        raise click.ClickException(
            "Metric budget must cover initial pilot validation and a 48-game mutation screen"
        )
    command = [node, str(worker), "--describe"]
    if desktop_host is not None:
        command = ["ssh", "-o", "BatchMode=yes", desktop_host, "wsl.exe", "-e", *command]
    description = subprocess.run(command, check=True, capture_output=True, text=True, timeout=60)
    metadata = {
        **json.loads(description.stdout),
        "worker": str(worker),
        "node": node,
        "pairedProposalGates": True,
        "adaptiveLadder": adaptive_ladder,
        "desktopHost": desktop_host,
        "evaluationTimeout": evaluation_timeout,
        "evaluationWorkers": evaluation_workers,
        "evaluationCache": str(run_dir.parent / "game-cache"),
        "runnerSha256": hashlib.sha256(
            b"".join(
                path.name.encode("utf-8") + b"\0" + path.read_bytes()
                for path in sorted(Path(__file__).parent.iterdir())
                if path.name
                in (
                    "adapter.py",
                    "evidence.py",
                    "tune.py",
                    "api_reflection.py",
                    "proposals.py",
                    "ladder.py",
                    "residual_weights.py",
                    "evolve.py",
                    "session_reflection.py",
                    "pyproject.toml",
                    "uv.lock",
                )
            )
        ).hexdigest(),
    }
    config = {
        "engineSha256": metadata["engineSha256"],
        "runnerSha256": metadata["runnerSha256"],
        "evaluationTimeout": evaluation_timeout,
        "evaluationWorkers": evaluation_workers,
        "simulations": simulations,
        "metricCalls": metric_calls,
        "pairs": pairs,
        "generations": generations,
        "reflectionModel": reflection_model,
        "numericProposals": numeric_proposals,
        "reflectionBudget": reflection_budget,
        "adaptiveLadder": adaptive_ladder,
        "deckVersions": metadata["deckVersions"],
    }
    config_sha256 = hashlib.sha256(json.dumps(config, sort_keys=True).encode("utf-8")).hexdigest()
    run_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = run_dir / "manifest.json"
    if manifest_path.is_file():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))
        if existing["configurationSha256"] != config_sha256:
            raise click.ClickException(
                "Run configuration or engine changed; use a new run directory"
            )
    else:
        manifest_path.write_text(
            json.dumps(
                {
                    "configurationSha256": config_sha256,
                    "config": config,
                    "createdAt": datetime.now(UTC).isoformat(),
                    "metadata": metadata,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    generic = optimize_stage(
        stage="generic",
        initial=metadata["seedProgram"],
        splits=task_sets(metadata["deckVersions"], None, {}, pairs, 0),
        run_dir=run_dir,
        metadata=metadata,
        node=node,
        simulations=simulations,
        metric_calls=metric_calls,
        reflection_model=reflection_model,
        numeric_proposals=numeric_proposals,
        reflection_budget=reflection_budget,
    )
    pilots = {version: generic for version in metadata["deckVersions"]}
    for generation in range(1, generations + 1):
        archive = {version: selected["program"] for version, selected in pilots.items()}
        next_pilots = {}
        for index, version in enumerate(metadata["deckVersions"]):
            next_pilots[version] = optimize_stage(
                stage=f"generation-{generation}-pilot-{index}",
                initial=pilots[version]["program"],
                splits=task_sets(metadata["deckVersions"], version, archive, pairs, generation),
                run_dir=run_dir,
                metadata=metadata,
                node=node,
                simulations=simulations,
                metric_calls=metric_calls,
                reflection_model=reflection_model,
                numeric_proposals=numeric_proposals,
                reflection_budget=reflection_budget,
            )
        pilots = next_pilots
    report = final_evaluation(
        stages={"generic": generic, **pilots},
        run_dir=run_dir,
        metadata=metadata,
        node=node,
        simulations=simulations,
        pairs=pairs,
        generations=generations,
    )
    (run_dir / "pilots.json").write_text(
        json.dumps({"generic": generic, **pilots}, indent=2) + "\n", encoding="utf-8"
    )
    click.echo(
        json.dumps(
            {
                "run": str(run_dir),
                "allValid": all(result["allValid"] for result in report["results"].values()),
            }
        )
    )


if __name__ == "__main__":
    main()
