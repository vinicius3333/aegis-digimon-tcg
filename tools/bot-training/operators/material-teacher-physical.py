"""ROOT-gated candidate-only autonomous physical/material capture and stdlib reader.

External to the frozen checkout. Original capture, schedule, reconstruction and
custody consumers are SHA-pinned ASTs; no reference capture, rooms or training.
Unknown runtime/candidate/seed/whole/Go pins cannot admit model imports.
"""

import argparse
import ast
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
SOURCE = "1cec011c0fd0c6481e7297506ed4c825a4dfcdc7"
ARCHIVE = "7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080"
MANIFEST = "0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68"
RUNTIME_SHA = "576d520584faf47b915460d56c5026b95f9768fe3fc6df57aebdae3d55fdee71"
ORIGINALS = {
    "schedule": (
        LAB / "transfers/aegis-v27-fresh-physical-schedule.py",
        "1b172bd13311bdf133768a6149dc6f0e1c6493bcab59a853097138db1583ab29",
    ),
    "capture": (
        LAB / "runs/2026-10-04-bt26-ex13-v19b-cold-comparison/operator.py",
        "4d1c6379d954cb4f10ddbd0fa3de96cbf8bf77810a6f0d309f5ea222a0f6cbb8",
    ),
    "reader": (
        LAB / "runs/2026-10-04-bt26-ex13-v20-neural-winner-dataset/source-reader.py",
        "9cd48ec02f54c4385081de6edcf965029bcb990b461ab632e52489308ae5879e",
    ),
    "physical": (
        LAB / "transfers/aegis-v42-corrective-physical-comparison.py",
        "a85478961a835158c8a38088ea23fc4b650e8ae25fd5a7d6b95e40595b5c4ccf",
    ),
    "custody": (
        LAB / "transfers/aegis-v44-current-material-custody.py",
        "da832d7cca2ab5d4d57dc9c93cc746451099beb6c68bd572f11a84451cfc52a4",
    ),
    "extractor": (
        LAB / "transfers/aegis-v44-material-witness-extractor.py",
        "ba2bd72bc3673834bb0c8410bbab3ca7b57c09ed007f9801685088c31d3bfb61",
    ),
    "inventory": (
        LAB / "transfers/aegis-v27-fresh-curriculum-comparison.py",
        "c984171ddba83eecf49b0f41c20a5fe221e7a777a0b81e456acb02cfecdd15a9",
    ),
}
FAMILIES = ("mainAssembly", "effectAssembly", "mainDigiXros", "effectDigiXros")
REGISTERED = {f"BT26-{i:03}" for i in range(1, 105)} | {f"EX13-{i:03}" for i in range(1, 78)}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch("[a-f0-9]{64}", value) is not None


def digest(path: Path) -> str:
    require(path.is_file() and not path.is_symlink(), "Missing regular pinned file")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pin(path: Path, value: Any) -> None:
    require(sha(value) and digest(path) == value, "Unknown/mismatched byte pin")


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


def lane(value: Any, parent: Path) -> Path:
    require(isinstance(value, str), "Actual path required")
    path = Path(value)
    require(
        path.is_absolute() and path.parent == parent and ".." not in path.parts, "Unsafe lane path"
    )
    require(not any(p.is_symlink() for p in [path, *path.parents]), "Symlink path")
    return path


def load(path: Path, value: str) -> Any:
    pin(path, value)
    module = ModuleType("physical_" + value)
    module.__file__ = str(path)
    exec(compile(path.read_bytes(), str(path), "exec"), vars(module))  # noqa: S102 - exact SHA-pinned source, never cached bytecode.
    pin(path, value)
    return module


def definitions(kind: str, names: set[str], namespace: dict[str, Any]) -> dict[str, Any]:
    """Unchanged function ASTs; target/source/seed globals are declared selectors."""
    path, value = ORIGINALS[kind]
    pin(path, value)
    nodes = [
        n
        for n in ast.parse(path.read_text(encoding="utf-8")).body
        if isinstance(n, ast.FunctionDef) and n.name in names
    ]
    require({n.name for n in nodes} == names, "Missing original validator")
    result = dict(namespace)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), result)  # noqa: S102 - unchanged SHA-pinned original function ASTs, no producer main/imports.
    return result


def request_fields(request: dict[str, Any]) -> None:
    require(
        request["formatVersion"] == 1 and request["candidateMode"] == "trained-ppo",
        "Only actual newly trained PPO candidate",
    )
    item = request["learning"]
    require(
        request["runtimeReaderSha256"] == RUNTIME_SHA, "ROOT-bound reviewed source adapter required"
    )
    for key in (
        "operatorSha256",
        "requestSha256",
        "identitySha256",
        "completionSha256",
        "reportSha256",
        "checkpointSha256",
    ):
        require(sha(item[key]), "Actual closed PPO pins required")
    for key in ("operator", "request"):
        lane(item[key], LAB / "transfers")
    require(isinstance(item["checkpointPath"], str), "Unknown checkpoint path")
    for key in ("engineSha256", "prepareCompletionSha256", "migrationCompletionSha256"):
        require(sha(request[key]), "Actual current runtime pins required")
    paths = [
        lane(request[key], LAB / ("runs" if key == "run" else "transfers"))
        for key in ("run", "identity", "resourceGo")
    ]
    require(
        all(p.name.startswith("material-teacher-physical-") for p in paths)
        and len(set(paths)) == 3,
        "Fresh physical namespaces required",
    )
    blocks = request["blocks"]
    require(isinstance(blocks, list) and bool(blocks), "ROOT must allocate first fresh440 block")
    used: set[int] = set()
    inventories = []
    for block in blocks:
        seed = block["seed"]
        require(
            type(seed) is int
            and seed >= 0
            and block["games"] == 440
            and type(block["games"]) is int
            and seed + 440 < 6210000,
            "Exact fresh440 below final reserved seeds",
        )
        selected = set(range(seed, seed + 440))
        require(
            not selected & used and not selected & set(range(6153000, 6153440)),
            "Overlapping/reused old physical block",
        )
        used |= selected
        require(sha(block["inventorySha256"]), "ROOT fresh scanner receipt required")
        inventories.append(lane(block["inventory"], LAB / "transfers"))
    require(len(set(inventories)) == len(inventories), "Separate sealed seed inventories")


def candidate_binding(ctx: dict[str, Any], learned: dict[str, Any]) -> dict[str, str]:
    request, prepared, migrated = (
        ctx["request"],
        ctx["learningContext"]["prepared"],
        ctx["learningContext"]["migrated"],
    )
    item = request["learning"]
    require(
        all(learned[k] == item[k] for k in ("identitySha256", "completionSha256", "reportSha256")),
        "PPO closure pins differ",
    )
    require(
        learned["sourceCommit"] == prepared["sourceCommit"] == migrated["sourceCommit"] == SOURCE
        and learned["engineSha256"]
        == prepared["engineSha256"]
        == migrated["engineSha256"]
        == request["engineSha256"],
        "Candidate/source/current engine mismatch",
    )
    require(
        learned["preparedBindings"] == prepared
        and learned["migrationBindings"] == migrated
        and prepared["completionSha256"] == request["prepareCompletionSha256"]
        and migrated["completionSha256"] == request["migrationCompletionSha256"],
        "Actual source/runtime custody differs",
    )
    require(
        learned["finiteChangedActualLearningVerified"] is True
        and type(learned["actualLearningUpdates"]) is int
        and learned["actualLearningUpdates"] > 0
        and type(learned["selectedLearningUpdates"]) is int
        and learned["selectedLearningUpdates"] == learned["actualLearningUpdates"]
        and learned["acceptedStrengthOrMastery"] is False,
        "Actual changed finite Adam PPO proof required",
    )
    result = {"path": learned["checkpointPath"], "sha256": learned["checkpointSha256"]}
    require(
        result == {"path": item["checkpointPath"], "sha256": item["checkpointSha256"]},
        "ROOT selected actual candidate differs",
    )
    require(
        Path(result["path"]) == ctx["learningContext"]["run"] / "ppo/checkpoint.pt",
        "Only selected new PPO checkpoint",
    )
    pin(Path(result["path"]), result["sha256"])
    return result


def schedule(curriculum: dict[str, Any], engine: str, seed: int) -> list[dict[str, Any]]:
    return definitions(
        "schedule",
        {"configs"},
        {"Any": Any, "Counter": Counter, "ENGINE_SHA": engine, "SEED": seed},
    )["configs"](curriculum)


def inventory_fields(value: dict[str, Any], run: Path, seed: int) -> None:
    require(
        value["seed"] == seed
        and type(value["seed"]) is int
        and value["games"] == 440
        and type(value["games"]) is int
        and value["freshAtStart"] is True
        and value["observedOverlap"] == []
        and value["roots"] == ["runs", "validations"]
        and value["excludedThisNewRun"] == str(run),
        "Fresh seed receipt scope mismatch",
    )
    require(
        isinstance(value["observedScheduleFiles"], list) and bool(value["observedScheduleFiles"]),
        "Actual scanner inventory missing",
    )
    require(
        all(
            isinstance(row["path"], str) and sha(row["sha256"])
            for row in value["observedScheduleFiles"]
        ),
        "Invalid scanner file map",
    )


def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    sys.dont_write_bytecode = True
    require(__debug__ and "torch" not in sys.modules, "Stdlib admission without -O/preloaded Torch")
    pin(Path(__file__), operator_sha)
    pin(path, request_sha)
    request = read(path)
    request_fields(
        request
    )  # Reject unknown future hashes/seeds before loading even the stdlib learning consumer.
    item = request["learning"]
    learning = load(Path(item["operator"]), item["operatorSha256"])
    lc = learning.context(Path(item["request"]), item["requestSha256"], item["operatorSha256"])
    source = lc["runtimeContext"]["request"]["source"]
    require(
        source["commit"] == SOURCE
        and source["archive"]["sha256"] == ARCHIVE
        and source["archive"]["bytes"] == 43769742
        and source["manifest"]["sha256"] == MANIFEST
        and lc["request"]["runtime"]["operatorSha256"] == RUNTIME_SHA,
        "Frozen qualified teacher source required",
    )
    learned = learning.closed_phase(lc, "ppo", item["identitySha256"])
    ctx = {
        "request": request,
        "requestPath": path,
        "requestSha256": request_sha,
        "operatorSha256": operator_sha,
        "learning": learning,
        "learningContext": lc,
        "learned": learned,
        "run": lane(request["run"], LAB / "runs"),
        "metadata": lc["metadata"],
        "curriculum": lc["curriculum"],
        "checkout": lc["checkout"],
    }
    ctx["candidate"] = candidate_binding(ctx, learned)
    learning.scope(ctx["metadata"], ctx["curriculum"], request["engineSha256"])
    for original, expected in ORIGINALS.values():
        pin(original, expected)
    for block in request["blocks"]:
        pin(Path(block["inventory"]), block["inventorySha256"])
        inventory_fields(read(Path(block["inventory"])), ctx["run"], block["seed"])
    ctx["configs"] = [
        sample
        for block in request["blocks"]
        for sample in schedule(ctx["curriculum"], request["engineSha256"], block["seed"])
    ]
    ctx["immutableMaps"] = immutable_maps(ctx)
    require("torch" not in sys.modules, "Model imported during admission")
    return ctx


def whole(ctx: dict[str, Any], identity_sha: str, *, closed: bool) -> dict[str, Any]:
    path = Path(ctx["request"]["identity"])
    pin(path, identity_sha)
    identity = read(path)
    require(
        set(identity) == {"wholeWrapperPid", "startTicks", "run", "operatorSha256", "wrapperSha256"}
        and type(identity["wholeWrapperPid"]) is int
        and identity["wholeWrapperPid"] > 0
        and isinstance(identity["startTicks"], str)
        and re.fullmatch("[0-9]+", identity["startTicks"]) is not None
        and sha(identity["wrapperSha256"])
        and identity["run"] == ctx["run"].name
        and identity["operatorSha256"] == ctx["operatorSha256"],
        "Exact actual physical whole identity",
    )
    lc = ctx["learningContext"]
    runtime, rc = lc["runtime"], lc["runtimeContext"]
    launch = Path(str(ctx["run"]) + "-launch")
    require(launch.is_dir() and not launch.is_symlink(), "Actual launch directory")
    pin(launch / "launch.sh", identity["wrapperSha256"])
    if closed:
        runtime.extract(
            runtime.V50_PATH,
            runtime.V50_SHA,
            {"verify_whole"},
            {**vars(rc["v50"]), "RUN": ctx["run"]},
        )["verify_whole"](identity, ctx["operatorSha256"])
        digest(launch / "exit-code.txt")
    else:
        require(
            rc["v50"].process_live(identity)
            and not (launch / "exit-code.txt").exists()
            and not (launch / "exit-code.txt").is_symlink(),
            "ROOT owned whole must still be live/incomplete",
        )
    return identity


def go(ctx: dict[str, Any], identity_sha: str, approval_sha: str, *, idle: bool) -> None:
    path = Path(ctx["request"]["resourceGo"])
    pin(path, approval_sha)
    expected = {
        "approved": True,
        "phase": "physical",
        "operatorSha256": ctx["operatorSha256"],
        "requestSha256": ctx["requestSha256"],
        "identitySha256": identity_sha,
        "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        "checkpointSha256": ctx["candidate"]["sha256"],
        "engineSha256": ctx["request"]["engineSha256"],
        "prepareCompletionSha256": ctx["request"]["prepareCompletionSha256"],
        "migrationCompletionSha256": ctx["request"]["migrationCompletionSha256"],
        "blocks": ctx["request"]["blocks"],
    }
    require(
        ctx["learningContext"]["runtimeContext"]["v50"].same(read(path), expected),
        "ROOT explicit exact physical resource Go required",
    )
    if idle:
        lc = ctx["learningContext"]
        lc["runtime"].host()
        lc["runtime"].helpers(lc["runtimeContext"])["foundation"]["require_idle"]()


def command(ctx: dict[str, Any], identity_sha: str, approval_sha: str) -> list[str]:
    return [
        str(LAB / "venv/bin/python"),
        str(Path(__file__)),
        "capture-worker",
        "--request",
        str(ctx["requestPath"]),
        "--request-sha256",
        ctx["requestSha256"],
        "--operator-sha256",
        ctx["operatorSha256"],
        "--identity-sha256",
        identity_sha,
        "--resource-go",
        approval_sha,
    ]


def consumers(ctx: dict[str, Any], extra: dict[str, Any] | None = None) -> dict[str, Any]:
    namespace = {
        "Any": Any,
        "Json": dict[str, Any],
        "Path": Path,
        "Counter": Counter,
        "json": json,
        "digest": digest,
        "ENGINE_SHA": ctx["request"]["engineSha256"],
        "WORKER": ctx["checkout"] / "apps/api/dist/bot/training/cli.js",
        "FAMILIES": FAMILIES,
        "Episode": Any,
        "verify_recipe_pins": Any,
        "CheckpointScorer": Any,
        **(extra or {}),
    }
    capture = definitions(
        "capture",
        {"own_board", "make_event", "witness", "observe_events", "visible_cards", "capture_game"},
        namespace,
    )
    reader = definitions(
        "reader",
        {"reward", "visible_identities", "checked_trace", "load_trace", "checked_compound_events"},
        namespace,
    )
    physical = definitions("physical", {"physical_summary"}, namespace)
    custody = definitions("custody", {"summarize"}, namespace)
    return {
        "capture": capture,
        "reader": reader,
        "physical": physical,
        "custody": custody,
        "extractor": load(*ORIGINALS["extractor"]),
    }


def row_guard(ctx: dict[str, Any], row: dict[str, Any], sample: dict[str, Any]) -> None:
    require(
        row["config"] == sample["config"]
        and row["sample"] == sample["kind"]
        and row["teacherSeenSeed"] is False,
        "Exact original autonomous scheduled cell required",
    )
    require(
        row["usable"] is True
        and zero(row["workerExit"])
        and type(row["choices"]) is int
        and row["choices"] == row["result"]["decisions"],
        "Actual usable worker exit/decisions required",
    )
    require(
        type(row["result"]["seed"]) is int
        and row["result"]["seed"] == sample["config"]["seed"]
        and type(row["result"]["learnerSeat"]) is int
        and row["result"]["learnerSeat"] == sample["config"]["learnerSeat"],
        "Terminal seed/seat changed",
    )
    ctx["learning"].natural(row["result"])
    for key in ("recoveredPlayRejections", "opponentRecoveredPlayRejections"):
        require(
            type(row["result"][key]) is int and row["result"][key] == 0,
            "Recovered play is not pristine physical qualification",
        )


def acceptance(physical: dict[str, Any], custody: dict[str, Any]) -> dict[str, Any]:
    require(
        set(physical["visibleRegisteredSetIdentities"]) <= REGISTERED,
        "Unexpected scoped identities",
    )
    missing = list(physical["missingBothSeatPhysicalWitnesses"])
    for seat in ("0", "1"):
        for family in FAMILIES:
            if custody["bySeat"][seat].get(family + ":certifiedCustody", 0) == 0:
                missing.append(f"{family}:seat{seat}:certifiedCustody")
    visible = set(physical["visibleRegisteredSetIdentities"])
    return {
        "missingBothSeatWitnesses": missing,
        "missingRegisteredIdentities": sorted(REGISTERED - visible),
        "allEightFamiliesBothSeatsObserved": not missing,
        "exactAll181RegisteredIdentitiesVisible": visible == REGISTERED,
        "requiredObservedPhysicalAndCustodyScopeComplete": not missing and visible == REGISTERED,
        "visibilityIsNotMastery": True,
        "printedRecipesOrIndependentPaymentCertified": False,
        "strengthOrPromotionAccepted": False,
    }


def analyze(ctx: dict[str, Any], report: dict[str, Any]) -> dict[str, Any]:
    count = len(report["episodes"])
    require(
        type(report["freshGames"]) is int
        and report["freshGames"] == count
        and 0 < count <= len(ctx["configs"])
        and count % 440 == 0,
        "Whole original schedule prefixes required",
    )
    require(
        report["checkpointSha256"] == ctx["candidate"]["sha256"]
        and report["engineSha256"] == ctx["request"]["engineSha256"]
        and zero(report["teacherPrefixActions"])
        and zero(report["actualLearningUpdates"]),
        "Current candidate autonomous capture only",
    )
    episode_files(ctx, report["episodes"])
    helpers = consumers(ctx)
    episodes = []
    raw = {}
    for row, sample in zip(report["episodes"], ctx["configs"][:count], strict=True):
        row_guard(ctx, row, sample)
        path = ctx["run"] / "candidate" / f"episode-{row['config']['seed']}.jsonl"
        pin(path.with_suffix(".log"), row["workerLogSha256"])
        windows = helpers["reader"]["load_trace"](path, row, row["rawTraceSha256"])
        helpers["reader"]["checked_compound_events"](windows, row, helpers["capture"])
        episodes.append(helpers["extractor"].extract_material_events(windows, row))
        raw[path.name] = row["rawTraceSha256"]
    physical = helpers["physical"]["physical_summary"](report, sorted(REGISTERED))
    custody = helpers["custody"]["summarize"](episodes)
    require(
        len(raw) == count
        and len(physical["byRecipe"]) == 44
        and Counter(row["config"]["learnerSeat"] for row in report["episodes"])
        == Counter({0: count // 2, 1: count // 2}),
        "All44 and both seats preserved",
    )
    status = acceptance(physical, custody)
    require(
        count == len(ctx["configs"]) or status["requiredObservedPhysicalAndCustodyScopeComplete"],
        "Only complete scope permits unused predeclared expansion blocks",
    )
    return {
        "sourceCommit": SOURCE,
        "engineSha256": ctx["request"]["engineSha256"],
        "checkpointSha256": ctx["candidate"]["sha256"],
        "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        "prepareCompletionSha256": ctx["request"]["prepareCompletionSha256"],
        "migrationCompletionSha256": ctx["request"]["migrationCompletionSha256"],
        "completeAutonomousRawEpisodesChecked": count,
        "plannedCaptureBudget": len(ctx["configs"]),
        "consumedBlocks": ctx["request"]["blocks"][: count // 440],
        "unusedBlocks": ctx["request"]["blocks"][count // 440 :],
        "originalHelperSha256": {name: value for name, (_, value) in ORIGINALS.items()},
        "rawTraceHashes": raw,
        "physicalSummary": physical,
        "materialCustodySummary": custody,
        "materialEpisodes": [e for e in episodes if e["events"]],
        "observedScope": status,
        "actualLearningUpdatesDuringCapture": 0,
        "teacherPrefixActions": 0,
        "finalBlindSeedsConsumed": False,
        "limitations": [
            "Original selected-material custody is not independent printed-recipe, canonical DigiXros ordering, memory-reduction, expander or quota-payment certification.",
            "Missing witnesses remain missing; no reference policy, teacher label, historical fixture, forced action, or visibility may fill them.",
            "Natural engine outcomes and zero rejection/cost refusal/recovered plays are required; strength comparison and native rooms are separate.",
        ],
    }


def immutable_maps(ctx: dict[str, Any]) -> dict[str, Any]:
    """Direct current custody maps only; do not replay old development consumers."""
    lc = ctx["learningContext"]
    roots = [lc["runtimeContext"]["paths"][key] for key in ("prepare", "migrate")]
    roots.append(ctx["learning"].phase_path(lc, "ppo"))
    return {
        "custody": {str(root): lc["runtimeContext"]["v50"].file_map(root) for root in roots},
        "ppoData": ctx["learning"].data_outputs(lc, "ppo"),
    }


def episode_files(ctx: dict[str, Any], rows: list[dict[str, Any]]) -> None:
    directory = ctx["run"] / "candidate"
    require(
        directory.is_dir() and not directory.is_symlink(), "Actual raw capture directory required"
    )
    expected = {
        f"episode-{row['config']['seed']}.{suffix}" for row in rows for suffix in ("jsonl", "log")
    }
    actual = set()
    for path in directory.iterdir():
        require(path.is_file() and not path.is_symlink(), "Raw capture contains symlink/directory")
        if path.name != "report.json":
            actual.add(path.name)
    require(actual == expected, "Failed partial, extra or missing raw episode")


def zero(value: Any) -> bool:
    return type(value) is int and value == 0


def snapshot_guards(ctx: dict[str, Any]) -> None:
    """Safe with Torch loaded: direct byte guards, never context/closed_phase again."""
    lc = ctx["learningContext"]
    require(
        immutable_maps(ctx) == ctx["immutableMaps"],
        "Closed runtime/PPO custody or data bytes changed",
    )
    h = lc["runtime"].helpers(lc["runtimeContext"])
    h["source_guard"](lc["runtimeContext"]["manifest"])
    h["foundation"]["verify_source"](lc["runtimeContext"]["manifest"])
    prepare = lc["runtimeContext"]["paths"]["prepare"]
    require(
        h["runtime_map"]() == read(prepare / "runtime-files.json"),
        "Current full compiled bytes changed",
    )
    pin(prepare / "runtime-files.json", lc["prepared"]["runtimeMapSha256"])
    require(
        read(prepare / "metadata.json") == ctx["metadata"]
        and read(prepare / "curriculum.json") == ctx["curriculum"],
        "Actual current metadata/curriculum changed",
    )
    for path, value in ORIGINALS.values():
        pin(path, value)
    pin(Path(__file__), ctx["operatorSha256"])
    pin(ctx["requestPath"], ctx["requestSha256"])
    pin(Path(ctx["request"]["learning"]["operator"]), ctx["request"]["learning"]["operatorSha256"])
    pin(Path(ctx["request"]["learning"]["request"]), ctx["request"]["learning"]["requestSha256"])
    pin(Path(ctx["candidate"]["path"]), ctx["candidate"]["sha256"])
    for binding in lc["migrated"]["checkpointBindings"].values():
        pin(Path(binding["path"]), binding["sha256"])


def capture_worker(ctx: dict[str, Any], identity_sha: str, approval_sha: str) -> None:
    whole(ctx, identity_sha, closed=False)
    go(ctx, identity_sha, approval_sha, idle=True)
    started = read(ctx["run"] / "started.json")
    require(
        started
        == {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "requestSha256": ctx["requestSha256"],
            "command": command(ctx, identity_sha, approval_sha),
            "candidate": ctx["candidate"],
            "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        },
        "Actual capture command/start differs",
    )
    for index, block in enumerate(ctx["request"]["blocks"]):
        namespace = definitions(
            "inventory",
            {"inventory_seeds"},
            {
                "Path": Path,
                "Any": Any,
                "LAB": LAB,
                "RUN": ctx["run"],
                "SEED": block["seed"],
                "GAMES": 440,
                "read": read,
                "digest": digest,
                "re": re,
            },
        )
        inventory = namespace["inventory_seeds"]()
        inventory_fields(inventory, ctx["run"], block["seed"])
        write(ctx["run"] / f"fresh-inventory-{index}.json", inventory)
    snapshot_guards(ctx)
    source = ctx["checkout"] / "tools/bot-training"
    require(
        all(name not in sys.modules for name in ("bridge", "features", "inference", "model")),
        "Unqualified preloaded model modules",
    )
    sys.path.insert(0, str(source))
    import torch  # Explicit gated model child only; parent and all closure readers remain stdlib.

    from bridge import Episode, describe, episode_scope, verify_recipe_pins
    from inference import CheckpointScorer

    require(
        torch.__version__ == "2.7.1+cu128"
        and torch.version.cuda == "12.8"
        and torch.cuda.is_available()
        and torch.cuda.get_device_name(0) == "NVIDIA GeForce RTX 4070",
        "Supported actual CUDA desktop only",
    )
    torch.set_num_threads(1)
    manifest = ctx["learningContext"]["runtimeContext"]["manifest"]["files"]
    loaded = {}
    for name in ("bridge", "features", "inference", "model"):
        path = Path(sys.modules[name].__file__)
        require(
            path.exists() and path.resolve() == source / f"{name}.py",
            "Wrong qualified Python module",
        )
        pin(path, manifest[f"tools/bot-training/{name}.py"])
        loaded[name] = {"path": str(path), "sha256": digest(path)}
    worker = ctx["checkout"] / "apps/api/dist/bot/training/cli.js"
    require(
        describe("node", worker) == ctx["metadata"]
        and episode_scope("node", worker, ctx["metadata"], True) == ctx["curriculum"],
        "Actual current metadata/curriculum changed",
    )
    policy = CheckpointScorer(Path(ctx["candidate"]["path"]), "cuda")
    require(
        policy.checkpoint_sha256 == ctx["candidate"]["sha256"]
        and policy.metadata == ctx["metadata"],
        "Actual loaded candidate/source differs",
    )
    before = {name: tensor.detach().clone() for name, tensor in policy.model.state_dict().items()}
    require(len(before) == 12, "One unchanged policy shape required")
    helpers = consumers(
        ctx,
        {
            "Episode": Episode,
            "verify_recipe_pins": verify_recipe_pins,
            "CheckpointScorer": CheckpointScorer,
        },
    )
    directory = ctx["run"] / "candidate"
    directory.mkdir()
    report = {
        "checkpointSha256": ctx["candidate"]["sha256"],
        "engineSha256": ctx["request"]["engineSha256"],
        "teacherPrefixActions": 0,
        "actualLearningUpdates": 0,
        "freshGames": 0,
        "episodes": [],
    }
    for index, sample in enumerate(ctx["configs"]):
        row = helpers["capture"]["capture_game"](policy, directory, sample)
        row_guard(ctx, row, sample)
        report["episodes"].append(row)
        report["freshGames"] += 1
        print(
            json.dumps(
                {
                    "candidate": ctx["candidate"]["sha256"],
                    "games": report["freshGames"],
                    "seed": sample["config"]["seed"],
                }
            ),
            flush=True,
        )
        if (index + 1) % 440 == 0:
            status = analyze(ctx, report) if index + 1 == len(ctx["configs"]) else None
            # Analysis of a shorter prefix must be allowed to report gaps while deciding continuation.
            if status is None:
                partial_ctx = dict(ctx, configs=ctx["configs"][: index + 1])
                status = analyze(partial_ctx, report)
            if status["observedScope"]["requiredObservedPhysicalAndCustodyScopeComplete"]:
                break
    after = policy.model.state_dict()
    require(
        set(before) == set(after)
        and all(
            torch.equal(before[name], tensor) and torch.isfinite(tensor).all().item()
            for name, tensor in after.items()
        ),
        "Model tensors changed during inference",
    )
    snapshot_guards(ctx)
    pin(Path(ctx["request"]["identity"]), identity_sha)
    pin(Path(ctx["request"]["resourceGo"]), approval_sha)
    write(directory / "report.json", report)
    write(
        ctx["run"] / "capture-proof.json",
        {
            "command": command(ctx, identity_sha, approval_sha),
            "checkpointSha256Before": ctx["candidate"]["sha256"],
            "checkpointSha256After": digest(Path(ctx["candidate"]["path"])),
            "all12ModelStateTensorsFiniteAndUnchanged": True,
            "loadedModules": loaded,
            "device": "cuda",
            "gpu": torch.cuda.get_device_name(0),
            "torchVersion": torch.__version__,
            "completeAutonomousNeuralMatches": len(report["episodes"]),
            "teacherPrefixActions": 0,
            "actualLearningUpdates": 0,
        },
    )


def run(ctx: dict[str, Any], identity_sha: str, approval_sha: str) -> None:
    whole(ctx, identity_sha, closed=False)
    go(ctx, identity_sha, approval_sha, idle=True)
    require(
        not ctx["run"].exists() and not ctx["run"].is_symlink(),
        "Preserve prior capture/failed records",
    )
    ctx["run"].mkdir()
    (ctx["run"] / "operator.py").write_bytes(Path(__file__).read_bytes())
    (ctx["run"] / "request.json").write_bytes(ctx["requestPath"].read_bytes())
    write(
        ctx["run"] / "started.json",
        {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "requestSha256": ctx["requestSha256"],
            "command": command(ctx, identity_sha, approval_sha),
            "candidate": ctx["candidate"],
            "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        },
    )
    with (ctx["run"] / "capture.log").open("xb") as log:
        result = subprocess.run(
            command(ctx, identity_sha, approval_sha),
            cwd=ctx["checkout"],
            stdout=log,
            stderr=subprocess.STDOUT,
            check=False,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "OMP_NUM_THREADS": "1",
                "MKL_NUM_THREADS": "1",
            },
        )
    write(
        ctx["run"] / "capture-receipt.json",
        {
            "command": command(ctx, identity_sha, approval_sha),
            "exitCode": result.returncode,
            "logSha256": digest(ctx["run"] / "capture.log"),
        },
    )
    require(
        type(result.returncode) is int and result.returncode == 0,
        "Capture child failed; preserve partial records",
    )
    snapshot_guards(ctx)  # Direct byte guards; no historical closure replay after capture.
    report = analyze(ctx, read(ctx["run"] / "candidate/report.json"))
    write(ctx["run"] / "report.json", report)
    write(
        ctx["run"] / "completion.json",
        {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "operatorSha256": ctx["operatorSha256"],
            "requestSha256": ctx["requestSha256"],
            "reportSha256": digest(ctx["run"] / "report.json"),
            "outputs": ctx["learningContext"]["runtimeContext"]["v50"].file_map(ctx["run"]),
            "acceptedStrengthOrMastery": False,
            "finalBlindSeedsConsumed": False,
        },
    )


def closed(ctx: dict[str, Any], identity_sha: str) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Stdlib closed reader required")
    whole(ctx, identity_sha, closed=True)
    completion = read(ctx["run"] / "completion.json")
    require(
        completion["identitySha256"] == identity_sha
        and completion["operatorSha256"] == ctx["operatorSha256"]
        and completion["requestSha256"] == ctx["requestSha256"]
        and completion["acceptedStrengthOrMastery"] is False
        and completion["finalBlindSeedsConsumed"] is False,
        "Closed capture binding changed",
    )
    go(ctx, identity_sha, completion["resourceGoSha256"], idle=False)
    v50 = ctx["learningContext"]["runtimeContext"]["v50"]
    require(
        v50.file_map(ctx["run"], exclude={ctx["run"] / "completion.json"}) == completion["outputs"],
        "Actual capture file map changed",
    )
    pin(ctx["run"] / "operator.py", ctx["operatorSha256"])
    pin(ctx["run"] / "request.json", ctx["requestSha256"])
    started = read(ctx["run"] / "started.json")
    expected_command = command(ctx, identity_sha, completion["resourceGoSha256"])
    require(
        started
        == {
            "identitySha256": identity_sha,
            "resourceGoSha256": completion["resourceGoSha256"],
            "requestSha256": ctx["requestSha256"],
            "command": expected_command,
            "candidate": ctx["candidate"],
            "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        },
        "Started physical command/provenance differs",
    )
    receipt = read(ctx["run"] / "capture-receipt.json")
    require(
        receipt["command"] == expected_command
        and type(receipt["exitCode"]) is int
        and receipt["exitCode"] == 0,
        "Actual capture child failed or command changed",
    )
    pin(ctx["run"] / "capture.log", receipt["logSha256"])
    proof = read(ctx["run"] / "capture-proof.json")
    require(
        proof["command"] == expected_command
        and proof["checkpointSha256Before"]
        == proof["checkpointSha256After"]
        == ctx["candidate"]["sha256"]
        and proof["all12ModelStateTensorsFiniteAndUnchanged"] is True
        and proof["device"] == "cuda"
        and proof["gpu"] == "NVIDIA GeForce RTX 4070"
        and proof["torchVersion"] == "2.7.1+cu128"
        and zero(proof["teacherPrefixActions"])
        and zero(proof["actualLearningUpdates"]),
        "Missing actual unchanged current CUDA policy proof",
    )
    for name in ("bridge", "features", "inference", "model"):
        expected = ctx["checkout"] / f"tools/bot-training/{name}.py"
        require(
            proof["loadedModules"][name]
            == {
                "path": str(expected),
                "sha256": ctx["learningContext"]["runtimeContext"]["manifest"]["files"][
                    f"tools/bot-training/{name}.py"
                ],
            },
            "Qualified loaded module provenance differs",
        )
    for index, block in enumerate(ctx["request"]["blocks"]):
        inventory_fields(
            read(ctx["run"] / f"fresh-inventory-{index}.json"), ctx["run"], block["seed"]
        )
    report = analyze(ctx, read(ctx["run"] / "candidate/report.json"))
    require(
        report == read(ctx["run"] / "report.json")
        and proof["completeAutonomousNeuralMatches"]
        == report["completeAutonomousRawEpisodesChecked"],
        "Actual reconstructed report differs",
    )
    pin(ctx["run"] / "report.json", completion["reportSha256"])
    snapshot_guards(ctx)
    whole(ctx, identity_sha, closed=True)
    return {
        "identitySha256": identity_sha,
        "completionSha256": digest(ctx["run"] / "completion.json"),
        "reportSha256": completion["reportSha256"],
        "sourceCommit": SOURCE,
        "engineSha256": ctx["request"]["engineSha256"],
        "checkpointSha256": ctx["candidate"]["sha256"],
        "ppoCompletionSha256": ctx["learned"]["completionSha256"],
        "observedScope": report["observedScope"],
        "report": report,
        "acceptedStrengthOrMastery": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("inspect", "capture", "capture-worker", "closed"))
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--operator-sha256", required=True)
    parser.add_argument("--identity-sha256")
    parser.add_argument("--resource-go")
    args = parser.parse_args()
    ctx = context(args.request, args.request_sha256, args.operator_sha256)
    if args.action == "inspect":
        print(
            json.dumps(
                {
                    "candidate": ctx["candidate"],
                    "plannedGames": len(ctx["configs"]),
                    "actualModelImports": 0,
                    "actualGames": 0,
                    "strengthOrMasteryAccepted": False,
                }
            ),
            flush=True,
        )
    elif args.action == "closed":
        print(json.dumps(closed(ctx, args.identity_sha256)), flush=True)
    elif args.action == "capture":
        run(ctx, args.identity_sha256, args.resource_go)
    else:
        capture_worker(ctx, args.identity_sha256, args.resource_go)


if __name__ == "__main__":
    main()
