"""Infrastructure failures leave auditable artifacts instead of fitness scores."""

import json
import subprocess
from pathlib import Path

import pytest

from adapter import EvaluationConfig, HeuristicAdapter


@pytest.mark.parametrize("remote_deadline", (True, False))
def test_timeout_records_failure_and_remote_worker_has_owned_deadline(
    tmp_path: Path, monkeypatch, remote_deadline: bool
) -> None:
    commands = []

    def fail(command, **kwargs):
        commands.append(command)
        if remote_deadline:
            return subprocess.CompletedProcess(command, 124, stdout="")
        raise subprocess.TimeoutExpired(command, kwargs["timeout"])

    monkeypatch.setattr("adapter.subprocess.run", fail)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path,
            engine_sha256="engine",
            simulations=256,
            desktop_host="desktop",
            timeout=60,
        ),
        {},
    )
    with pytest.raises(TimeoutError):
        adapter.evaluate_game({"seed": 1}, {"heuristic": '{"schemaVersion":1}'}, False)
    command = commands[0]
    assert command[command.index("timeout") + 1 : command.index("timeout") + 4] == [
        "--signal=TERM",
        "--kill-after=10",
        "60",
    ]
    audit = json.loads(next(tmp_path.glob("*.json")).read_text())
    assert audit["valid"] is False and audit["score"] is None and audit["engineSha256"] == "engine"
    assert audit["candidateSha256"] and audit["task"] == {"seed": 1}


def test_parallel_batch_keeps_order_and_unique_audit_files(tmp_path: Path, monkeypatch) -> None:
    from threading import Barrier

    ready = Barrier(4)

    def complete(command, **kwargs):
        payload = json.loads(kwargs["input"])
        ready.wait(timeout=5)
        return subprocess.CompletedProcess(
            command,
            0,
            stdout=json.dumps(
                {
                    "valid": True,
                    "score": payload["seed"] % 2,
                    "traces": [],
                }
            ),
        )

    monkeypatch.setattr("adapter.subprocess.run", complete)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path,
            engine_sha256="engine",
            simulations=256,
            desktop_host="desktop",
        ),
        {},
    )
    batch = adapter.evaluate([{"seed": seed} for seed in range(4)], {"heuristic": "{}"})
    assert batch.scores == [0, 1, 0, 1]
    assert [output["task"]["seed"] for output in batch.outputs] == [0, 1, 2, 3]
    assert len(list(tmp_path.glob("*.json"))) == 4


def test_only_valid_identical_games_reuse_cache_and_traces_are_required(
    tmp_path: Path, monkeypatch
) -> None:
    calls = []

    def complete(command, **kwargs):
        payload = json.loads(kwargs["input"])
        calls.append(payload)
        return subprocess.CompletedProcess(
            command,
            0,
            stdout=json.dumps(
                {
                    "valid": payload["seed"] != 3,
                    "score": 1,
                    "traces": [{"kind": "main"}] if payload["captureTraces"] else [],
                }
            ),
        )

    monkeypatch.setattr("adapter.subprocess.run", complete)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path / "games",
            engine_sha256="engine",
            simulations=256,
            desktop_host="desktop",
            cache_dir=tmp_path / "cache",
        ),
        {},
    )
    candidate = {"heuristic": '{"schemaVersion":1}'}
    task = {"seed": 1, "decks": [1, 2], "opponent": "mcts"}
    adapter.evaluate_game(task, candidate, False)
    assert adapter.evaluate_game(task, candidate, False)["cacheHit"] is True
    assert len(calls) == 1
    adapter.evaluate_game(task, candidate, True)
    assert len(calls) == 2
    assert adapter.evaluate_game(task, candidate, True)["cacheHit"] is True
    adapter.evaluate_game({**task, "seed": 2}, candidate, False)
    adapter.evaluate_game({**task, "opponent": "heuristic"}, candidate, False)
    adapter.evaluate_game(task, {"heuristic": '{"schemaVersion":1,"title":"changed"}'}, False)
    assert len(calls) == 5
    assert len(list((tmp_path / "games").glob("*.json"))) == 7
    for _ in range(2):
        invalid = adapter.evaluate_game({**task, "seed": 3}, candidate, False)
        assert invalid["valid"] is False and invalid["score"] is None
    assert len(calls) == 7
    assert len(list((tmp_path / "cache").glob("*.json"))) == 4


def test_balanced_transport_batches_preserve_tasks_cache_and_audit(tmp_path, monkeypatch):
    calls = []

    def complete(command, **kwargs):
        tasks = json.loads(kwargs["input"])
        calls.append(tasks)
        assert command[-1] == "--batch"
        return subprocess.CompletedProcess(
            command,
            0,
            stdout=json.dumps(
                [
                    {
                        "seed": task["seed"],
                        "learnerSeat": task["learnerSeat"],
                        "decks": task["decks"],
                        "opponent": "projected-balanced",
                        "valid": True,
                        "score": task["seed"] % 2,
                        "traces": [{"kind": "main"}] if task["captureTraces"] else [],
                    }
                    for task in tasks
                ]
            ),
        )

    monkeypatch.setattr("adapter.subprocess.run", complete)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path / "games",
            engine_sha256="engine",
            simulations=1,
            desktop_host="desktop",
            cache_dir=tmp_path / "cache",
        ),
        {"balancedBatchSize": 3},
    )
    tasks = [
        {"seed": n, "learnerSeat": 0, "decks": ["a", "b"], "opponent": "balanced"} for n in range(7)
    ]
    candidate = {"heuristic": "{}"}
    assert adapter.evaluate(tasks[:1], candidate).scores == [0]
    outputs = adapter.evaluate(tasks, candidate).outputs
    assert [output["task"] for output in outputs] == tasks
    assert outputs[0]["cacheHit"] is True
    assert len(calls) == 4 and sum(len(call) for call in calls) == 7
    assert len(list((tmp_path / "games").glob("*.json"))) == 8
    adapter.evaluate(tasks, candidate, True)
    assert sum(len(call) for call in calls) == 14
    adapter.evaluate(tasks, candidate, True)
    assert sum(len(call) for call in calls) == 14


def test_balanced_batch_refuses_mislabeled_control_and_wrong_game(tmp_path, monkeypatch):
    def complete(command, **kwargs):
        tasks = json.loads(kwargs["input"])
        return subprocess.CompletedProcess(
            command,
            0,
            stdout=json.dumps(
                [
                    {
                        "valid": True,
                        "score": 1,
                        "seed": task["seed"] + 1,
                        "learnerSeat": 0,
                        "decks": ["a", "b"],
                        "opponent": "coevolved-heuristic",
                    }
                    for task in tasks
                ]
            ),
        )

    monkeypatch.setattr("adapter.subprocess.run", complete)
    adapter = HeuristicAdapter(
        EvaluationConfig(
            node="node",
            worker=Path("/worker.js"),
            run_dir=tmp_path,
            engine_sha256="engine",
            simulations=1,
            desktop_host="desktop",
        ),
        {"balancedBatchSize": 2},
    )
    with pytest.raises(RuntimeError, match="different game or control"):
        adapter.evaluate(
            [{"seed": 1, "learnerSeat": 0, "decks": ["a", "b"], "opponent": "balanced"}],
            {"heuristic": "{}"},
        )
    with pytest.raises(ValueError, match="restricted"):
        adapter.evaluate([{"opponent": "mcts"}], {"heuristic": "{}"})
