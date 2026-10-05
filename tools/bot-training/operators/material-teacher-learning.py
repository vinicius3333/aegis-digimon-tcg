"""ROOT-approved sequential learning on one genuinely qualified frozen teacher source.

No queues or automatic successors. Each phase needs its own live retained wrapper
and a SHA-pinned ROOT Go binding actual predecessor closures. Readers are stdlib;
only the explicitly approved tensor child imports model libraries.
"""

import argparse
import ast
import copy
import hashlib
import importlib.util
import json
import math
import os
import random
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
SOURCE = "1cec011c0fd0c6481e7297506ed4c825a4dfcdc7"
ARCHIVE_SHA = "7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080"
MANIFEST_SHA = "0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68"
RUNTIME_READER = LAB / "transfers/material-teacher-source-runtime.py"
REVIEWED_RUNTIME_SHA = "576d520584faf47b915460d56c5026b95f9768fe3fc6df57aebdae3d55fdee71"
PLAN_SHA = "f434e3d014f19b83eba8c9b247e51927faddbe63216b554ad4bdb13c640ff1be"
COVERAGE_SHA = "ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350"
SUMMARY_SHA = "47f7ca12ebd2a4dad86f66ba625c8cd52406c2b66583c5c3708a70571b2ae5b3"
GLOBAL = LAB / "runs/2026-10-04-bt26-ex13-v19b-global-ppo/operator.py"
GLOBAL_SHA = "c2344179f063feaef189559852a6e7d74c522a59fdb1300e05ce184158f9d10f"
HELPER = LAB / "transfers/aegis-v27-fresh-curriculum-comparison.py"
HELPER_SHA = "c984171ddba83eecf49b0f41c20a5fe221e7a777a0b81e456acb02cfecdd15a9"
LABELS = ("v17-reference", "source-challenger", "fitted-reference", "challenger")
SIZES = {"diagnostic": 88, "contexts": 436, "ppo": 3872, "comparison": 3872}


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def sha(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch("[a-f0-9]{64}", value) is not None


def digest(path: Path) -> str:
    require(path.is_file() and not path.is_symlink(), "Missing regular pinned input")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pin(path: Path, expected: Any) -> None:
    require(sha(expected) and digest(path) == expected, "Null/mismatched actual pin")


def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def invalid(value: str) -> Any:
    raise ValueError(f"Nonfinite JSON {value}")


def read(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8"), object_pairs_hook=unique, parse_constant=invalid
    )


def write(path: Path, value: Any) -> None:
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n")


def load(path: Path, expected: str) -> Any:
    pin(path, expected)
    spec = importlib.util.spec_from_file_location("sealed_" + expected, path)
    require(spec is not None and spec.loader is not None, "Missing loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    pin(path, expected)
    return module


def definitions(
    path: Path,
    expected: str,
    names: set[str],
    namespace: dict[str, Any],
    edits: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Only explicitly declared expected selectors change in original pure consumers."""
    pin(path, expected)
    nodes = [
        copy.deepcopy(n)
        for n in ast.parse(path.read_text(encoding="utf-8")).body
        if isinstance(n, ast.FunctionDef) and n.name in names
    ]
    require({n.name for n in nodes} == names, "Original helper missing")
    counts = dict.fromkeys(edits or {}, 0)

    class Adapt(ast.NodeTransformer):
        def visit(self, node: ast.AST) -> ast.AST:
            key = ast.unparse(node)
            if key in (edits or {}):
                counts[key] += 1
                return ast.copy_location(ast.parse(edits[key], mode="eval").body, node)
            return super().visit(node)

    tree = ast.fix_missing_locations(Adapt().visit(ast.Module(body=nodes, type_ignores=[])))
    require(all(count == 1 for count in counts.values()), "Original selector mismatch")
    result = dict(namespace)
    exec(compile(tree, str(path), "exec"), result)  # noqa: S102 - SHA-bound original pure helper definitions and declared selectors.
    result["declaredEdits"] = edits or {}
    return result


def lane(value: Any, parent: Path) -> Path:
    require(isinstance(value, str), "Unknown path")
    path = Path(value)
    require(
        path.is_absolute() and path.parent == parent and ".." not in path.parts, "Unsafe lane path"
    )
    require(not any(p.is_symlink() for p in [path, *path.parents]), "Symlink lane")
    return path


def scope(metadata: dict[str, Any], curriculum: dict[str, Any], engine: str) -> None:
    cards = {f"BT26-{i:03}" for i in range(1, 105)} | {f"EX13-{i:03}" for i in range(1, 78)}
    require(
        metadata["engineSha256"] == curriculum["engineSha256"] == engine and sha(engine),
        "Actual current engine required",
    )
    require(
        len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479
        and cards <= set(metadata["cardIds"]),
        "479/181 vocabulary required",
    )
    require(
        len(metadata["decks"]) == 26
        and len(curriculum["decks"]) == 44
        and curriculum["decks"][:26] == metadata["decks"]
        and len({d["version"] for d in curriculum["decks"]}) == 44,
        "26+18 recipes required",
    )


def blocks(request: dict[str, Any]) -> list[tuple[str, int, int]]:
    require(set(request["seeds"]) == set(SIZES), "Exact development blocks required")
    result = [(name, request["seeds"][name], count) for name, count in SIZES.items()]
    for i, expansion in enumerate(request["contextExpansions"]):
        require(
            set(expansion) == {"seed", "games"}
            and type(expansion["games"]) is int
            and expansion["games"] > 0
            and expansion["games"] % 440 == 0,
            "Expansion must preserve original schedule/fold opportunity periods",
        )
        result.append((f"contexts-{i + 1}", expansion["seed"], expansion["games"]))
    used: set[int] = set()
    for _, seed, count in result:
        require(
            type(seed) is int and seed >= 0 and seed + count <= 6210000,
            "Invalid or reserved final seed",
        )
        selected = set(range(seed, seed + count))
        require(not selected & used, "Overlapping phase blocks")
        used |= selected
    return result


def command_plan(
    checkout: Path, bindings: dict[str, Any], request: dict[str, Any]
) -> dict[str, list[str]]:
    source = checkout / "tools/bot-training"
    ns = definitions(
        source / "prepare_learning.py",
        PLAN_SHA,
        {"commands", "minimum_fold_prefix", "validate_blocks"},
        {"Any": Any, "Path": Path, "LAB": LAB, "SIZES": SIZES, "require": require},
        {
            "not run.exists() and 'learning-followthrough' in run.name": "run.name.startswith('material-teacher-learning-')"
        },
    )
    plan = ns["commands"](checkout, bindings, request)
    result = {
        "diagnostic": plan["diagnosticCommand"],
        "contexts": plan["contextCommandConditionalOnReviewedLabelProducer"],
        "imitation": plan["imitationConditionalOnStrictCorpusCoverage"],
        "ppo": plan["ppoConditionalOnValidatedImitationAndTensorCustody"],
    }
    # Original CLI bytes remain exact. Only output dataset selector points at the verified union.
    result["imitation"][result["imitation"].index("--dataset") + 1] = str(
        Path(request["futureRun"]) / "corpus"
    )
    for i, expansion in enumerate(request["contextExpansions"]):
        argv = result["contexts"].copy()
        for option, value in (
            ("--seed", expansion["seed"]),
            ("--games", expansion["games"]),
            ("--output", Path(request["futureRun"]) / f"contexts-{i + 1}"),
        ):
            argv[argv.index(option) + 1] = str(value)
        result[f"contexts-{i + 1}"] = argv
    for label, argv in zip(
        ("candidate", "primary-before", *LABELS[:3]),
        plan["sequentialDevelopmentComparisonCommands"],
        strict=True,
    ):
        result["comparison-" + label] = argv
    return result


def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    sys.dont_write_bytecode = True
    require(__debug__ and "torch" not in sys.modules, "Use stdlib admission without -O")
    pin(Path(__file__), operator_sha)
    pin(path, request_sha)
    request = read(path)
    require(request["formatVersion"] == 1, "Request version")
    runtime_request = request["runtime"]
    for key in (
        "requestSha256",
        "prepareIdentitySha256",
        "migrationIdentitySha256",
        "prepareCompletionSha256",
        "migrationCompletionSha256",
        "engineSha256",
    ):
        require(sha(runtime_request[key]), "Actual runtime closure pin required")
    require(
        runtime_request["operatorSha256"] == REVIEWED_RUNTIME_SHA
        and Path(runtime_request["operator"]) == RUNTIME_READER,
        "ROOT-bound reviewed runtime path/SHA required",
    )
    blocks(request)
    runtime_sha = runtime_request["operatorSha256"]
    runtime = load(Path(runtime_request["operator"]), runtime_sha)
    ctx = runtime.context(
        Path(runtime_request["request"]), runtime_request["requestSha256"], runtime_sha
    )
    require(
        ctx["request"]["source"]["commit"] == SOURCE
        and ctx["request"]["source"]["archive"]["sha256"] == ARCHIVE_SHA
        and ctx["request"]["source"]["manifest"]["sha256"] == MANIFEST_SHA,
        "Frozen reviewed teacher source required",
    )
    prepared = runtime.closed_prepare(ctx, runtime_request["prepareIdentitySha256"])
    migrated = runtime.closed_migration(
        ctx, runtime_request["migrationIdentitySha256"], runtime_request["prepareIdentitySha256"]
    )
    require(
        prepared["completionSha256"] == runtime_request["prepareCompletionSha256"]
        and migrated["completionSha256"] == runtime_request["migrationCompletionSha256"]
        and prepared["sourceCommit"] == migrated["sourceCommit"] == SOURCE
        and prepared["engineSha256"] == migrated["engineSha256"] == runtime_request["engineSha256"]
        and prepared["cpuRuntimeQualified"] is True
        and migrated["actualLearningUpdates"] == 0
        and migrated["acceptedStrengthOrMastery"] is False,
        "Actual closure mismatch",
    )
    bindings = migrated["checkpointBindings"]
    require(
        set(bindings) == set(LABELS) and bindings == request["checkpointBindings"],
        "Actual four migrated checkpoint bindings required",
    )
    for binding in bindings.values():
        pin(Path(binding["path"]), binding["sha256"])
    summary_path = Path(request["closedDevelopmentSummary"])
    pin(summary_path, SUMMARY_SHA)  # Already consumed by ROOT; never rerun expensive V41 ancestry.
    run = lane(request["futureRun"], LAB / "runs")
    require(run.name.startswith("material-teacher-learning-"), "Fresh lane namespace required")
    curriculum = read(ctx["paths"]["prepare"] / "curriculum.json")
    scope(prepared["metadata"], curriculum, runtime_request["engineSha256"])
    phases = [
        "diagnostic",
        "contexts",
        *[f"contexts-{i + 1}" for i in range(len(request["contextExpansions"]))],
        "imitation",
        "ppo",
        "comparison",
    ]
    require(set(request["phaseBindings"]) == set(phases), "Exact phase wrapper bindings required")
    for phase in phases:
        for key in ("identity", "resourceGo"):
            lane(request["phaseBindings"][phase][key], LAB / "transfers")
    return {
        "request": request,
        "requestPath": path,
        "requestSha256": request_sha,
        "operatorSha256": operator_sha,
        "runtime": runtime,
        "runtimeContext": ctx,
        "prepared": prepared,
        "migrated": migrated,
        "run": run,
        "checkout": ctx["paths"]["checkout"],
        "metadata": prepared["metadata"],
        "curriculum": curriculum,
        "commands": command_plan(ctx["paths"]["checkout"], bindings, request),
    }


def phase_path(ctx: dict[str, Any], phase: str) -> Path:
    require(phase in ctx["request"]["phaseBindings"], "Unknown phase")
    return ctx["run"] / (phase + "-custody")


def whole(ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool) -> dict[str, Any]:
    runtime = ctx["runtime"]
    path = Path(ctx["request"]["phaseBindings"][phase]["identity"])
    pin(path, identity_sha)
    identity = read(path)
    run = phase_path(ctx, phase)
    if closed:
        guard = runtime.extract(
            runtime.V50_PATH,
            runtime.V50_SHA,
            {"verify_whole"},
            {**vars(ctx["runtimeContext"]["v50"]), "RUN": run},
        )
        guard["verify_whole"](identity, ctx["operatorSha256"])
    else:
        require(
            set(identity)
            == {"wholeWrapperPid", "startTicks", "run", "operatorSha256", "wrapperSha256"}
            and type(identity["wholeWrapperPid"]) is int
            and identity["wholeWrapperPid"] > 0
            and isinstance(identity["startTicks"], str)
            and identity["startTicks"].isdigit()
            and sha(identity["wrapperSha256"]),
            "Actual whole wrapper identity required",
        )
        require(
            identity["run"] == run.name
            and identity["operatorSha256"] == ctx["operatorSha256"]
            and ctx["runtimeContext"]["v50"].process_live(identity),
            "Owned wrapper must be live",
        )
        pin(Path(str(run) + "-launch") / "launch.sh", identity["wrapperSha256"])
    return identity


def predecessors(ctx: dict[str, Any], phase: str, selected: set[str]) -> None:
    if phase == "diagnostic":
        expected = set()
    elif phase.startswith("contexts"):
        expected = {"diagnostic"}
    elif phase == "imitation":
        expansions = [f"contexts-{i + 1}" for i in range(len(ctx["request"]["contextExpansions"]))]
        consumed = [name for name in expansions if name in selected]
        require(
            consumed == expansions[: len(consumed)],
            "Expansion collection must be a closed original prefix",
        )
        expected = {"diagnostic", "contexts", *consumed}
    else:
        expected = {"imitation"} if phase == "ppo" else {"ppo"}
    require(selected == expected, "Missing/unknown predecessor closure")


def context_names(approval: dict[str, Any]) -> list[str]:
    return sorted(
        (name for name in approval["predecessors"] if name.startswith("contexts")),
        key=lambda name: 0 if name == "contexts" else int(name.split("-")[1]),
    )


def go(ctx: dict[str, Any], phase: str, approval_sha: str, *, idle: bool) -> dict[str, Any]:
    path = Path(ctx["request"]["phaseBindings"][phase]["resourceGo"])
    pin(path, approval_sha)
    approval = read(path)
    expected = {
        "approved": True,
        "phase": phase,
        "operatorSha256": ctx["operatorSha256"],
        "requestSha256": ctx["requestSha256"],
        "prepareCompletionSha256": ctx["prepared"]["completionSha256"],
        "migrationCompletionSha256": ctx["migrated"]["completionSha256"],
    }
    require(
        ctx["runtimeContext"]["v50"].same({k: approval[k] for k in expected}, expected)
        and set(approval) == {*expected, "predecessors"},
        "ROOT must approve exact actual phase",
    )
    predecessors(ctx, phase, set(approval["predecessors"]))
    for name, bound in approval["predecessors"].items():
        result = closed_phase(ctx, name, bound["identitySha256"])
        require(result["completionSha256"] == bound["completionSha256"], "Predecessor changed")
    if idle:
        ctx["runtime"].host()
        ctx["runtime"].helpers(ctx["runtimeContext"])["foundation"]["require_idle"]()
    return approval


def phase_commands(ctx: dict[str, Any], phase: str) -> list[str]:
    return (
        ["comparison-" + label for label in ("candidate", "primary-before", *LABELS[:3])]
        if phase == "comparison"
        else [phase]
    )


def data_outputs(ctx: dict[str, Any], phase: str) -> dict[str, str]:
    directories = [ctx["run"] / name for name in phase_commands(ctx, phase)]
    if phase == "imitation":
        directories.append(ctx["run"] / "corpus")
    result = {}
    for directory in directories:
        for path in directory.rglob("*"):
            require(
                not any(part.is_symlink() for part in [path, *path.parents]), "Data beneath symlink"
            )
            if path.is_file():
                result[str(path)] = digest(path)
    return result


def tensor_command(
    ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str
) -> list[str]:
    return [
        str(LAB / "venv/bin/python"),
        str(Path(__file__)),
        "tensor-worker",
        "--request",
        str(ctx["requestPath"]),
        "--request-sha256",
        ctx["requestSha256"],
        "--operator-sha256",
        ctx["operatorSha256"],
        "--phase",
        phase,
        "--identity-sha256",
        identity_sha,
        "--resource-go",
        approval_sha,
    ]


def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
    whole(ctx, phase, identity_sha, closed=True)  # Reject live/failed before reading maps.
    directory = phase_path(ctx, phase)
    completion = read(directory / "completion.json")
    require(
        completion["identitySha256"] == identity_sha
        and completion["operatorSha256"] == ctx["operatorSha256"]
        and completion["requestSha256"] == ctx["requestSha256"],
        "Closed phase binding changed",
    )
    require(
        ctx["runtimeContext"]["v50"].file_map(directory, exclude={directory / "completion.json"})
        == completion["outputs"],
        "Closed phase output map changed",
    )
    require(data_outputs(ctx, phase) == completion["dataOutputs"], "Data output inventory changed")
    approval = go(ctx, phase, completion["resourceGoSha256"], idle=False)
    started = read(directory / "started.json")
    require(
        started
        == {
            "identitySha256": identity_sha,
            "resourceGoSha256": completion["resourceGoSha256"],
            "requestSha256": ctx["requestSha256"],
        },
        "Actual phase start changed",
    )
    for name in phase_commands(ctx, phase):
        receipt = read(directory / (name + "-receipt.json"))
        start = read(directory / (name + "-started.json"))
        require(
            receipt["command"] == start["command"] == ctx["commands"][name]
            and type(receipt["exitCode"]) is int
            and receipt["exitCode"] == 0
            and receipt["checkpointPinsAfter"] == start["checkpointPinsBefore"],
            "Actual command/receipt changed",
        )
        pin(directory / (name + ".log"), receipt["logSha256"])
    if phase == "diagnostic" or phase.startswith("contexts"):
        report = collection(ctx, phase)
    elif phase == "comparison":
        report = comparison(ctx)
    else:
        if phase == "ppo":
            records(ctx, phase)
        else:
            corpus(ctx, context_names(approval), create=False)
        receipt = read(directory / "tensor-receipt.json")
        require(
            receipt["command"]
            == tensor_command(ctx, phase, identity_sha, completion["resourceGoSha256"])
            and type(receipt["exitCode"]) is int
            and receipt["exitCode"] == 0,
            "Actual tensor worker did not close zero",
        )
        pin(directory / "tensor.log", receipt["logSha256"])
        report = read(directory / "tensor-proof.json")
    require(
        read(directory / "report.json") == completion["report"] == report
        and completion["acceptedStrengthOrMastery"] is False
        and completion["finalBlindSeedsConsumed"] is False,
        "Closed report changed",
    )
    whole(ctx, phase, identity_sha, closed=True)
    result = {
        "completionSha256": digest(directory / "completion.json"),
        "identitySha256": identity_sha,
        "reportSha256": digest(directory / "report.json"),
        "report": completion["report"],
        "sourceCommit": SOURCE,
        "engineSha256": ctx["prepared"]["engineSha256"],
        "preparedBindings": ctx["prepared"],
        "migrationBindings": ctx["migrated"],
        "acceptedStrengthOrMastery": False,
    }
    if phase in {"imitation", "ppo"}:
        report = completion["report"]
        require(
            report["finiteChangedActualLearningVerified"] is True,
            "Missing actual finite learning proof",
        )
        result.update(
            checkpointPath=str(ctx["run"] / phase / "checkpoint.pt"),
            checkpointSha256=report["checkpointSha256"],
            finiteChangedActualLearningVerified=True,
            actualLearningUpdates=report["actualLearningUpdates"],
            selectedLearningUpdates=report["selectedLearningUpdates"],
        )
        pin(Path(result["checkpointPath"]), result["checkpointSha256"])
    return result


def scheduled(ctx: dict[str, Any], index: int) -> tuple[list[str], int]:
    return definitions(
        ctx["checkout"] / "tools/bot-training/bridge.py",
        ctx["runtimeContext"]["manifest"]["files"]["tools/bot-training/bridge.py"],
        {"scheduled_episode"},
        {"Any": Any},
    )["scheduled_episode"]([d["version"] for d in ctx["curriculum"]["decks"]], index)


def natural(row: dict[str, Any]) -> None:
    require(
        row["type"] == "result"
        and row["terminated"] is True
        and row["truncated"] is False
        and row["reason"] in {"security", "deckOut"}
        and type(row["winnerSeat"]) is int
        and row["winnerSeat"] in (0, 1)
        and type(row["decisions"]) is int
        and 0 < row["decisions"] < 4000
        and not any(row[k] for k in ("errors", "rejections", "asyncRejections"))
        and "trainingForfeit" not in row,
        "Failure/forfeit/cap/non-natural terminal",
    )


def collection(ctx: dict[str, Any], phase: str) -> dict[str, Any]:
    argv = ctx["commands"][phase]
    directory = Path(argv[argv.index("--output") + 1])
    seed, count = (int(argv[argv.index(option) + 1]) for option in ("--seed", "--games"))
    config = read(directory / "config.json")
    driver = "greedy-checkpoint" if phase == "diagnostic" else "teacher"
    require(
        config["metadata"] == ctx["metadata"]
        and config["curriculum"] == ctx["curriculum"]
        and config["featureVersion"] == 7
        and config["seed"] == seed
        and config["games"] == count
        and config["workers"] == 4
        and config["learnerDriver"] == driver,
        "Collector config changed",
    )
    expected_cp = (
        ctx["migrated"]["checkpointBindings"]["challenger"] if phase == "diagnostic" else None
    )
    require(
        config["sourceCheckpoint"] == expected_cp
        and config["device"] == ("cuda" if phase == "diagnostic" else None),
        "Wrong collection driver",
    )
    rows = read(directory / "results.json")
    require(len(rows) == count and not list(directory.glob("*.partial")), "Incomplete producer")
    require(
        {p.name for p in directory.glob("episode-*.jsonl")}
        == {f"episode-{i:05d}.jsonl" for i in range(count)},
        "Producer episode set changed",
    )
    visible: dict[str, set[str]] = {"training": set(), "validation": set()}
    cells: Counter[tuple[str, int]] = Counter()
    contexts: dict[str, list[dict[str, Any]]] = {"training": [], "validation": []}
    helper = load(ctx["checkout"] / "tools/bot-training/learning_mechanisms.py", COVERAGE_SHA)
    schedule = definitions(
        ctx["checkout"] / "tools/bot-training/bridge.py",
        ctx["runtimeContext"]["manifest"]["files"]["tools/bot-training/bridge.py"],
        {"scheduled_episode"},
        {"Any": Any},
    )["scheduled_episode"]
    versions = [d["version"] for d in ctx["curriculum"]["decks"]]
    for index, record in enumerate(rows):
        decks, seat = schedule(versions, index)
        pins = {
            d["version"]: {k: d[k] for k in ("version", "sha256")}
            for d in ctx["curriculum"]["decks"]
        }
        require(
            type(record["index"]) is int
            and record["index"] == index
            and record["complete"] is True
            and type(record["config"]["learnerSeat"]) is int
            and record["config"]
            == {
                "seed": seed + index,
                "decks": decks,
                "deckPins": [pins[v] for v in decks],
                "learnerSeat": seat,
                "teacher": True,
                "maxDecisions": 4000,
                "turnLimit": 60,
                "engineSha256": ctx["metadata"]["engineSha256"],
            },
            "Original producer schedule/source changed",
        )
        natural(record["result"])
        require(
            type(record["result"]["seed"]) is int
            and record["result"]["seed"] == seed + index
            and type(record["result"]["learnerSeat"]) is int
            and record["result"]["learnerSeat"] == seat,
            "Raw terminal producer seed/seat changed",
        )
        require(
            record["decisions"] == record["result"]["decisions"], "Producer terminal choice count"
        )
        path = directory / f"episode-{index:05d}.jsonl"
        decisions = [
            json.loads(line, object_pairs_hook=unique, parse_constant=invalid)
            for line in path.read_text(encoding="utf-8").splitlines()
        ]
        require(len(decisions) == record["decisions"], "Raw choice count changed")
        unavailable = agreements = 0
        for row in decisions:
            window = row["window"]
            label = window["teacher"]["action"]
            require(
                window["type"] == "decision"
                and window.get("role", "learner") == "learner"
                and type(window["observation"]["seat"]) is int
                and window["observation"]["seat"] == seat
                and type(row["action"]) is int
                and row["driver"] == driver
                and type(row["executedAction"]) is int
                and 0 <= row["executedAction"] < len(window["actions"]),
                "Raw producer provenance",
            )
            require(
                label is None or (type(label) is int and 0 <= label < len(window["actions"])),
                "Raw teacher label",
            )
            require(
                row["supervised"] is (label is not None)
                and row["action"] == (0 if label is None else label),
                "Null fallback relabeled",
            )
            if driver == "teacher":
                require(row["executedAction"] == row["action"], "Teacher driver changed")
            unavailable += label is None
            agreements += label is not None and row["executedAction"] == label
            if row["supervised"] and len(window["actions"]) > 1:
                fold = "validation" if index % 5 == 0 else "training"
                contexts[fold].append(helper.sample_context(row))
                visible[fold].update(
                    re.findall(
                        r'"cardId"\s*:\s*"((?:BT26|EX13)-\d{3})"', json.dumps(window["observation"])
                    )
                )
        require(
            unavailable == record["unavailable"] and agreements == record["teacherAgreements"],
            "Producer label accounting changed",
        )
        cells[(decks[seat], seat)] += 1
    require(len(cells) == 88, "All44 both-seat producer required")
    return {
        "games": count,
        "seed": seed,
        "driver": driver,
        "visibleSupervisedSetCardsByFold": {fold: sorted(cards) for fold, cards in visible.items()},
        "coverage": helper.coverage(contexts),
        "physicalExecutionOrStrengthEstablished": False,
    }


def corpus(
    ctx: dict[str, Any], names: list[str], *, create: bool, inspect: bool = False
) -> dict[str, Any]:
    """Join real verified shards; multiples440 preserve ORIGINAL producer index%5."""
    directory = ctx["run"] / "corpus"
    provenance = []
    visible: dict[str, set[str]] = {"training": set(), "validation": set()}
    totals: dict[str, Counter[str]] = {"training": Counter(), "validation": Counter()}
    reports = {name: collection(ctx, name) for name in names}
    for report in reports.values():
        for fold, counter in totals.items():
            counter.update(report["coverage"]["nontrivialSupervisedLabelsByFold"][fold])
            visible[fold].update(report["visibleSupervisedSetCardsByFold"][fold])
    helper = load(ctx["checkout"] / "tools/bot-training/learning_mechanisms.py", COVERAGE_SHA)
    missing = {
        fold: [
            f"{family}:seat{seat}"
            for family in helper.MECHANISMS
            for seat in (0, 1)
            if not totals[fold][f"{family}:seat{seat}"]
        ]
        for fold in totals
    }
    bounded = {
        "allMechanismsBothSeatsBothFolds": not any(missing.values()),
        "missingMechanismSeatsByFold": missing,
        "visibleSupervisedSetCardsByFold": {f: sorted(v) for f, v in visible.items()},
        "physicalExecutionOrStrengthEstablished": False,
    }
    if inspect:
        return bounded
    require(not any(missing.values()), "Missing raw eight-family/both-seat/original-fold positives")
    require(
        len(visible["training"]) == 181,
        "All181 training-fold supervised visibility incomplete; never borrow validation",
    )
    if create:
        require(not directory.exists(), "Preserve prior corpus")
        directory.mkdir()
    offset = 0
    for name, report in reports.items():
        for index in range(report["games"]):
            source = ctx["run"] / name / f"episode-{index:05d}.jsonl"
            target = directory / f"episode-{offset + index:05d}.jsonl"
            require((offset + index) % 5 == index % 5, "Original fold moved")
            if create:
                with target.open("xb") as stream:
                    stream.write(source.read_bytes())
            pin(target, digest(source))
            provenance.append(
                {
                    "file": target.name,
                    "source": str(source),
                    "sha256": digest(source),
                    "originalIndex": index,
                    "originalFold": "validation" if index % 5 == 0 else "training",
                }
            )
        offset += math.ceil(report["games"] / 440) * 440
    config = {
        "metadata": ctx["metadata"],
        "curriculum": ctx["curriculum"],
        "featureVersion": 7,
        "originalProducerEpisodeProvenance": provenance,
        "games": len(provenance),
    }
    if create:
        write(directory / "config.json", config)
    require(read(directory / "config.json") == config, "Corpus source provenance changed")
    require(
        {p.name for p in directory.glob("episode-*.jsonl")} == {p["file"] for p in provenance},
        "Unexpected corpus episodes",
    )
    report = helper.inspect_dataset(directory)
    require(report["allMechanismsBothSeatsBothFolds"] is True, "Replayed raw coverage changed")
    return {
        **report,
        **bounded,
        "sourceTerminalAndCustodyVerified": True,
        "originalProducerEpisodeProvenance": provenance,
    }


def record_guard(ctx: dict[str, Any], phase: str) -> dict[str, Any]:
    training = phase == "ppo"
    seed = ctx["request"]["seeds"]["ppo" if training else "comparison"]
    edits = {
        "(3872, 6196000) if training else (1352, 6203000)": f"(3872, {seed})",
        "10 if training else 52": "88",
        "pins['curriculum'] if training else pins['metadata']": "pins['curriculum']",
        "44 if training else 26": "44",
        "'curriculum' not in config": "config['curriculum'] == pins['curriculum']",
    }
    if training:
        edits.update(
            {
                "config['learnerDecks'] == config['opponentCheckpoints'] == []": "config['learnerDecks'] == [] and config['opponentCheckpoints'] == pins['opponentPaths']",
                "1.0": "0.60",
                "0.001": "0.00001",
                "250": "352",
                "row['opponentName'] == 'heuristic'": "row['opponentName'] in ['heuristic', *pins['opponentPaths']]",
            }
        )
    return definitions(
        GLOBAL,
        GLOBAL_SHA,
        {"expected_payment_forfeit", "check_records"},
        {"Any": Any, "Path": Path, "math": math, "read": read},
        edits,
    )


def records(ctx: dict[str, Any], phase: str) -> dict[str, Any]:
    argv = ctx["commands"][phase]
    directory = Path(argv[argv.index("--output") + 1])
    checkpoint = Path(argv[argv.index("--checkpoint") + 1])
    bindings = ctx["migrated"]["checkpointBindings"]
    pins = {
        "metadata": ctx["metadata"],
        "curriculum": ctx["curriculum"],
        "opponentPaths": [bindings[label]["path"] for label in LABELS[:3]],
    }
    report = record_guard(ctx, phase)["check_records"](
        directory, digest(checkpoint), pins, training=phase == "ppo"
    )
    rows = read(directory / "results.json")["episodes"]
    config = read(directory / "config.json")
    require(config["streamEvaluation"] is False, "Streaming parity not admitted")
    for index, row in enumerate(rows):
        natural(row)  # Strict additional rejection of every forfeiture and decision cap.
        if phase == "ppo":
            draw = random.Random(ctx["request"]["seeds"]["ppo"] * 1_000_003 + index)
            expected = (
                "heuristic" if draw.random() < 0.60 else pins["opponentPaths"][draw.randrange(3)]
            )
            require(row["opponentName"] == expected, "Original frozen league schedule changed")
    return report


def comparison(ctx: dict[str, Any]) -> dict[str, Any]:
    reports = {
        label: records(ctx, "comparison-" + label)
        for label in ("candidate", "primary-before", *LABELS[:3])
    }
    original = definitions(
        HELPER, HELPER_SHA, {"compare"}, {"Any": Any, "read": read, "RUN": ctx["run"]}
    )
    adapted = {
        "challenger": reports["candidate"],
        **{label: reports[label] for label in LABELS[:3]},
    }

    def original_read(path: Path) -> Any:
        label = path.parent.name
        mapped = "candidate" if label == "challenger" else label
        return read(ctx["run"] / ("comparison-" + mapped) / path.name)

    original["compare"].__globals__["read"] = original_read
    result = original["compare"](
        adapted
    )  # Exact V27 comparator retains its original V17/source verdicts.
    current = read(ctx["run"] / "comparison-candidate/results.json")["episodes"]
    extra = {}
    for label in ("primary-before", "fitted-reference"):
        before = read(ctx["run"] / ("comparison-" + label) / "results.json")["episodes"]
        counts = Counter()
        for old, new in zip(before, current, strict=True):
            require(
                all(old[k] == new[k] for k in ("seed", "decks", "learnerSeat", "deckPins")),
                "Unpaired comparison",
            )
            counts[
                "improved"
                if new["reward"] > old["reward"]
                else "regressed"
                if new["reward"] < old["reward"]
                else "unchanged"
            ] += 1
        extra[label] = {
            "paired": dict(counts),
            "strictlyGainsEveryRecipe": all(
                reports["candidate"]["byDeck"][version]["wins"]
                > reports[label]["byDeck"][version]["wins"]
                for version in reports["candidate"]["byDeck"]
            ),
        }
    return {
        "originalComparison": result,
        "additionalComparisons": extra,
        "policies": reports,
        "physicalExecutionOrStrengthAccepted": False,
        "finalBlindSeedsConsumed": False,
    }


def execute(ctx: dict[str, Any], phase: str, argv: list[str], ordinal: str) -> dict[str, Any]:
    directory = phase_path(ctx, phase)
    output = Path(argv[argv.index("--output") + 1])
    require(not output.exists(), "Preserve existing phase data")
    before = {
        b["path"]: digest(Path(b["path"])) for b in ctx["migrated"]["checkpointBindings"].values()
    }
    if "--checkpoint" in argv:
        source_path = argv[argv.index("--checkpoint") + 1]
        before[source_path] = digest(Path(source_path))
    write(
        directory / (ordinal + "-started.json"), {"command": argv, "checkpointPinsBefore": before}
    )
    with (directory / (ordinal + ".log")).open("xb") as log:
        result = subprocess.run(
            argv,
            cwd=ctx["checkout"] / "tools/bot-training",
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "OMP_NUM_THREADS": "2",
                "MKL_NUM_THREADS": "2",
            },
        )
    receipt = {
        "command": argv,
        "exitCode": result.returncode,
        "logSha256": digest(directory / (ordinal + ".log")),
        "checkpointPinsAfter": {p: digest(Path(p)) for p in before},
    }
    write(directory / (ordinal + "-receipt.json"), receipt)
    require(
        type(result.returncode) is int
        and result.returncode == 0
        and receipt["checkpointPinsAfter"] == before,
        "Worker failed or preserved policy mutated",
    )
    return receipt


def run(ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str) -> None:
    whole(ctx, phase, identity_sha, closed=False)
    approval = go(ctx, phase, approval_sha, idle=True)
    directory = phase_path(ctx, phase)
    require(not directory.exists(), "Preserve prior phase")
    directory.mkdir(parents=True)
    write(
        directory / "started.json",
        {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "requestSha256": ctx["requestSha256"],
        },
    )
    inventory = definitions(
        ctx["checkout"] / "tools/bot-training/prepare_learning.py",
        PLAN_SHA,
        {"fresh_inventory"},
        {
            "Any": Any,
            "Path": Path,
            "ast": ast,
            "re": re,
            "LAB": LAB,
            "require": require,
            "read": read,
            "digest": digest,
            "INVENTORY": HELPER,
            "INVENTORY_SHA": HELPER_SHA,
        },
    )
    selected = [
        (name, seed, count)
        for name, seed, count in blocks(ctx["request"])
        if name == phase or (phase == "comparison" and name == "comparison")
    ]
    write(
        directory / "fresh-seed-inventory.json",
        {
            name: inventory["fresh_inventory"](ctx["run"], seed, count)
            for name, seed, count in selected
        },
    )
    if phase == "imitation":
        write(
            directory / "corpus-coverage.json", corpus(ctx, context_names(approval), create=True)
        )  # BEFORE model imports/child.
    names = (
        ["comparison-" + label for label in ("candidate", "primary-before", *LABELS[:3])]
        if phase == "comparison"
        else [phase]
    )
    for name in names:
        execute(ctx, phase, ctx["commands"][name], name)
    if phase == "diagnostic" or phase.startswith("contexts"):
        report = collection(ctx, phase)
    elif phase == "comparison":
        report = comparison(ctx)
    else:
        if phase == "ppo":
            records(ctx, phase)
        argv = tensor_command(ctx, phase, identity_sha, approval_sha)
        with (directory / "tensor.log").open("xb") as log:
            child = subprocess.run(
                argv,
                check=False,
                stdout=log,
                stderr=subprocess.STDOUT,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
        write(
            directory / "tensor-receipt.json",
            {
                "command": argv,
                "exitCode": child.returncode,
                "logSha256": digest(directory / "tensor.log"),
            },
        )
        require(child.returncode == 0, "Actual tensor proof child failed")
        report = read(directory / "tensor-proof.json")
    # Recheck actual runtime and all original policies after all children, before sealing.
    require(
        context(ctx["requestPath"], ctx["requestSha256"], ctx["operatorSha256"])["migrated"]
        == ctx["migrated"],
        "Runtime/migration mutated during phase",
    )
    go(ctx, phase, approval_sha, idle=False)
    write(directory / "report.json", report)
    outputs = ctx["runtimeContext"]["v50"].file_map(directory, exclude=set())
    data = data_outputs(ctx, phase)
    write(
        directory / "completion.json",
        {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "operatorSha256": ctx["operatorSha256"],
            "requestSha256": ctx["requestSha256"],
            "report": report,
            "outputs": outputs,
            "dataOutputs": data,
            "acceptedStrengthOrMastery": False,
            "finalBlindSeedsConsumed": False,
        },
    )


def tensor_worker(ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str) -> None:
    """Real finite changed tensors/Adam/reload proof, admitted only in the ROOT phase."""
    require(phase in {"imitation", "ppo"}, "Unexpected tensor phase")
    whole(ctx, phase, identity_sha, closed=False)
    approval = go(ctx, phase, approval_sha, idle=False)
    if phase == "ppo":
        fit_completion = read(phase_path(ctx, "imitation") / "completion.json")
        approval = go(ctx, "imitation", fit_completion["resourceGoSha256"], idle=False)
    coverage = corpus(
        ctx, context_names(approval), create=False
    )  # Verify raw producer/folds BEFORE importing Torch.
    write(
        phase_path(ctx, phase) / "tensor-worker-started.json",
        {"pid": os.getpid(), "identitySha256": identity_sha, "resourceGoSha256": approval_sha},
    )
    sys.path.insert(0, str(ctx["checkout"] / "tools/bot-training"))
    import numpy as np
    import torch  # Model libraries are confined to this separately recorded child.

    from features import FeatureEncoder
    from imitate import mechanism_epoch_order
    from model import CandidatePolicy

    torch.set_num_threads(2)
    argv = ctx["commands"][phase]
    source_path = Path(argv[argv.index("--checkpoint") + 1])
    source_sha = digest(source_path)
    before = torch.load(source_path, map_location="cpu", weights_only=True)
    directory = ctx["run"] / phase
    config = read(directory / "config.json")
    require(
        before["metadata"] == config["metadata"] == ctx["metadata"]
        and before["featureVersion"] == 7,
        "Tensor source/schema mismatch",
    )
    encoder = FeatureEncoder(ctx["metadata"]["cardIds"], ctx["metadata"]["keywords"])
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
    model.load_state_dict(before["model"], strict=True)
    require(len(before["model"]) == 12, "Single unchanged model shape required")
    expected_updates = {0: 0}
    if phase == "imitation":
        require(
            config["sourceHashes"] == coverage["sourceHashes"]
            and config["sourceCheckpoint"]["sha256"] == source_sha
            and config["seed"] == ctx["request"]["imitationSeed"]
            and config["epochs"] == 3
            and config["learningRate"] == config["learningRateOverride"] == 0.00001
            and config["policyAnchor"] == 0.25
            and config["mechanismShare"] == 0.20
            and config["compoundShare"] == 0
            and config["teacherLossScope"] == "all"
            and config["newCardColumnsOnly"] is False
            and config["adaptedCardIds"] == [],
            "Imitation scope changed",
        )
        require(
            config["split"] == coverage["originalIndexModuloFiveEpisodeFolds"],
            "Original folds changed",
        )
        helper = load(ctx["checkout"] / "tools/bot-training/learning_mechanisms.py", COVERAGE_SHA)
        raw_contexts: dict[str, list[dict[str, Any]]] = {"training": [], "validation": []}
        for episode in sorted((ctx["run"] / "corpus").glob("episode-*.jsonl")):
            fold = "validation" if int(episode.stem.split("-")[-1]) % 5 == 0 else "training"
            for line in episode.read_text(encoding="utf-8").splitlines():
                row = json.loads(line, object_pairs_hook=unique, parse_constant=invalid)
                if row["supervised"] and len(row["window"]["actions"]) > 1:
                    raw_contexts[fold].append(helper.sample_context(row))
        contexts = read(directory / "sample-mechanisms.json")
        require(contexts == raw_contexts, "Cached contexts differ from original raw labels/folds")
        for name, value in config["implementationHashes"].items():
            pin(ctx["checkout"] / "tools/bot-training" / name, value)
            require(
                value == ctx["runtimeContext"]["manifest"]["files"]["tools/bot-training/" + name],
                "Implementation changed",
            )
        rng = np.random.default_rng(config["seed"])
        history = read(directory / "results.json")
        require([row["epoch"] for row in history] == [0, 1, 2, 3], "Incomplete imitation")
        for row in history[1:]:
            order, anchored = mechanism_epoch_order(contexts["training"], rng, 0.20)
            expected_updates[row["epoch"]] = expected_updates[row["epoch"] - 1] + math.ceil(
                len(order) / 128
            )
            require(
                row["updates"] == expected_updates[row["epoch"]]
                and row["trainingSamples"] == len(order)
                and row["unanchoredSamples"] == int((~anchored).sum())
                and math.isfinite(row["parameterChangeNorm"])
                and row["parameterChangeNorm"] > 0,
                "Actual imitation updates missing",
            )
        for row in history:
            for fold in ("training", "validation"):
                metric = row[fold]
                require(
                    metric["decisions"] == len(raw_contexts[fold])
                    and math.isfinite(metric["loss"])
                    and metric["loss"] >= 0
                    and math.isfinite(metric["accuracy"])
                    and 0 <= metric["accuracy"] <= 1,
                    "Nonfinite or mismatched imitation metrics",
                )
        selected_epoch = min(history, key=lambda row: row["validation"]["loss"])["epoch"]
        pin(
            directory / "checkpoint.pt",
            digest(directory / f"checkpoint-epoch-{selected_epoch:03d}.pt"),
        )
        paths = [
            (epoch, directory / f"checkpoint-epoch-{epoch:03d}.pt") for epoch in expected_updates
        ]
    else:
        records(ctx, "ppo")
        selected_epoch = None
        paths = [(None, directory / "checkpoint.pt")]
    snapshots = {}
    parameter_ids = [
        key for group in before["optimizer"]["param_groups"] for key in group["params"]
    ]
    require(
        len(set(parameter_ids)) == len(parameter_ids) == 12
        and set(parameter_ids) == set(before["optimizer"]["state"]),
        "Adam model binding mismatch",
    )
    parameter_names = dict(zip(parameter_ids, before["model"], strict=True))
    for epoch, path in paths:
        learned = torch.load(path, map_location="cpu", weights_only=True)
        require(
            learned["metadata"] == before["metadata"]
            and learned["featureVersion"] == 7
            and list(learned["model"]) == list(before["model"]),
            "Saved model mismatch",
        )
        changes = {}
        for name, old in before["model"].items():
            new = learned["model"][name]
            require(
                old.shape == new.shape
                and old.dtype == new.dtype
                and torch.isfinite(old).all().item()
                and torch.isfinite(new).all().item(),
                "Nonfinite/shape change",
            )
            changes[name] = float((new - old).abs().max())
            if epoch == 0 or (phase == "imitation" and name.startswith("value.")):
                require(torch.equal(new, old), "Inactive or epoch0 model changed")
        require(epoch == 0 or max(changes.values()) > 0, "No actual model update")
        require(
            learned["optimizer"]["state"].keys() == before["optimizer"]["state"].keys(),
            "Adam inventory changed",
        )
        deltas = {}
        for key, old in before["optimizer"]["state"].items():
            new = learned["optimizer"]["state"][key]
            inactive = phase == "imitation" and parameter_names[key].startswith("value.")
            require(new.keys() == old.keys(), "Adam field mismatch")
            for field, old_tensor in old.items():
                tensor = new[field]
                require(
                    torch.isfinite(tensor).all().item()
                    and torch.isfinite(old_tensor).all().item()
                    and old_tensor.shape == tensor.shape
                    and old_tensor.dtype == tensor.dtype,
                    "Adam tensor invalid",
                )
                if field != "step":
                    require(
                        tensor.shape == before["model"][parameter_names[key]].shape,
                        "Adam parameter shape",
                    )
                if inactive or epoch == 0:
                    require(torch.equal(tensor, old_tensor), "Inactive/epoch0 Adam changed")
            step = new["step"].item()
            delta = step - old["step"].item()
            require(
                new["step"].ndim == 0 and step >= 0 and step == int(step) and delta == int(delta),
                "Invalid Adam step",
            )
            require(
                delta == (0 if inactive else expected_updates[epoch])
                if phase == "imitation"
                else delta > 0,
                "Actual Adam update mismatch",
            )
            deltas[parameter_names[key]] = int(delta)
        for old, new in zip(
            before["optimizer"]["param_groups"], learned["optimizer"]["param_groups"], strict=True
        ):
            require(
                new["lr"] == (0.00001 if phase == "imitation" else 0.00003)
                and {k: v for k, v in old.items() if k != "lr"}
                == {k: v for k, v in new.items() if k != "lr"},
                "Non-rate Adam settings changed",
            )
        if phase == "ppo":
            require(
                len(set(deltas.values())) == 1
                and learned["games"] == 3872
                and learned["seed"] == ctx["request"]["seeds"]["ppo"],
                "PPO continuation mismatch",
            )
            require(
                max(changes.values())
                == read(directory / "verification.json")["maxParameterChange"],
                "Changed tensor report mismatch",
            )
        else:
            require(
                learned["imitationEpoch"] == epoch
                and learned["imitationUpdates"] == expected_updates[epoch]
                and learned["imitationSource"]["sha256"] == source_sha,
                "Imitation saved update provenance",
            )
        model.load_state_dict(learned["model"], strict=True)
        require(
            all(torch.equal(t, learned["model"][name]) for name, t in model.state_dict().items()),
            "Reload mismatch",
        )
        snapshots[str(epoch)] = {
            "sha256": digest(path),
            "modelChanges": changes,
            "optimizerStepDeltas": deltas,
            "reloadExact": True,
        }
    pin(source_path, source_sha)
    write(
        phase_path(ctx, phase) / "tensor-proof.json",
        {
            "phase": phase,
            "sourceCheckpointSha256": source_sha,
            "checkpointSha256": digest(directory / "checkpoint.pt"),
            "selectedEpoch": selected_epoch,
            "epochZeroEligible": True,
            "snapshots": snapshots,
            "actualLearningUpdates": expected_updates[3]
            if phase == "imitation"
            else next(iter(deltas.values())),
            "selectedLearningUpdates": expected_updates[selected_epoch]
            if phase == "imitation"
            else next(iter(deltas.values())),
            "finiteChangedActualLearningVerified": True,
            "selectedPolicyActuallyChanged": selected_epoch != 0,
            "acceptedStrengthOrMastery": False,
        },
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("inspect", "coverage", "run", "closed", "tensor-worker"))
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--operator-sha256", required=True)
    parser.add_argument("--phase")
    parser.add_argument("--identity-sha256")
    parser.add_argument("--resource-go")
    args = parser.parse_args()
    ctx = context(args.request, args.request_sha256, args.operator_sha256)
    if args.mode == "inspect":
        print(
            json.dumps(
                {
                    "commands": ctx["commands"],
                    "seedBlocksHalfOpen": {
                        name: [seed, seed + count] for name, seed, count in blocks(ctx["request"])
                    },
                    "launchesAnyJob": False,
                    "automaticSuccessors": False,
                    "acceptedStrengthOrMastery": False,
                }
            )
        )
    elif args.mode == "coverage":
        approval = go(ctx, "imitation", args.resource_go, idle=False)
        print(json.dumps(corpus(ctx, context_names(approval), create=False, inspect=True)))
    elif args.mode == "closed":
        print(json.dumps(closed_phase(ctx, args.phase, args.identity_sha256)))
    elif args.mode == "run":
        run(ctx, args.phase, args.identity_sha256, args.resource_go)
    else:
        tensor_worker(ctx, args.phase, args.identity_sha256, args.resource_go)


if __name__ == "__main__":
    main()
