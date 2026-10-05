"""ROOT-gated delivery of the frozen teacher runtime and an actual closed candidate.

This external operator schedules nothing. Package integrity and native-room replay
are candidate evidence, never strength, mastery, admission, or promotion.
"""

import argparse
import ast
import hashlib
import importlib
import importlib.util
import json
import os
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
SOURCE = "1cec011c0fd0c6481e7297506ed4c825a4dfcdc7"
ARCHIVE = "7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080"
MANIFEST = "0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68"
HELPER_SHA = "1b26edc2ed25a9da4e9864b87f9da35747bbc492c72e2d4dcc133ba6e3ab4c2e"
DELIVERY_SHA = "3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64"
TRACE_SHA = "e8f798f42692d29e026fe4f5ed1df3e83671f70af7307970337ca12431848716"
WINDOW_SHA = "746283bd0b38ef52b09ad7b0017f7b5b14370dacee59af2df49c42aa6dfeb2f9"
HISTORICAL = LAB / "runs/2026-10-04-bt26-ex13-v23-current-winner-dataset/dataset"
EXTRA = [
    {
        "path": str(HISTORICAL / "episode-00003.jsonl"),
        "sha256": "996f33d1b6d5032d8ed761d18edba76eb236c0f9060572077ad07ec4ae9cc8cd",
        "lineIndices": [68],
    },
    {
        "path": str(HISTORICAL / "episode-00004.jsonl"),
        "sha256": "f6b9b5baddbca689e0965a20ce24089f4e01a856566d2d814a5ce4ce0dc96999",
        "lineIndices": [52],
    },
    {
        "path": str(HISTORICAL / "episode-00005.jsonl"),
        "sha256": "f1e2915741998936d5273a12d8e176562c699534a1d87beeab93deb33f5d1ea8",
        "lineIndices": [16, 17, 29],
    },
]


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
    require(sha(value) and digest(path) == value, "Actual non-null matching SHA required")


def unique(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        require(key not in value, "Duplicate JSON key")
        value[key] = item
    return value


def invalid(value: str) -> Any:
    raise ValueError(f"Nonfinite JSON: {value}")


def read(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8"), object_pairs_hook=unique, parse_constant=invalid
    )


def path_value(value: Any, parent: Path, *, descendant: bool = False) -> Path:
    require(isinstance(value, str), "Actual path required")
    path = Path(value)
    require(
        path.is_absolute()
        and ".." not in path.parts
        and (path.is_relative_to(parent) if descendant else path.parent == parent),
        "Wrong lane path",
    )
    require(path.resolve() == path and not path.is_symlink(), "Symlink path rejected")
    return path


def load(path: Path, value: str) -> Any:
    pin(path, value)
    spec = importlib.util.spec_from_file_location(path.stem.replace("-", "_"), path)
    require(spec is not None and spec.loader is not None, "Missing reader loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def request_fields(request: dict[str, Any]) -> None:
    """Check every future closure pin before importing even a stdlib reader."""
    require(request["formatVersion"] == 1, "Request version")
    require(
        request["candidateMode"] in {"trained-ppo", "preserved-primary"}, "Explicit candidate mode"
    )
    for name in (
        ("runtime", "learning") if request["candidateMode"] == "trained-ppo" else ("runtime",)
    ):
        item = request[name]
        keys = ("operatorSha256", "requestSha256") + (
            (
                "prepareIdentitySha256",
                "prepareCompletionSha256",
                "prepareReportSha256",
                "migrationIdentitySha256",
                "migrationCompletionSha256",
                "migrationReportSha256",
                "engineSha256",
            )
            if name == "runtime"
            else ("identitySha256", "completionSha256", "reportSha256", "checkpointSha256")
        )
        require(
            all(sha(item[key]) for key in keys), "Actual closure pins required; no placeholders"
        )
        for key in ("operator", "request"):
            path_value(item[key], LAB / "transfers")
        if name == "learning":
            checkpoint = path_value(item["checkpointPath"], LAB / "runs", descendant=True)
            require(
                checkpoint.name == "checkpoint.pt"
                and checkpoint.parent.name == "ppo"
                and checkpoint.parent.parent.parent == LAB / "runs"
                and checkpoint.parent.parent.name.startswith("material-teacher-learning-"),
                "Actual nested material-teacher-learning PPO checkpoint path required",
            )
    require(
        request["extraWindowFiles"] == EXTRA, "Exact historical five seat-zero selections required"
    )
    for key in ("helpers", "windowHelper", "trace"):
        path_value(request[key]["path"], LAB / "transfers")
        require(sha(request[key]["sha256"]), "Sealed helper SHA required")
    require(request["helpers"]["sha256"] == HELPER_SHA, "Original candidate helpers changed")
    require(
        request["windowHelper"]["sha256"] == WINDOW_SHA and request["trace"]["sha256"] == TRACE_SHA,
        "Original window/transport bytes changed",
    )
    output = path_value(request["output"], LAB / "deliveries")
    require(
        output.name.startswith("material-teacher-delivery-"), "Fresh external package namespace"
    )
    require(
        set(request["phaseBindings"]) == {"package-probe", "rooms"}, "Two separately gated phases"
    )
    selected = [output]
    for phase, binding in request["phaseBindings"].items():
        run = path_value(binding["run"], LAB / "runs")
        require(
            run.name.startswith("material-teacher-delivery-") and run.name.endswith(phase),
            "Fresh phase namespace",
        )
        selected.append(run)
        for key in ("identity", "resourceGo"):
            selected.append(path_value(binding[key], LAB / "transfers"))
    require(len(set(selected)) == len(selected), "Overlapping output selectors")
    require(
        isinstance(request["version"], str)
        and re.fullmatch(r"[a-z0-9][a-z0-9.-]*-candidate", request["version"]) is not None,
        "Explicit candidate version",
    )


def closure_match(actual: dict[str, Any], item: dict[str, Any], prefix: str = "") -> None:
    for key in ("identitySha256", "completionSha256", "reportSha256"):
        requested = prefix + key[0].upper() + key[1:] if prefix else key
        require(actual[key] == item[requested], "Actual closed identity/completion/report differs")


def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    sys.dont_write_bytecode = True
    require(
        __debug__ and "torch" not in sys.modules, "Stdlib admission without optimized interpreter"
    )
    pin(Path(__file__), operator_sha)
    pin(path, request_sha)
    request = read(path)
    request_fields(request)
    item = request["runtime"]
    runtime = load(Path(item["operator"]), item["operatorSha256"])
    ctx = runtime.context(Path(item["request"]), item["requestSha256"], item["operatorSha256"])
    source = ctx["request"]["source"]
    require(
        source["commit"] == SOURCE
        and source["archive"]["sha256"] == ARCHIVE
        and source["archive"]["bytes"] == 43769742
        and source["manifest"]["sha256"] == MANIFEST,
        "Frozen teacher source identity differs",
    )
    prepared = runtime.closed_prepare(ctx, item["prepareIdentitySha256"])
    migrated = runtime.closed_migration(
        ctx, item["migrationIdentitySha256"], item["prepareIdentitySha256"]
    )
    closure_match(prepared, item, "prepare")
    closure_match(migrated, item, "migration")
    require(
        prepared["sourceCommit"] == migrated["sourceCommit"] == SOURCE
        and prepared["engineSha256"] == migrated["engineSha256"] == item["engineSha256"],
        "Actual source/runtime/migration mismatch",
    )
    require(
        prepared["cpuRuntimeQualified"] is True
        and migrated["actualLearningUpdates"] == 0
        and migrated["acceptedStrengthOrMastery"] is False,
        "Qualification is not admission",
    )
    primary = migrated["checkpointBindings"]["challenger"]
    learned = None
    learning = None
    learning_ctx = None
    if request["candidateMode"] == "trained-ppo":
        entry = request["learning"]
        learning = load(Path(entry["operator"]), entry["operatorSha256"])
        learning_ctx = learning.context(
            Path(entry["request"]), entry["requestSha256"], entry["operatorSha256"]
        )
        require(
            learning_ctx["runtimeContext"]["request"] == ctx["request"]
            and learning_ctx["prepared"] == prepared
            and learning_ctx["migrated"] == migrated,
            "PPO actual source/custody bindings differ",
        )
        learned = learning.closed_phase(learning_ctx, "ppo", entry["identitySha256"])
        closure_match(learned, entry)
        require(
            learned["sourceCommit"] == SOURCE
            and learned["engineSha256"] == prepared["engineSha256"]
            and learned["preparedBindings"] == prepared
            and learned["migrationBindings"] == migrated,
            "PPO runtime/CP ancestry mismatch",
        )
        require(
            learned["finiteChangedActualLearningVerified"] is True
            and type(learned["actualLearningUpdates"]) is int
            and learned["actualLearningUpdates"] > 0
            and learned["selectedLearningUpdates"] == learned["actualLearningUpdates"]
            and learned["acceptedStrengthOrMastery"] is False,
            "Actual finite changed Adam PPO proof required",
        )
        primary = {"path": learned["checkpointPath"], "sha256": learned["checkpointSha256"]}
        require(
            primary == {"path": entry["checkpointPath"], "sha256": entry["checkpointSha256"]},
            "ROOT selected PPO checkpoint mismatch",
        )
    pin(Path(primary["path"]), primary["sha256"])
    helpers = load(Path(request["helpers"]["path"]), HELPER_SHA)
    pin(helpers.V40_RECEIPT, helpers.V40_RECEIPT_SHA)
    origin = read(helpers.V40_RECEIPT)
    require(
        origin["checkpointSha256"] == helpers.ORIGIN_SHA
        and origin["actualLearningUpdates"] == 7072
        and len(origin["optimizerStepDeltas"]) == 12
        and all(
            type(step) is int and step == 7072 for step in origin["optimizerStepDeltas"].values()
        ),
        "Actual V40 e55/7072 provenance differs",
    )
    checkout = ctx["paths"]["checkout"]
    delivery = checkout / "tools/bot-training/delivery.mjs"
    pin(delivery, DELIVERY_SHA)
    pin(Path(request["trace"]["path"]), TRACE_SHA)
    window_path = Path(request["windowHelper"]["path"])
    pin(window_path, WINDOW_SHA)
    # Only the unchanged historical window function; never the old V50 admission/main.
    nodes = [
        node
        for node in ast.parse(window_path.read_text()).body
        if isinstance(node, ast.FunctionDef) and node.name == "windows"
    ]
    require(len(nodes) == 1, "Original historical windows selector missing")
    namespace = {
        "Any": Any,
        "Path": Path,
        "Counter": Counter,
        "json": json,
        "require": require,
        "digest": digest,
        "QUERY_PATH": LAB / "runs/2026-10-05-bt26-ex13-v35-fixed-engine-migration/queries.jsonl",
        "QUERY_SHA": helpers.QUERY_SHA,
    }
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(window_path), "exec"), namespace)  # noqa: S102 - SHA-bound original selector only.
    windows, inputs = namespace["windows"](request)
    require(
        len(windows) == 33 and all(window["observation"]["seat"] == 0 for window in windows[28:]),
        "28 original plus five actual seat-zero windows required",
    )
    return {
        "request": request,
        "requestPath": path,
        "requestSha256": request_sha,
        "operatorSha256": operator_sha,
        "runtime": runtime,
        "runtimeContext": ctx,
        "prepared": prepared,
        "migrated": migrated,
        "learningContext": learning_ctx,
        "learning": learning,
        "learned": learned,
        "primary": primary,
        "helpers": helpers,
        "checkout": checkout,
        "delivery": delivery,
        "metadata": prepared["metadata"],
        "windows": windows,
        "inputs": inputs,
    }


def phase_path(ctx: dict[str, Any], phase: str) -> Path:
    require(phase in {"package-probe", "rooms"}, "Unknown delivery phase")
    return Path(ctx["request"]["phaseBindings"][phase]["run"])


def whole(ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool) -> None:
    runtime_ctx = ctx["runtimeContext"]
    selected = {
        **runtime_ctx,
        "operatorSha256": ctx["operatorSha256"],
        "paths": {
            **runtime_ctx["paths"],
            "prepare": phase_path(ctx, phase),
            "prepareIdentity": Path(ctx["request"]["phaseBindings"][phase]["identity"]),
        },
    }
    ctx["runtime"].whole(selected, "prepare", identity_sha, closed=closed)


def go(
    ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str, *, idle: bool
) -> None:
    require(
        sha(identity_sha) and sha(approval_sha),
        "Actual whole identity and ROOT resource Go required",
    )
    path = Path(ctx["request"]["phaseBindings"][phase]["resourceGo"])
    pin(path, approval_sha)
    approval = read(path)
    expected = {
        "approved": True,
        "phase": phase,
        "operatorSha256": ctx["operatorSha256"],
        "requestSha256": ctx["requestSha256"],
        "identitySha256": identity_sha,
        "candidateMode": ctx["request"]["candidateMode"],
        "checkpointSha256": ctx["primary"]["sha256"],
        "prepareCompletionSha256": ctx["prepared"]["completionSha256"],
        "migrationCompletionSha256": ctx["migrated"]["completionSha256"],
        "ppoCompletionSha256": ctx["learned"]["completionSha256"]
        if ctx["learned"] is not None
        else None,
    }
    if phase == "rooms":
        require(
            ctx["learned"] is not None,
            "Managed rooms require the actual newest trained PPO candidate",
        )
        require(
            all(
                sha(approval[key])
                for key in (
                    "packageProbeIdentitySha256",
                    "packageProbeCompletionSha256",
                    "manifestSha256",
                )
            ),
            "Actual closed package-probe pins required in separately pinned room Go",
        )
        proof = closed_phase(ctx, "package-probe", approval["packageProbeIdentitySha256"])
        require(
            proof["completionSha256"] == approval["packageProbeCompletionSha256"]
            and proof["manifestSha256"] == approval["manifestSha256"],
            "Actual package-probe closure mismatch",
        )
        expected.update(
            packageProbeIdentitySha256=proof["identitySha256"],
            packageProbeCompletionSha256=proof["completionSha256"],
            manifestSha256=proof["manifestSha256"],
        )
    require(
        ctx["runtimeContext"]["v50"].same(approval, expected),
        "ROOT must approve exact actual candidate/phase/closure",
    )
    if idle:
        ctx["runtime"].helpers(ctx["runtimeContext"])["foundation"]["require_idle"]()


def direct_worker(ctx: dict[str, Any], identity_sha: str, approval_sha: str) -> None:
    go(ctx, "package-probe", identity_sha, approval_sha, idle=False)
    whole(ctx, "package-probe", identity_sha, closed=False)
    ctx["helpers"].host_check(ctx["request"]["node"])
    require(
        all(
            name not in sys.modules
            for name in ("features", "model", "bridge", "inference", "train", "torch")
        ),
        "Cached model modules cannot establish actual source",
    )
    sys.path.insert(0, str(ctx["checkout"] / "tools/bot-training"))
    os.environ["OMP_NUM_THREADS"] = "1"
    os.environ["MKL_NUM_THREADS"] = "1"
    torch = importlib.import_module("torch")
    require(torch.__version__ == "2.7.1+cu128", "Actual Torch differs")
    torch.set_num_threads(2)
    inference = importlib.import_module("inference")
    modules = {}
    for name in ("features", "model", "inference"):
        module = importlib.import_module(name)
        source = ctx["checkout"] / "tools/bot-training" / f"{name}.py"
        require(Path(module.__file__).resolve() == source.resolve(), "Wrong actual scorer source")
        pin(
            source,
            ctx["runtimeContext"]["manifest"]["files"][str(source.relative_to(ctx["checkout"]))],
        )
        modules[str(source)] = digest(source)
    scorer = inference.CheckpointScorer(Path(ctx["primary"]["path"]), "cpu")
    require(
        scorer.checkpoint_sha256 == ctx["primary"]["sha256"]
        and ctx["runtimeContext"]["v50"].same(scorer.metadata, ctx["metadata"]),
        "Actual direct loaded checkpoint/runtime mismatch",
    )
    choices = [scorer.choose(window) for window in ctx["windows"]]
    require(
        all(
            type(choice) is int and 0 <= choice < len(window["actions"])
            for choice, window in zip(choices, ctx["windows"], strict=True)
        ),
        "Illegal direct choice",
    )
    pin(Path(ctx["primary"]["path"]), scorer.checkpoint_sha256)
    ctx["helpers"].write(
        phase_path(ctx, "package-probe") / "direct-proof.json",
        {
            "checkpointSha256": scorer.checkpoint_sha256,
            "choices": choices,
            "modules": modules,
            "device": "cpu",
            "acceptance": False,
        },
    )


def seal(
    ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str, report: dict[str, Any]
) -> None:
    run = phase_path(ctx, phase)
    ctx["helpers"].write(run / "report.json", report)
    ctx["helpers"].write(
        run / "completion.json",
        {
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "operatorSha256": ctx["operatorSha256"],
            "requestSha256": ctx["requestSha256"],
            "report": report,
            "outputs": ctx["runtimeContext"]["v50"].file_map(
                run, exclude={run / "completion.json"}
            ),
            "packageFiles": ctx["runtimeContext"]["v50"].file_map(
                Path(ctx["request"]["output"]) / "package"
            ),
        },
    )


def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
    whole(ctx, phase, identity_sha, closed=True)
    run = phase_path(ctx, phase)
    pin(run / "operator.py", ctx["operatorSha256"])
    completion = read(run / "completion.json")
    require(
        completion["identitySha256"] == identity_sha
        and completion["operatorSha256"] == ctx["operatorSha256"]
        and completion["requestSha256"] == ctx["requestSha256"],
        "Actual delivery completion bindings differ",
    )
    go(ctx, phase, identity_sha, completion["resourceGoSha256"], idle=False)
    require(
        completion["outputs"]
        == ctx["runtimeContext"]["v50"].file_map(run, exclude={run / "completion.json"})
        and completion["packageFiles"]
        == ctx["runtimeContext"]["v50"].file_map(Path(ctx["request"]["output"]) / "package"),
        "Actual delivery/package files changed",
    )
    require(completion["report"] == read(run / "report.json"), "Actual report changed")
    report = completion["report"]
    require(
        report["checkpointSha256"] == ctx["primary"]["sha256"]
        and report["acceptance"] is False
        and report["noStrengthOrPromotionClaim"] is True,
        "Delivery cannot be admission",
    )
    whole(ctx, phase, identity_sha, closed=True)
    return {
        "completionSha256": digest(run / "completion.json"),
        "identitySha256": identity_sha,
        "reportSha256": digest(run / "report.json"),
        **report,
    }


def execute(ctx: dict[str, Any], phase: str, identity_sha: str, approval_sha: str) -> None:
    whole(ctx, phase, identity_sha, closed=False)
    go(ctx, phase, identity_sha, approval_sha, idle=True)
    host = ctx["helpers"].host_check(ctx["request"]["node"])
    run, root = phase_path(ctx, phase), Path(ctx["request"]["output"])
    require(not run.exists() and not run.is_symlink(), "Exclusive new phase output required")
    if phase == "package-probe":
        require(
            not root.exists() and not root.is_symlink(),
            "Exclusive immutable external package output required",
        )
        root.mkdir()
    run.mkdir()
    helper = ctx["helpers"]
    ctx["runtimeContext"]["v50"].copy_new(Path(__file__), run / "operator.py")
    pin(run / "operator.py", ctx["operatorSha256"])
    environment = helper.child_environment()
    node, package = host["node"], root / "package"
    evidence = [
        ("V40 actual 7072 Adam updates", helper.V40_RECEIPT),
        (
            "actual source preparation",
            ctx["runtimeContext"]["paths"]["prepare"] / "completion.json",
        ),
        (
            "actual four-CP preservation",
            ctx["runtimeContext"]["paths"]["migrate"] / "completion.json",
        ),
    ]
    if ctx["learningContext"] is not None:
        evidence.append(
            (
                "actual finite changed PPO closure",
                ctx["learning"].phase_path(ctx["learningContext"], "ppo") / "completion.json",
            )
        )
    if phase == "package-probe":
        helper.write(
            root / "provenance.json",
            {
                "sourceCommit": SOURCE,
                "sourceArchiveSha256": ARCHIVE,
                "originalCheckpointSha256": helper.ORIGIN_SHA,
                "actualOriginalAdamSteps": 7072,
                "candidateMode": ctx["request"]["candidateMode"],
                "actualCandidateLearningUpdates": ctx["learned"]["actualLearningUpdates"]
                if ctx["learned"]
                else 0,
                "evidence": [
                    {"role": role, "path": str(path), "sha256": digest(path)}
                    for role, path in evidence
                ],
            },
        )
        helper.write(
            root / "pack-request.json",
            {
                "runtime": str(ctx["checkout"]),
                "checkpoint": ctx["primary"]["path"],
                "checkpointSha256": ctx["primary"]["sha256"],
                "provenance": str(root / "provenance.json"),
                "output": str(package),
                "version": ctx["request"]["version"],
                "python": host["python"],
            },
        )
        command = [node, str(ctx["delivery"]), "pack", "--request", str(root / "pack-request.json")]
        packed = json.loads(
            helper.run_command(
                command, run / "pack.log", cwd=ctx["checkout"], environment=environment
            )
        )
        require(
            packed["status"] == "candidate" and Path(packed["package"]) == package,
            "Candidate pack contract differs",
        )
        helper.write(run / "package-pin.json", packed)
    else:
        packed = read(phase_path(ctx, "package-probe") / "package-pin.json")
    manifest_sha = packed["manifestSha256"]
    pin(package / "manifest.json", manifest_sha)
    pin(package / "scorer.mjs", DELIVERY_SHA)
    pin(package / "checkpoint.pt", ctx["primary"]["sha256"])
    manifest = read(package / "manifest.json")
    require(
        manifest["metadata"] == ctx["metadata"]
        and manifest["checkpointSha256"] == ctx["primary"]["sha256"]
        and manifest["featureVersion"] == 7
        and manifest["status"] == "candidate",
        "Copied package source/model/schema differs",
    )
    helper.write(
        run / "trace-config.json",
        {
            "phase": phase,
            "runtime": str(ctx["checkout"]),
            "metadata": ctx["metadata"],
            "checkpointSha256": ctx["primary"]["sha256"],
            "output": str(run / "transport-proof.json"),
        },
    )
    environment.update(
        NODE_ENV="test",
        PATH=str(Path(node).parent) + ":" + environment.get("PATH", ""),
        AEGIS_DELIVERY_TRACE_CONFIG=str(run / "trace-config.json"),
        AEGIS_BOT_DELIVERY_PACKAGE=str(package),
        AEGIS_BOT_DELIVERY_MANIFEST_SHA256=manifest_sha,
    )
    helper.run_command(
        [
            node,
            str(ctx["delivery"]),
            "validate",
            "--package",
            str(package),
            "--manifest-sha256",
            manifest_sha,
        ],
        run / "validate.log",
        cwd=ctx["checkout"],
        environment=environment,
    )
    if phase == "package-probe":
        helper.run_command(
            [
                host["python"],
                str(Path(__file__)),
                "direct-worker",
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
            ],
            run / "direct.log",
            cwd=ctx["checkout"],
            environment=environment,
        )
        helper.write(run / "windows.json", ctx["windows"])
        command = [
            node,
            "--import",
            ctx["request"]["trace"]["path"],
            str(ctx["delivery"]),
            "probe",
            "--package",
            str(package),
            "--manifest-sha256",
            manifest_sha,
            "--allow-candidate",
            "--queries",
            str(run / "windows.json"),
            "--output",
            str(run / "probe"),
        ]
    else:
        for path, value in helper.ROOM_HELPERS.items():
            pin(path, value)
        script = ctx["checkout"] / "tools/bot-training/room-smoke.mjs"
        pin(script, helper.ROOM_SHA)
        command = [
            node,
            "--import",
            ctx["request"]["trace"]["path"],
            str(script),
            "--checkpoint",
            str(package / "checkpoint.pt"),
            "--python",
            str(package / "scorer.mjs"),
            "--output",
            str(run / "verification"),
            "--games",
            "26",
            "--seed",
            "6170000",
            "--match-timeout-ms",
            "600000",
        ]
    helper.write(
        run / "started.json",
        {
            "command": command,
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "primary": ctx["primary"],
            "prepared": ctx["prepared"],
            "migrated": ctx["migrated"],
            "learned": ctx["learned"],
            "acceptance": False,
        },
    )
    go(ctx, phase, identity_sha, approval_sha, idle=False)
    helper.run_command(command, run / "phase.log", cwd=ctx["checkout"], environment=environment)
    # Legacy names here are private expected selectors of unchanged helper AST,
    # never a V50 closure or source identity. The actual prepare/engine is supplied.
    pins = {"primary": ctx["primary"], "v50": {"engineSha256": ctx["prepared"]["engineSha256"]}}
    proof = helper.trace_check(run / "transport-proof.json", pins, phase)
    if phase == "package-probe":
        require(
            read(run / "direct-proof.json")["choices"]
            == read(run / "probe/queries.json")["choices"]
            == [row["action"] for row in proof["queries"]]
            and len(proof["queries"]) == 33,
            "Direct/copied scorer 33 genuine choices differ",
        )
        stats = {
            "queries": 33,
            "seats": dict(Counter(window["observation"]["seat"] for window in ctx["windows"])),
        }
    else:
        namespace = {**vars(helper), "V50": ctx["runtimeContext"]["paths"]["prepare"]}
        nodes = [
            node
            for node in ast.parse(Path(helper.__file__).read_text()).body
            if isinstance(node, ast.FunctionDef) and node.name == "room_guard"
        ]
        require(len(nodes) == 1, "Original room guard missing")
        exec(compile(ast.Module(body=nodes, type_ignores=[]), helper.__file__, "exec"), namespace)  # noqa: S102 - unchanged SHA-bound helper and declared PREP selector.
        stats = namespace["room_guard"](run, package / "checkpoint.pt", pins)
        require(
            stats["modelQueries"] == len(proof["queries"]),
            "Native room queries differ from actual loaded policy trace",
        )
    after = context(ctx["requestPath"], ctx["requestSha256"], ctx["operatorSha256"])
    require(after["primary"] == ctx["primary"], "Post-phase actual checkpoint custody changed")
    whole(ctx, phase, identity_sha, closed=False)
    report = {
        "phase": phase,
        "candidateMode": ctx["request"]["candidateMode"],
        "sourceCommit": SOURCE,
        "engineSha256": ctx["prepared"]["engineSha256"],
        "checkpointSha256": ctx["primary"]["sha256"],
        "manifestSha256": manifest_sha,
        "actualRuntime": str(ctx["checkout"]),
        "scorerModuleSha256": digest(ctx["checkout"] / "tools/bot-training/inference.py"),
        "ready": proof["ready"],
        "maxQueryLatencyMs": max(row["latencyMs"] for row in proof["queries"]),
        "policyTimeoutMs": 1000,
        "transportTimeoutMs": 2000,
        "stats": stats,
        "acceptance": False,
        "noStrengthOrPromotionClaim": True,
    }
    seal(ctx, phase, identity_sha, approval_sha, report)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("inspect", "run", "closed", "direct-worker"))
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--operator-sha256", required=True)
    parser.add_argument("--phase", choices=("package-probe", "rooms"))
    parser.add_argument("--identity-sha256")
    parser.add_argument("--resource-go")
    args = parser.parse_args()
    ctx = context(args.request, args.request_sha256, args.operator_sha256)
    if args.mode == "inspect":
        result = {
            "primary": ctx["primary"],
            "prepared": ctx["prepared"],
            "migrated": ctx["migrated"],
            "learned": ctx["learned"],
            "acceptance": False,
        }
    elif args.mode == "closed":
        result = closed_phase(ctx, args.phase, args.identity_sha256)
    elif args.mode == "direct-worker":
        direct_worker(ctx, args.identity_sha256, args.resource_go)
        return
    else:
        execute(ctx, args.phase, args.identity_sha256, args.resource_go)
        return
    print(json.dumps(result, indent=2, sort_keys=True, allow_nan=False))


if __name__ == "__main__":
    main()
