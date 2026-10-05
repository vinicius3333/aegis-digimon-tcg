"""ROOT-bound teacher qualification and metadata-only migration; no scheduling.

Only actual whole-zero closures admit successors. This external operator imports
stdlib only; the SHA-bound original migration runs in an explicitly gated child.
"""

import argparse
import ast
import hashlib
import importlib.metadata
import importlib.util
import json
import os
import platform
import re
import subprocess
import sys
import tarfile
from pathlib import Path
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
V50_PATH = LAB / "transfers/aegis-v50-integrated-runtime-qualification.py"
V50_SHA = "4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c"
BASE_MANIFEST = LAB / "transfers/aegis-v50-integrated-source-manifest.json"
BASE_MANIFEST_SHA = "ba054c00047d7e2af6f55ccb09f0a32f4b8eed49eaf1c0204cc456451d538462"
V45_PATH = LAB / "transfers/aegis-v45-final-blind-comparison.py"
V45_SHA = "37241657f59a5425e3311c375db41ac75a3416b77aca8d721791e2249552f744"
CUSTODY_RUN = LAB / "runs/2026-10-05-bt26-ex13-v44-current-material-custody"
CUSTODY_ID = "40f8a758b896a515106a4f4f882a53e52b69bcecbf8b20ad691f3fbef81610df"
V48_PATH = LAB / "transfers/aegis-v48-main-fixes-runtime-preparation.py"
V48_SHA = "172909ba9087ecdd5b8a651b3867d7a45d071aee19604d77f656e580915bde1f"
V34_PATH = LAB / "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/operator.py"
V34_SHA = "bf4f210309bd53885d7f7f218a61b8c4e057e0d72c647762d4ce81d9086af315"
V49_PATH = LAB / "transfers/aegis-v49-latest-engine-migration.py"
V49_SHA = "bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf"
LABELS = {"v17-reference", "source-challenger", "fitted-reference", "challenger"}
TEACHER = "apps/api/src/bot/training/"
MODULES = {TEACHER + name + ".ts" for name in ("referencePolicy", "teacher", "policy")}
TESTS = {TEACHER + name + ".test.ts" for name in ("materialTeacher", "effectMaterialTeacher")}
OUTPUTS = {
    name.replace("/src/", "/dist/")[:-3] + suffix
    for name in MODULES | TESTS
    for suffix in (".js", ".js.map", ".d.ts", ".d.ts.map")
}
EXTERNAL = {
    "tools/bot-training/candidate_delivery.py",
    "tools/bot-training/test_candidate_delivery.py",
    "tools/bot-training/candidate-transport-trace.mjs",
    "tools/bot-training/candidate-transport-trace.test.mjs",
    "tools/bot-training/delivery.md",
}
ADDED_FOLLOWTHROUGH = {
    "tools/bot-training/development_summary.py",
    "tools/bot-training/prepare_learning.py",
    "tools/bot-training/test_learning_followthrough.py",
}


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def sha(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch("[a-f0-9]{64}", value) is not None


def digest(path: Path) -> str:
    require(path.is_file() and not path.is_symlink(), "Missing regular pinned file")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pin(path: Path, expected: Any) -> None:
    require(sha(expected) and digest(path) == expected, "Null or mismatched actual file pin")


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


def path_value(value: Any, parent: Path) -> Path:
    require(isinstance(value, str), "Null actual path")
    path = Path(value)
    require(
        path.is_absolute() and ".." not in path.parts and path.parent == parent, "Unsafe lane path"
    )
    require(not any(part.is_symlink() for part in [path, *path.parents]), "Symlink lane path")
    return path


def load(path: Path, expected: str) -> ModuleType:
    sys.dont_write_bytecode = True
    pin(path, expected)
    spec = importlib.util.spec_from_file_location(path.stem.replace("-", "_"), path)
    require(spec is not None and spec.loader is not None, "No sealed helper loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def extract(
    path: Path, expected: str, names: set[str], namespace: dict[str, Any]
) -> dict[str, Any]:
    """Compile original SHA-bound function ASTs, with declared selectors only."""
    pin(path, expected)
    nodes = [
        node
        for node in ast.parse(path.read_text(encoding="utf-8")).body
        if isinstance(node, ast.FunctionDef) and node.name in names
    ]
    require({node.name for node in nodes} == names, "Missing original helper mechanism")
    result = dict(namespace)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), result)  # noqa: S102 - unchanged pinned helper AST, no producer main.
    return result


def host() -> None:
    require(__debug__ and "torch" not in sys.modules, "Unsafe admission interpreter")
    require(
        platform.python_version() == "3.12.14" and Path(sys.executable) == LAB / "venv/bin/python",
        "Supported lab Python required",
    )
    require(
        subprocess.run(
            ["node", "--version"], check=True, capture_output=True, text=True
        ).stdout.strip()
        == "v26.10.0",
        "Supported Node required",
    )
    require(
        {name: importlib.metadata.version(name) for name in ("torch", "numpy", "click")}
        == {"torch": "2.7.1+cu128", "numpy": "2.2.6", "click": "8.1.8"},
        "Preserved lab packages required",
    )


def source_delta(new: dict[str, Any], old: dict[str, Any], review: dict[str, Any]) -> None:
    require(new["symlinks"] == old["symlinks"], "Symlink inventory changed")
    require(set(old["files"]) <= set(new["files"]), "Source removed")
    changed = {
        name: value
        for name, value in new["files"].items()
        if name in old["files"] and value != old["files"][name]
    }
    added = {name: value for name, value in new["files"].items() if name not in old["files"]}
    require(changed == review["changed"] and added == review["added"], "Unreviewed source delta")
    require(
        set(changed).isdisjoint(ADDED_FOLLOWTHROUGH),
        "Follow-through tools must be exact reviewed additions",
    )
    require(
        MODULES <= set(changed) and TESTS <= set(added),
        "Both teacher repairs and named tests required",
    )
    require(set(review["teacherPins"]) == MODULES | TESTS, "Teacher pin inventory")
    require(
        all(
            new["files"][name] == value and sha(value)
            for name, value in review["teacherPins"].items()
        ),
        "Stable teacher pins differ",
    )
    for name in changed | added:
        require(
            name in MODULES | TESTS | EXTERNAL | ADDED_FOLLOWTHROUGH
            or name.startswith(("docs/", "internal-docs/", "tools/bot-training/operators/")),
            "Engine/card/shared/lock/other bot or Python source changed",
        )


def context(request_path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    """No synthetic admission flags: fail unknown pins before extraction/model."""
    sys.dont_write_bytecode = True
    require(__debug__ and "torch" not in sys.modules, "Unsafe closure interpreter")
    pin(Path(__file__), operator_sha)
    pin(request_path, request_sha)
    request = read(request_path)
    require(request["formatVersion"] == 1, "Request format")
    source = request["source"]
    require(
        isinstance(source["commit"], str)
        and re.fullmatch("[a-f0-9]{40}", source["commit"]) is not None,
        "Actual source commit required",
    )
    for value in (
        source["archive"]["sha256"],
        source["manifest"]["sha256"],
        request["custody"]["completionSha256"],
        request["custody"]["reportSha256"],
    ):
        require(sha(value), "Actual closed source pins required; no placeholders")
    require(
        type(source["archive"]["bytes"]) is int and source["archive"]["bytes"] > 0,
        "Actual archive bytes required",
    )
    require(
        request["custody"]["consumerSha256"] == V45_SHA
        and request["custody"]["identitySha256"] == CUSTODY_ID,
        "Original V44 custody identity changed",
    )
    paths = {}
    for key in ("checkout", "prepare", "migrate", "prepareIdentity", "migrationIdentity"):
        parent = LAB / (
            "checkouts"
            if key == "checkout"
            else "transfers"
            if key.endswith("Identity")
            else "runs"
        )
        paths[key] = path_value(request["paths"][key], parent)
        require(
            paths[key].name.startswith("material-teacher-"),
            "Fresh material-teacher namespace required",
        )
    require(len(set(paths.values())) == len(paths), "Overlapping output selectors")
    archive = path_value(source["archive"]["path"], LAB / "transfers")
    manifest_path = path_value(source["manifest"]["path"], LAB / "transfers")
    pin(archive, source["archive"]["sha256"])
    require(archive.stat().st_size == source["archive"]["bytes"], "Archive size differs")
    pin(manifest_path, source["manifest"]["sha256"])
    manifest = read(manifest_path)
    require(
        manifest["sourceCommit"] == source["commit"]
        and manifest["archiveSha256"] == source["archive"]["sha256"]
        and manifest["archiveBytes"] == source["archive"]["bytes"],
        "Source identity mismatch",
    )
    require(set(manifest["files"]).isdisjoint(manifest["symlinks"]), "File/link overlap")
    v50 = load(V50_PATH, V50_SHA)
    for name, value in manifest["files"].items():
        require(v50.safe_name(name) and sha(value), "Unsafe source member")
        require(
            not any(parent.as_posix() in manifest["symlinks"] for parent in Path(name).parents),
            "Source beneath link",
        )
    pin(BASE_MANIFEST, BASE_MANIFEST_SHA)
    baseline = read(BASE_MANIFEST)
    require(
        baseline["sourceCommit"] == "7d34b4c1267e0bc266736e61b43cb28debf598ee",
        "Reviewed static baseline changed",
    )
    source_delta(manifest, baseline, request["review"])
    consumer = load(V45_PATH, V45_SHA)
    require(
        consumer.CUSTODY == CUSTODY_RUN and consumer.IDENTITY_SHA == CUSTODY_ID,
        "Wrong custody source",
    )
    identity = read(consumer.IDENTITY)
    extract(V50_PATH, V50_SHA, {"verify_whole"}, {**vars(v50), "RUN": CUSTODY_RUN})["verify_whole"](
        identity, consumer.CUSTODY_SHA
    )
    custody = consumer.completed_custody(consumer.custody_module())
    require(
        custody["completionSha256"] == request["custody"]["completionSha256"]
        and custody["trained"] is True,
        "Actual four-policy custody closure required",
    )
    pin(CUSTODY_RUN / "material-custody-report.json", request["custody"]["reportSha256"])
    originals = load(V49_PATH, V49_SHA).SOURCES
    require(
        set(custody["checkpointHashes"]) == set(custody["checkpointPaths"]) == LABELS,
        "Original four-policy inventory required",
    )
    for label, (path, value) in originals.items():
        require(
            custody["checkpointPaths"][label] == str(path)
            and custody["checkpointHashes"][label] == value,
            "Frozen original policy changed",
        )
        pin(path, value)
    prior = {
        "custody": custody,
        "identitySha256": CUSTODY_ID,
        "completionSha256": custody["completionSha256"],
        "engineSha256": custody["metadata"]["engineSha256"],
        "checkpointBindings": {
            label: {"path": custody["checkpointPaths"][label], "sha256": value}
            for label, value in custody["checkpointHashes"].items()
        },
    }
    v50.verify_archive(archive, manifest)
    pin(V34_PATH, V34_SHA)
    pin(V49_PATH, V49_SHA)
    require("torch" not in sys.modules, "Model imported by admission")
    return {
        "request": request,
        "requestPath": request_path,
        "requestSha256": request_sha,
        "operatorSha256": operator_sha,
        "paths": paths,
        "archive": archive,
        "manifest": manifest,
        "manifestPath": manifest_path,
        "v50": v50,
        "prior": prior,
    }


def helpers(ctx: dict[str, Any]) -> dict[str, Any]:
    v50 = ctx["v50"]
    selectors = {**vars(v50), "RUN": ctx["paths"]["prepare"], "CHECKOUT": ctx["paths"]["checkout"]}
    selected = extract(
        V50_PATH,
        V50_SHA,
        {
            "phase_cwd",
            "phase_start",
            "command",
            "verify_phases",
            "runtime_map",
            "source_guard",
        },
        selectors,
    )
    commands = v50.commands()
    commands["delivery-tests"].insert(2, "--test-reporter=tap")
    modules = sorted(
        name[:-3]
        for name in read(BASE_MANIFEST)["files"]
        if name.startswith("tools/bot-training/test")
        and name.count("/") == 2
        and name.endswith(".py")
    )
    require(bool(modules), "Original Python test inventory missing")
    commands["python-tests"] = [
        str(LAB / "venv/bin/python"),
        "-m",
        "unittest",
        "-v",
        *[Path(name).name for name in modules],
    ]
    pin(V48_PATH, V48_SHA)
    main = next(
        node
        for node in ast.parse(V48_PATH.read_text(encoding="utf-8")).body
        if isinstance(node, ast.FunctionDef) and node.name == "main"
    )
    engine = [
        node.value
        for node in main.body
        if isinstance(node, ast.Expr)
        and isinstance(node.value, ast.Call)
        and isinstance(node.value.func, ast.Name)
        and node.value.func.id == "command"
        and node.value.args
        and isinstance(node.value.args[0], ast.Constant)
        and node.value.args[0].value == "engine-tests"
    ]
    require(len(engine) == 1, "Original full engine/audit command missing")
    commands["engine-tests"] = ast.literal_eval(engine[0].args[1])
    commands["teacher-tests"] = [
        "pnpm",
        "--filter",
        "@aegis/api",
        "exec",
        "vitest",
        "run",
        *sorted(name.removeprefix("apps/api/") for name in TESTS),
        "--pool=forks",
        "--maxWorkers=1",
        "--no-file-parallelism",
        "--reporter=verbose",
    ]
    selected["commands"] = lambda: commands
    foundation = extract(
        V34_PATH,
        V34_SHA,
        {"verify_source", "require_idle"},
        {"Path": Path, "CHECKOUT": ctx["paths"]["checkout"], "digest": digest},
    )
    return {**selected, "foundation": foundation}


def vitest_counts(log: str) -> tuple[int, int]:
    """Require complete all-passed summaries; negative fixtures may log errors."""
    counts = []
    for label in ("Test Files", "Tests"):
        rows = re.findall(
            r"(?m)^[ \t]*" + re.escape(label) + r"[ \t]+(\d+) passed[ \t]+\((\d+)\)[ \t]*$",
            log,
        )
        require(
            len(rows) == 1 and int(rows[0][0]) == int(rows[0][1]) > 0,
            "Complete all-passed Vitest summary required",
        )
        counts.append(int(rows[0][0]))
    return counts[0], counts[1]


def qualification(ctx: dict[str, Any]) -> dict[str, Any]:
    run = ctx["paths"]["prepare"]
    h = helpers(ctx)
    pin(run / "operator.py", ctx["operatorSha256"])
    pin(run / "source-manifest.json", ctx["request"]["source"]["manifest"]["sha256"])
    started = read(run / "started.json")
    require(
        started["requestSha256"] == ctx["requestSha256"]
        and started["operatorSha256"] == ctx["operatorSha256"]
        and type(started["actualLearningUpdates"]) is int
        and started["actualLearningUpdates"] == 0,
        "Actual preparation start changed",
    )
    h["source_guard"](ctx["manifest"])
    h["foundation"]["verify_source"](ctx["manifest"])
    logs = h["verify_phases"]()
    teacherlog = re.sub(
        r"\x1b\[[0-9;]*m", "", (run / "teacher-tests.log").read_text(encoding="utf-8")
    )
    teacher_files, _ = vitest_counts(teacherlog)
    require(teacher_files == 2, "Both named teacher suites must be wholly green")
    for name in ("materialTeacher.test.ts", "effectMaterialTeacher.test.ts"):
        for seat in (0, 1):
            require(
                re.search(re.escape(name) + r"[^\n]*seat=" + str(seat), teacherlog) is not None,
                "Actual named teacher tests must report both seats",
            )
    for test in TESTS:
        text = (ctx["paths"]["checkout"] / test).read_text(encoding="utf-8")
        require(
            re.search(r"\[0,\s*1\]", text) is not None,
            "Both learner seats required in each bound teacher suite",
        )
    metadata, curriculum = read(run / "metadata.log"), read(run / "curriculum.log")
    oldmeta, oldcurr = ctx["prior"]["custody"]["metadata"], ctx["prior"]["custody"]["curriculum"]
    engine = metadata["engineSha256"]
    require(
        sha(engine) and engine != ctx["prior"]["engineSha256"],
        "New actual teacher fingerprint required",
    )
    require(
        metadata == dict(oldmeta, engineSha256=engine)
        and curriculum == dict(oldcurr, engineSha256=engine),
        "Only actual engine fingerprint may change schema/curriculum",
    )
    require(
        metadata == read(run / "metadata.json") and curriculum == read(run / "curriculum.json"),
        "Describe receipts differ",
    )
    require(
        metadata["schemaVersion"] == 4
        and len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479
        and len(metadata["decks"]) == 26
        and len(curriculum["decks"]) == 44,
        "Scope/schema must not shrink",
    )
    require(
        {f"BT26-{i:03d}" for i in range(1, 105)} | {f"EX13-{i:03d}" for i in range(1, 78)}
        <= set(metadata["cardIds"]),
        "Scoped identities missing",
    )
    features = ast.parse(
        (ctx["paths"]["checkout"] / "tools/bot-training/features.py").read_text(encoding="utf-8")
    )
    versions = [
        ast.literal_eval(node.value)
        for node in features.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "FEATURE_VERSION"
            for target in node.targets
        )
    ]
    require(versions == [7], "Feature7 required")
    runtime = h["runtime_map"]()
    require(runtime == read(run / "runtime-files.json"), "Full actual runtime inventory changed")
    require(OUTPUTS <= set(runtime), "Named compiled teacher outputs missing")
    engine_log = re.sub(
        r"\x1b\[[0-9;]*m", "", (run / "engine-tests.log").read_text(encoding="utf-8")
    )
    files, tests = vitest_counts(engine_log)
    require(files >= 819 and tests >= 13783, "Full fresh engine/audit suite required")
    return {
        "sourceCommit": ctx["request"]["source"]["commit"],
        "requestSha256": ctx["requestSha256"],
        "operatorSha256": ctx["operatorSha256"],
        "actualV44Custody": ctx["prior"],
        "engineSha256": engine,
        "metadata": metadata,
        "curriculum": curriculum,
        "runtimeMapSha256": digest(run / "runtime-files.json"),
        "metadataSha256": digest(run / "metadata.json"),
        "curriculumSha256": digest(run / "curriculum.json"),
        "engineTests": tests,
        "engineTestFiles": files,
        "engineEvidenceReused": False,
        "reviewedCompiledTeacherPaths": sorted(OUTPUTS),
        "commands": h["commands"](),
        "logHashes": logs,
        "pythonTests": 73,
        "deliveryTests": 18,
        "learnerSeats": [0, 1],
        "actualLearningUpdates": 0,
        "acceptedStrengthOrMastery": False,
        "noPromotionClaim": True,
    }


def whole(ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool) -> dict[str, Any]:
    key = "prepareIdentity" if phase == "prepare" else "migrationIdentity"
    path = ctx["paths"][key]
    pin(path, identity_sha)
    identity = read(path)
    run = ctx["paths"]["prepare" if phase == "prepare" else "migrate"]
    if closed:
        bound = extract(V50_PATH, V50_SHA, {"verify_whole"}, {**vars(ctx["v50"]), "RUN": run})
        bound["verify_whole"](identity, ctx["operatorSha256"])
    else:
        require(
            set(identity)
            == {"wholeWrapperPid", "startTicks", "run", "operatorSha256", "wrapperSha256"}
            and type(identity["wholeWrapperPid"]) is int
            and identity["wholeWrapperPid"] > 0
            and isinstance(identity["startTicks"], str)
            and identity["startTicks"].isdigit()
            and sha(identity["wrapperSha256"]),
            "Actual whole identity required",
        )
        require(
            identity["run"] == run.name
            and identity["operatorSha256"] == ctx["operatorSha256"]
            and ctx["v50"].process_live(identity),
            "Actual owned wrapper must be live",
        )
        pin(Path(str(run) + "-launch") / "launch.sh", identity["wrapperSha256"])
    return identity


def closed_prepare(ctx: dict[str, Any], identity_sha: str) -> dict[str, Any]:
    whole(ctx, "prepare", identity_sha, closed=True)
    run = ctx["paths"]["prepare"]
    started = read(run / "started.json")
    require(started["identitySha256"] == identity_sha, "Prepare start identity changed")
    resource_go(ctx, "prepare", started["resourceGoSha256"], check_idle=False)
    report = qualification(ctx)
    require(read(run / "report.json") == report, "Prepare report changed")
    expected = {
        "reportSha256": digest(run / "report.json"),
        "qualification": report,
        "outputs": ctx["v50"].file_map(run, exclude={run / "completion.json"}),
    }
    require(read(run / "completion.json") == expected, "Prepare actual completion changed")
    whole(ctx, "prepare", identity_sha, closed=True)
    return {
        "identitySha256": identity_sha,
        "completionSha256": digest(run / "completion.json"),
        "reportSha256": expected["reportSha256"],
        "sourceCommit": report["sourceCommit"],
        "engineSha256": report["engineSha256"],
        "metadata": report["metadata"],
        "runtimeMapSha256": report["runtimeMapSha256"],
        "cpuRuntimeQualified": True,
        "acceptedStrengthOrMastery": False,
        "noPromotionClaim": True,
    }


def resource_go(
    ctx: dict[str, Any],
    phase: str,
    approval_sha: str,
    prepared: dict[str, Any] | None = None,
    *,
    check_idle: bool = True,
) -> None:
    path = path_value(ctx["request"]["resourceGo"][phase], LAB / "transfers")
    pin(path, approval_sha)
    expected = {
        "approved": True,
        "phase": phase,
        "operatorSha256": ctx["operatorSha256"],
        "requestSha256": ctx["requestSha256"],
    }
    if prepared is not None:
        expected.update(
            prepareIdentitySha256=prepared["identitySha256"],
            prepareCompletionSha256=prepared["completionSha256"],
        )
    require(
        ctx["v50"].same(read(path), expected),
        "ROOT must explicitly approve exact phase and actual closure",
    )
    if check_idle:
        ctx["v50"].require_idle()


def prepare(ctx: dict[str, Any], identity_sha: str, approval_sha: str) -> None:
    resource_go(ctx, "prepare", approval_sha)
    host()
    whole(ctx, "prepare", identity_sha, closed=False)
    run, checkout = ctx["paths"]["prepare"], ctx["paths"]["checkout"]
    require(not run.exists() and not checkout.exists(), "Exclusive fresh preparation required")
    h = helpers(ctx)
    h["foundation"]["require_idle"]()
    run.mkdir()
    ctx["v50"].copy_new(Path(__file__), run / "operator.py")
    ctx["v50"].copy_new(ctx["manifestPath"], run / "source-manifest.json")
    write(
        run / "started.json",
        {
            "requestSha256": ctx["requestSha256"],
            "operatorSha256": ctx["operatorSha256"],
            "identitySha256": identity_sha,
            "resourceGoSha256": approval_sha,
            "actualLearningUpdates": 0,
        },
    )
    checkout.mkdir()
    with tarfile.open(ctx["archive"], "r:gz") as bundle:
        bundle.extractall(checkout, filter="data")
    h["source_guard"](ctx["manifest"])
    h["foundation"]["verify_source"](ctx["manifest"])
    for phase, command in h["commands"]().items():
        h["command"](phase, command)
    write(run / "metadata.json", read(run / "metadata.log"))
    write(run / "curriculum.json", read(run / "curriculum.log"))
    write(run / "runtime-files.json", h["runtime_map"]())
    report = qualification(ctx)
    context(ctx["requestPath"], ctx["requestSha256"], ctx["operatorSha256"])
    write(run / "report.json", report)
    write(
        run / "completion.json",
        {
            "reportSha256": digest(run / "report.json"),
            "qualification": report,
            "outputs": ctx["v50"].file_map(run),
        },
    )


def migration_report(
    ctx: dict[str, Any], prepared: dict[str, Any], *, execute: bool
) -> dict[str, Any]:
    """Reuse original V49 loader and exact V35 loop/V25 same without edits."""
    prior = ctx["prior"]["checkpointBindings"]
    require(set(prior) == LABELS, "All four actual V49 bindings required")
    for record in prior.values():
        pin(Path(record["path"]), record["sha256"])
    selectors = {
        "RUN": ctx["paths"]["migrate"],
        "PREP": ctx["paths"]["prepare"],
        "PYTHON_SOURCE": ctx["paths"]["checkout"] / "tools/bot-training",
        "OLD_PREP": LAB / "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation",
        "SOURCE_ENGINE_SHA": ctx["prior"]["engineSha256"],
        "SOURCES": {
            label: (Path(record["path"]), record["sha256"]) for label, record in prior.items()
        },
    }
    v49 = load(V49_PATH, V49_SHA)

    def sources() -> None:
        pin(v49.FOUNDATION, v49.FOUNDATION_SHA)
        pin(v49.REFERENCE / "operator.py", v49.REFERENCE_OPERATOR_SHA)
        pin(v49.QUERIES, v49.QUERIES_SHA)
        for source, expected in selectors["SOURCES"].values():
            pin(source, expected)

    sources()
    if execute:
        function = extract(
            V49_PATH,
            V49_SHA,
            {"migrate_unchanged"},
            {**vars(v49), **selectors, "__file__": str(Path(__file__)), "require_sources": sources},
        )
        return function["migrate_unchanged"](
            {**prepared, "metadata": read(ctx["paths"]["prepare"] / "metadata.json")}
        )
    run = ctx["paths"]["migrate"]
    report = read(run / "report.json")
    require(
        report["operatorSha256"] == ctx["operatorSha256"]
        and report["preparationPins"] == prepared
        and type(report["actualLearningUpdates"]) is int
        and report["actualLearningUpdates"] == 0
        and report["noPromotionClaim"] is True
        and report["gameBehaviorPreservationClaimed"] is False,
        "Migration receipt relabelled",
    )
    require(
        report["identicalInputWindows"] == 28
        and report["identicalInputQuerySha256"] == v49.QUERIES_SHA,
        "Historical query scope changed",
    )
    pin(run / "queries.jsonl", v49.QUERIES_SHA)
    require(
        report["loadedModules"]
        == {
            name: str(selectors["PYTHON_SOURCE"] / (name + ".py"))
            for name in ("inference", "features", "model")
        },
        "Wrong scorer source paths",
    )
    require(set(report["checkpoints"]) == LABELS, "Migration checkpoint set changed")

    for label, record in report["checkpoints"].items():
        require(
            record["sourcePath"] == prior[label]["path"]
            and record["sourceCheckpointSha256"] == prior[label]["sha256"]
            and record["path"] == str(run / (label + ".pt"))
            and record["sourceEngineSha256"] == ctx["prior"]["engineSha256"]
            and record["targetEngineSha256"] == prepared["engineSha256"]
            and type(record["actualLearningUpdates"]) is int
            and record["actualLearningUpdates"] == 0,
            "Actual model source/runtime binding differs",
        )
        for flag in (
            "metadataChangedOnlyEngineFingerprint",
            "modelAndAdamByteExact",
            "allSavedFieldsPreservedExceptMetadataAndMigrationReceipt",
            "identicalInputReloadChoicesExact",
        ):
            require(record[flag] is True, "Original byte-preservation evidence missing")
        require(
            len(record["identicalInputGreedyChoices"]) == 28
            and all(
                type(choice) is int and choice >= 0
                for choice in record["identicalInputGreedyChoices"]
            ),
            "Original actual reload choices differ",
        )
        pin(run / (label + ".pt"), record["checkpointSha256"])
    return report


def migrate(
    ctx: dict[str, Any],
    identity_sha: str,
    prepare_identity_sha: str,
    approval_sha: str,
    *,
    worker: bool = False,
) -> None:
    prepared = closed_prepare(ctx, prepare_identity_sha)
    resource_go(ctx, "migrate", approval_sha, prepared)
    host()
    whole(ctx, "migrate", identity_sha, closed=False)
    run = ctx["paths"]["migrate"]
    started = {
        "requestSha256": ctx["requestSha256"],
        "operatorSha256": ctx["operatorSha256"],
        "identitySha256": identity_sha,
        "prepareIdentitySha256": prepare_identity_sha,
        "resourceGoSha256": approval_sha,
        "preparationPins": prepared,
    }
    if worker:
        require(
            read(run / "started.json") == started, "Worker must follow actual approved parent start"
        )
        pin(run / "operator.py", ctx["operatorSha256"])
        report = migration_report(ctx, prepared, execute=True)
        write(run / "report.json", report)
        return
    require(not run.exists(), "Exclusive fresh migration required")
    run.mkdir()
    ctx["v50"].copy_new(Path(__file__), run / "operator.py")
    write(run / "started.json", started)
    args = [
        str(LAB / "venv/bin/python"),
        str(Path(__file__)),
        "migration-worker",
        "--request",
        str(ctx["requestPath"]),
        "--request-sha256",
        ctx["requestSha256"],
        "--operator-sha256",
        ctx["operatorSha256"],
        "--identity-sha256",
        identity_sha,
        "--prepare-identity-sha256",
        prepare_identity_sha,
        "--resource-go",
        approval_sha,
    ]
    with (run / "migration.log").open("xb") as stream:
        subprocess.run(
            args,
            check=True,
            env={
                **os.environ,
                "PYTHONDONTWRITEBYTECODE": "1",
                "CUDA_VISIBLE_DEVICES": "-1",
                "OMP_NUM_THREADS": "1",
                "MKL_NUM_THREADS": "1",
            },
            stdout=stream,
            stderr=subprocess.STDOUT,
        )
    write(
        run / "worker-receipt.json",
        {
            "command": args,
            "completed": True,
            "exitCode": 0,
            "logSha256": digest(run / "migration.log"),
        },
    )
    require(
        closed_prepare(ctx, prepare_identity_sha) == prepared,
        "Post-model actual preparation changed",
    )
    context(ctx["requestPath"], ctx["requestSha256"], ctx["operatorSha256"])
    report = migration_report(ctx, prepared, execute=False)
    write(
        run / "completion.json",
        {
            "completedEngineOnlyMigration": True,
            "actualLearningUpdates": 0,
            "requestSha256": ctx["requestSha256"],
            "reportSha256": digest(run / "report.json"),
            "checkpointHashes": {
                label: record["checkpointSha256"] for label, record in report["checkpoints"].items()
            },
            "outputs": ctx["v50"].file_map(run),
            "noPromotionClaim": True,
        },
    )


def closed_migration(
    ctx: dict[str, Any], identity_sha: str, prepare_identity_sha: str
) -> dict[str, Any]:
    whole(ctx, "migrate", identity_sha, closed=True)
    prepared = closed_prepare(ctx, prepare_identity_sha)
    run = ctx["paths"]["migrate"]
    report = migration_report(ctx, prepared, execute=False)
    expected = {
        "completedEngineOnlyMigration": True,
        "actualLearningUpdates": 0,
        "requestSha256": ctx["requestSha256"],
        "reportSha256": digest(run / "report.json"),
        "checkpointHashes": {
            label: record["checkpointSha256"] for label, record in report["checkpoints"].items()
        },
        "outputs": ctx["v50"].file_map(run, exclude={run / "completion.json"}),
        "noPromotionClaim": True,
    }
    require(
        ctx["v50"].same(read(run / "completion.json"), expected),
        "Whole migration completion changed",
    )
    started = read(run / "started.json")
    require(
        started["preparationPins"] == prepared
        and started["prepareIdentitySha256"] == prepare_identity_sha
        and started["identitySha256"] == identity_sha
        and started["requestSha256"] == ctx["requestSha256"]
        and started["operatorSha256"] == ctx["operatorSha256"],
        "Actual migration start changed",
    )
    receipt = read(run / "worker-receipt.json")
    require(
        type(receipt["exitCode"]) is int
        and receipt["exitCode"] == 0
        and receipt["completed"] is True
        and receipt["logSha256"] == digest(run / "migration.log"),
        "Actual model worker did not close zero",
    )
    expected_command = [
        str(LAB / "venv/bin/python"),
        str(Path(__file__)),
        "migration-worker",
        "--request",
        str(ctx["requestPath"]),
        "--request-sha256",
        ctx["requestSha256"],
        "--operator-sha256",
        ctx["operatorSha256"],
        "--identity-sha256",
        identity_sha,
        "--prepare-identity-sha256",
        prepare_identity_sha,
        "--resource-go",
        started["resourceGoSha256"],
    ]
    require(receipt["command"] == expected_command, "Actual migration worker command changed")
    resource_go(ctx, "migrate", started["resourceGoSha256"], prepared, check_idle=False)
    whole(ctx, "migrate", identity_sha, closed=True)
    return {
        "identitySha256": identity_sha,
        "completionSha256": digest(run / "completion.json"),
        "reportSha256": expected["reportSha256"],
        "sourceCommit": prepared["sourceCommit"],
        "engineSha256": prepared["engineSha256"],
        "checkpointBindings": {
            label: {"path": report["checkpoints"][label]["path"], "sha256": value}
            for label, value in expected["checkpointHashes"].items()
        },
        "actualLearningUpdates": 0,
        "acceptedStrengthOrMastery": False,
        "noPromotionClaim": True,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "phase",
        choices=(
            "inspect",
            "prepare",
            "closed-prepare",
            "migrate",
            "migration-worker",
            "closed-migration",
        ),
    )
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--operator-sha256", required=True)
    parser.add_argument("--identity-sha256")
    parser.add_argument("--prepare-identity-sha256")
    parser.add_argument("--resource-go")
    args = parser.parse_args()
    ctx = context(args.request, args.request_sha256, args.operator_sha256)
    if args.phase == "inspect":
        result = {
            "sourceCommit": ctx["request"]["source"]["commit"],
            "actualV44Custody": ctx["prior"],
            "acceptedStrengthOrMastery": False,
        }
    elif args.phase == "closed-prepare":
        result = closed_prepare(ctx, args.identity_sha256)
    elif args.phase == "closed-migration":
        result = closed_migration(ctx, args.identity_sha256, args.prepare_identity_sha256)
    else:
        if args.phase == "prepare":
            prepare(ctx, args.identity_sha256, args.resource_go)
        else:
            migrate(
                ctx,
                args.identity_sha256,
                args.prepare_identity_sha256,
                args.resource_go,
                worker=args.phase == "migration-worker",
            )
        result = {
            "phase": args.phase,
            "operatorCompleted": True,
            "wholeClosureStillRequired": True,
            "acceptedStrengthOrMastery": False,
        }
    print(json.dumps(result, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
