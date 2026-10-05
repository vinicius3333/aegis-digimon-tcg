"""Preserve four frozen checkpoints after the closed updated-runtime preparation."""

import ast
import copy
import hashlib
import importlib.util
import io  # noqa: F401 - used by the unchanged SHA-pinned migration AST loop.
import json
import platform
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
RUN = LAB / "runs/2026-10-05-bt26-ex13-v49-latest-engine-migration"
PREP = LAB / "runs/2026-10-05-bt26-ex13-v48-main-fixes-runtime-preparation"
PREP_OPERATOR = LAB / "transfers/aegis-v48-main-fixes-runtime-preparation.py"
PREP_OPERATOR_SHA = "172909ba9087ecdd5b8a651b3867d7a45d071aee19604d77f656e580915bde1f"
PREP_WRAPPER_SHA = "b94fedb8c240cc5393aff7358ca96c3db3fbf7584516967ed1f0db970cd6638f"
IDENTITY = LAB / "transfers/aegis-v48-main-fixes-runtime-preparation-launch-identity.json"
IDENTITY_SHA = "3300e29a8464bb80c55f9506538ee5b4a219b615a08ca49c17ed6f4cf1323f22"
CHECKOUT = LAB / "checkouts/bt26-ex13-2026-10-05-7c8d7c7e0-v48"
PYTHON_SOURCE = CHECKOUT / "tools/bot-training"
OLD_PREP = LAB / "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation"
SOURCE_ENGINE_SHA = "bd73f2592c7c3c9e157f8af2816716e57d038332f19f4068379d7f3ae31cf8e1"
FOUNDATION = LAB / "runs/2026-10-05-bt26-ex13-v35-fixed-engine-migration/operator.py"
FOUNDATION_SHA = "435f271a27f28e29c78d917097f0672f0fac7792c72ce1ce7070e1a1aa193d2b"
REFERENCE = LAB / "runs/2026-10-04-bt26-ex13-v25-engine-migration"
REFERENCE_OPERATOR_SHA = "bb8ee142697bfeb7ac1788d8e253f31b4272da4a549113a1ebba304fcf8c48a8"
QUERIES = REFERENCE / "queries.jsonl"
QUERIES_SHA = "f4f3a13f7efcd80935955d5bc7ed714fa1e1991cf7cb6f63e1da85c4ddefc0c5"
SOURCES = {
    "v17-reference": (
        LAB / "runs/2026-10-05-bt26-ex13-v35-fixed-engine-migration/v17-reference.pt",
        "045b5023bc5fc130d6e71d8eae60b2d3913dd5ed5ee107784a0712cbffb4d8d1",
    ),
    "source-challenger": (
        LAB / "runs/2026-10-05-bt26-ex13-v35-fixed-engine-migration/source-challenger.pt",
        "3c694bdb2950a8995c07163143c432726e016ee02882c41e4be4199abe3788f0",
    ),
    "fitted-reference": (
        LAB / "runs/2026-10-05-bt26-ex13-v35-fixed-engine-migration/challenger.pt",
        "a66ec24c1e5a771e690d05fb2dae450dc3f8afe38ad2fd5ee38c6462c4e4fe06",
    ),
    "challenger": (
        LAB / "runs/2026-10-05-bt26-ex13-v40-fixed-corrective-ppo/ppo/checkpoint.pt",
        "e55bcc120fde22352ad6e65aa5538a32b0130414df7f11cf120fb622630bbd4b",
    ),
}


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save(name: str, value: Any) -> None:
    (RUN / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def prep_module() -> Any:
    assert digest(PREP_OPERATOR) == PREP_OPERATOR_SHA
    spec = importlib.util.spec_from_file_location(
        "sealed_updated_runtime_preparation", PREP_OPERATOR
    )
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.RUN == PREP and module.CHECKOUT == CHECKOUT
    assert module.OLD_ENGINE == SOURCE_ENGINE_SHA
    assert module.COMMIT == "7c8d7c7e0a38226bdd8d607e1531bb937db4d199"
    return module


def require_sources() -> None:
    for source, expected in SOURCES.values():
        assert digest(source) == expected
    assert digest(QUERIES) == QUERIES_SHA
    assert digest(FOUNDATION) == FOUNDATION_SHA
    assert digest(REFERENCE / "operator.py") == REFERENCE_OPERATOR_SHA


def wait_for_preparation() -> None:
    assert digest(IDENTITY) == IDENTITY_SHA
    assert read(IDENTITY) == {
        "wholeWrapperPid": 178444,
        "startTicks": "2771412",
        "run": PREP.name,
        "operatorSha256": PREP_OPERATOR_SHA,
        "wrapperSha256": PREP_WRAPPER_SHA,
    }
    deadline = time.monotonic() + 43200
    stat = Path("/proc/178444/stat")
    while stat.exists():
        try:
            text = stat.read_text(encoding="utf-8")
        except (FileNotFoundError, ProcessLookupError):
            break
        fields = text[text.rindex(")") + 2 :].split()
        if fields[19] != "2771412" or fields[0] == "Z":
            break
        assert time.monotonic() < deadline, "Wait expired; existing jobs untouched"
        time.sleep(1)
    exit_path = Path(str(PREP) + "-launch") / "exit-code.txt"
    for _ in range(60):
        if exit_path.exists():
            break
        time.sleep(1)
    assert exit_path.read_text(encoding="utf-8").strip() == "0"


def expected_commands(module: Any) -> dict[str, list[str]]:
    tree = ast.parse(PREP_OPERATOR.read_text(encoding="utf-8"))
    main = next(
        node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main"
    )
    calls = [
        node
        for node in ast.walk(main)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "command"
    ]
    commands = {}
    for call in calls:
        phase = ast.literal_eval(call.args[0])
        args = copy.deepcopy(call.args[1])
        assert isinstance(args, ast.List)
        for i, element in enumerate(args.elts):
            if isinstance(element, ast.Attribute):
                assert ast.dump(element) == ast.dump(ast.parse("sys.executable", mode="eval").body)
                args.elts[i] = ast.Constant(str(LAB / "venv/bin/python"))
        commands[phase] = ast.literal_eval(args)
        assert all(isinstance(v, str) for v in commands[phase])
    assert len(calls) == len(commands) == 11
    assert set(commands) == {
        "install",
        "shared-build",
        "api-build",
        "api-typecheck",
        "web-typecheck",
        "image-tests",
        "mirror-tests",
        "engine-tests",
        "python-tests",
        "metadata",
        "curriculum",
    }
    assert module.RUN == PREP
    return commands


def verify_runtime(module: Any) -> dict[str, Any]:
    assert digest(IDENTITY) == digest(RUN / "preparation-launch-identity.json") == IDENTITY_SHA
    launch = Path(str(PREP) + "-launch")
    assert (launch / "exit-code.txt").read_text(encoding="utf-8").strip() == "0"
    assert digest(launch / "launch.sh") == PREP_WRAPPER_SHA
    assert digest(PREP_OPERATOR) == digest(PREP / "operator.py") == PREP_OPERATOR_SHA
    completion = read(PREP / "completion.json")
    assert (
        completion["completedPreparation"] is True
        and type(completion["actualLearningUpdates"]) is int
        and completion["actualLearningUpdates"] == 0
    )
    assert completion["sourceCommit"] == module.COMMIT and completion["checkout"] == str(CHECKOUT)
    assert (
        completion["operatorSha256"] == PREP_OPERATOR_SHA
        and completion["foundationSha256"] == module.FOUNDATION_SHA
    )
    assert (
        completion["manifestSha256"] == module.MANIFEST_SHA
        and completion["archiveSha256"] == module.ARCHIVE_SHA
    )
    assert digest(module.ARCHIVE) == module.ARCHIVE_SHA
    assert digest(PREP / "source-manifest.json") == digest(module.MANIFEST) == module.MANIFEST_SHA
    manifest = read(PREP / "source-manifest.json")
    assert (
        manifest["sourceCommit"] == module.COMMIT
        and manifest["archiveSha256"] == module.ARCHIVE_SHA
    )
    assert (
        len(manifest["files"]) == completion["allSourceFilesExact"] == 12317
        and len(manifest["symlinks"]) == 1
    )
    helpers = module.original_build_helpers()
    helpers["verify_source"](manifest)
    assert completion["allPinnedPythonFilesExact"] == 24
    python_source = read(PREP / "prior-prior-python-source.json")
    for name, expected in python_source["files"].items():
        assert digest(PYTHON_SOURCE / name) == expected
    assert len(python_source["files"]) == 24
    for name, expected in module.BASELINES.items():
        assert digest(OLD_PREP / name) == digest(PREP / ("prior-" + name)) == expected
    assert completion["node"] == "v26.10.0" and completion["python"] == "3.12.14"
    assert completion["metadataChangedOnlyEngineFingerprint"] is True
    assert completion["sourceEngineSha256"] == SOURCE_ENGINE_SHA
    fingerprint = completion["engineSha256"]
    assert (
        isinstance(fingerprint, str)
        and re.fullmatch("[0-9a-f]{64}", fingerprint)
        and fingerprint != SOURCE_ENGINE_SHA
    )
    assert completion["checkpointMetadataMigrationNotPerformed"] is True
    assert completion["existingCheckoutTargetedForMutation"] is False
    assert (
        completion["noPromotionClaim"] is True
        and completion["finalBlindNotPlayedByThisOperator"] is True
    )
    bindings = module.custody_bindings()
    assert bindings == read(PREP / "current-cycle-bindings.json") and bindings["trained"] is True
    assert completion["currentCustodyCompletionSha256"] == bindings["completionSha256"]
    paths = {k: str(v[0]) for k, v in SOURCES.items()}
    hashes = {k: v[1] for k, v in SOURCES.items()}
    assert bindings["checkpointPaths"] == paths and bindings["checkpointHashes"] == hashes
    assert completion["currentCheckpointsUnchanged"] == hashes
    prior_migration = module.closed_migration()
    assert prior_migration == read(PREP / "prior-migration-bindings.json")
    assert prior_migration == completion["priorWholeMigrationBindings"]
    assert fingerprint != prior_migration["engineSha256"]
    module.check_inputs(PREP_OPERATOR_SHA, bindings)
    actual_outputs = {
        str(p.relative_to(PREP)): digest(p)
        for p in PREP.rglob("*")
        if p.is_file() and p != PREP / "completion.json"
    }
    assert actual_outputs == completion["outputs"]
    commands = expected_commands(module)
    assert set(completion["logHashes"]) == {phase + ".log" for phase in commands}
    for phase, args in commands.items():
        receipt = read(PREP / (phase + "-receipt.json"))
        assert receipt["phase"] == phase and receipt["command"] == args
        assert (
            receipt["completed"] is True
            and type(receipt["exitCode"]) is int
            and receipt["exitCode"] == 0
        )
        assert receipt["cwd"] == str(PYTHON_SOURCE if phase == "python-tests" else CHECKOUT)
        assert (
            digest(PREP / (phase + ".log"))
            == receipt["logSha256"]
            == completion["logHashes"][phase + ".log"]
        )
    log = re.sub(r"\x1b\[[0-9;]*m", "", (PREP / "engine-tests.log").read_text(encoding="utf-8"))
    tests = re.search(r"\bTests\s+(\d+) passed", log)
    suites = re.search(r"\bTest Files\s+(\d+) passed", log)
    assert tests is not None and suites is not None
    assert int(tests[1]) == completion["engineTests"] and int(tests[1]) >= 13783
    assert int(suites[1]) == completion["engineTestFiles"] and int(suites[1]) >= 819
    pylog = (PREP / "python-tests.log").read_text(encoding="utf-8")
    assert (
        "Ran 61 tests" in pylog
        and pylog.rstrip().endswith("OK")
        and completion["pythonTests"] == 61
    )
    metadata = read(PREP / "metadata.json")
    curriculum = read(PREP / "curriculum.json")
    assert (
        metadata
        == read(PREP / "metadata.log")
        == dict(read(OLD_PREP / "metadata.json"), engineSha256=fingerprint)
    )
    assert (
        curriculum
        == read(PREP / "curriculum.log")
        == dict(read(OLD_PREP / "curriculum.json"), engineSha256=fingerprint)
    )
    assert len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479
    assert sum(c.startswith("BT26-") for c in metadata["cardIds"]) == 104
    assert sum(c.startswith("EX13-") for c in metadata["cardIds"]) == 77
    assert len(metadata["decks"]) == 26 and len(curriculum["decks"]) == 44
    runtime = {
        str(p.relative_to(CHECKOUT)): digest(p)
        for base in (CHECKOUT / "apps/api/dist", CHECKOUT / "packages/shared/dist")
        for p in base.rglob("*")
        if p.is_file()
    }
    assert runtime == read(PREP / "runtime-files.json") and runtime
    assert digest(PREP / "runtime-files.json") == completion["runtimeMapSha256"]
    return {
        "completionSha256": digest(PREP / "completion.json"),
        "sourceCommit": module.COMMIT,
        "metadata": metadata,
        "curriculum": curriculum,
        "engineSha256": fingerprint,
        "runtimeMapSha256": completion["runtimeMapSha256"],
        "manifestSha256": module.MANIFEST_SHA,
        "custodyCompletionSha256": bindings["completionSha256"],
        "priorWholeMigrationBindings": prior_migration,
        "sourceCheckpointHashes": hashes,
    }


def migrate_unchanged(pins: dict[str, Any]) -> dict[str, Any]:
    """Execute the byte-preservation loop unchanged from the sealed V35 migration."""
    require_sources()
    foundation = ast.parse(FOUNDATION.read_text(encoding="utf-8"))
    main = next(
        node
        for node in foundation.body
        if isinstance(node, ast.FunctionDef) and node.name == "main"
    )
    loops = [
        node
        for node in main.body
        if isinstance(node, ast.For)
        and ast.unparse(node.target) == "(name, (source, expected))"
        and ast.unparse(node.iter) == "SOURCES.items()"
    ]
    assert len(loops) == 1
    import torch

    torch.set_num_threads(2)
    same_nodes = [
        node
        for node in ast.parse((REFERENCE / "operator.py").read_text(encoding="utf-8")).body
        if isinstance(node, ast.FunctionDef) and node.name == "same"
    ]
    assert len(same_nodes) == 1 and digest(REFERENCE / "operator.py") == REFERENCE_OPERATOR_SHA
    same_namespace = {"Any": Any, "torch": torch}
    exec(  # noqa: S102 - executing unchanged, SHA-pinned preservation AST only.
        compile(
            ast.Module(body=same_nodes, type_ignores=[]),
            str(REFERENCE / "operator.py"),
            "exec",
        ),
        same_namespace,
    )
    sys.path.insert(0, str(PYTHON_SOURCE))
    from inference import CheckpointScorer

    manifest = read(PREP / "source-manifest.json")["files"]
    loaded = {}
    for name in ("inference", "features", "model"):
        path = Path(sys.modules[name].__file__)
        assert (
            path.resolve() == PYTHON_SOURCE / (name + ".py")
            and digest(path) == manifest["tools/bot-training/" + name + ".py"]
        )
        loaded[name] = str(path)
    (RUN / "queries.jsonl").write_bytes(QUERIES.read_bytes())
    windows = [
        row["window"]
        for line in (RUN / "queries.jsonl").read_text(encoding="utf-8").splitlines()
        if (row := json.loads(line))["kind"] == "query"
    ]
    assert len(windows) == 28 and digest(RUN / "queries.jsonl") == QUERIES_SHA
    report = {
        "operatorSha256": digest(Path(__file__)),
        "preparationPins": pins,
        "loadedModules": loaded,
        "actualLearningUpdates": 0,
        "identicalInputQuerySha256": QUERIES_SHA,
        "identicalInputWindows": 28,
        "gameBehaviorPreservationClaimed": False,
        "noPromotionClaim": True,
        "checkpoints": {},
    }
    namespace = {
        **globals(),
        "torch": torch,
        "same": same_namespace["same"],
        "CheckpointScorer": CheckpointScorer,
        "pins": pins,
        "windows": windows,
        "report": report,
    }
    exec(  # noqa: S102 - executing unchanged, SHA-pinned preservation AST only.
        compile(ast.Module(body=loops, type_ignores=[]), str(FOUNDATION), "exec"),
        namespace,
    )
    assert set(report["checkpoints"]) == set(SOURCES)
    return report


def closed_migration(identity_sha: str) -> dict[str, Any]:
    """Read the whole closed predecessor without loading or migrating models."""
    assert "torch" not in sys.modules
    assert re.fullmatch("[0-9a-f]{64}", identity_sha)
    own_identity = LAB / "transfers/aegis-v49-latest-engine-migration-launch-identity.json"
    assert digest(own_identity) == identity_sha
    operator_sha = digest(Path(__file__))
    expected_identity = read(own_identity)
    assert expected_identity["run"] == RUN.name
    assert expected_identity["operatorSha256"] == operator_sha
    assert (
        type(expected_identity["wholeWrapperPid"]) is int
        and expected_identity["wholeWrapperPid"] > 0
    )
    assert re.fullmatch("[0-9]+", expected_identity["startTicks"])
    assert re.fullmatch("[0-9a-f]{64}", expected_identity["wrapperSha256"])
    process_stat = Path("/proc") / str(expected_identity["wholeWrapperPid"]) / "stat"
    if process_stat.exists():
        text = process_stat.read_text(encoding="utf-8")
        fields = text[text.rindex(")") + 2 :].split()
        assert fields[19] != expected_identity["startTicks"] or fields[0] == "Z", (
            "Whole migration wrapper still live"
        )
    assert read(own_identity) == expected_identity
    assert digest(Path(__file__)) == digest(RUN / "operator.py") == operator_sha
    launch = Path(str(RUN) + "-launch")
    assert (launch / "exit-code.txt").read_text(encoding="utf-8").strip() == "0"
    assert digest(launch / "launch.sh") == expected_identity["wrapperSha256"]
    require_sources()
    preparation = prep_module()
    pins = verify_runtime(preparation)
    completion = read(RUN / "completion.json")
    assert completion["completedEngineOnlyMigration"] is True
    assert completion["operatorSha256"] == operator_sha
    assert completion["foundationSha256"] == FOUNDATION_SHA
    assert completion["preparationCompletionSha256"] == pins["completionSha256"]
    assert completion["sourceCommit"] == pins["sourceCommit"]
    assert completion["targetEngineSha256"] == pins["engineSha256"]
    assert completion["sourceEngineSha256"] == SOURCE_ENGINE_SHA
    assert (
        type(completion["actualLearningUpdates"]) is int
        and completion["actualLearningUpdates"] == 0
    )
    assert completion["noStrengthPhysicalMasteryOrPromotionClaim"] is True
    assert completion["finalBlindNotPlayedByThisOperator"] is True
    outputs = {
        str(path.relative_to(RUN)): digest(path)
        for path in RUN.rglob("*")
        if path.is_file() and path != RUN / "completion.json"
    }
    assert outputs == completion["outputs"]
    assert digest(RUN / "report.json") == completion["reportSha256"]
    report = read(RUN / "report.json")
    assert report["operatorSha256"] == operator_sha
    assert report["preparationPins"] == pins
    assert type(report["actualLearningUpdates"]) is int and report["actualLearningUpdates"] == 0
    assert report["identicalInputQuerySha256"] == QUERIES_SHA
    assert type(report["identicalInputWindows"]) is int and report["identicalInputWindows"] == 28
    assert digest(RUN / "queries.jsonl") == QUERIES_SHA
    assert report["gameBehaviorPreservationClaimed"] is False and report["noPromotionClaim"] is True
    hashes = {label: pair[1] for label, pair in SOURCES.items()}
    assert completion["sourceCheckpointHashes"] == hashes == pins["sourceCheckpointHashes"]
    assert set(report["checkpoints"]) == set(completion["checkpointHashes"]) == set(hashes)
    expected_loaded = {
        name: str(preparation.CHECKOUT / "tools/bot-training" / (name + ".py"))
        for name in ("inference", "features", "model")
    }
    assert report["loadedModules"] == expected_loaded
    for label, (source, expected) in SOURCES.items():
        record = report["checkpoints"][label]
        target = RUN / f"{label}.pt"
        assert record["sourcePath"] == str(source) and record["sourceCheckpointSha256"] == expected
        assert record["path"] == str(target)
        assert digest(target) == record["checkpointSha256"] == completion["checkpointHashes"][label]
        assert (
            record["sourceEngineSha256"] == SOURCE_ENGINE_SHA
            and record["targetEngineSha256"] == pins["engineSha256"]
        )
        assert type(record["actualLearningUpdates"]) is int and record["actualLearningUpdates"] == 0
        for flag in (
            "metadataChangedOnlyEngineFingerprint",
            "modelAndAdamByteExact",
            "allSavedFieldsPreservedExceptMetadataAndMigrationReceipt",
            "identicalInputReloadChoicesExact",
        ):
            assert record[flag] is True
        assert (
            isinstance(record["identicalInputGreedyChoices"], list)
            and len(record["identicalInputGreedyChoices"]) == 28
        )
        assert all(
            type(choice) is int and choice >= 0 for choice in record["identicalInputGreedyChoices"]
        )
    started = read(RUN / "started.json")
    assert type(started["actualLearningUpdates"]) is int
    assert started == {
        "operatorSha256": operator_sha,
        "preparationPins": pins,
        "actualLearningUpdates": 0,
    }
    queued = read(RUN / "queued.json")
    assert type(queued["actualLearningUpdates"]) is int
    assert queued == {
        "operatorSha256": operator_sha,
        "waitingForWholePreparation": read(IDENTITY),
        "sourceCheckpointHashes": hashes,
        "actualLearningUpdates": 0,
        "migrationStarted": False,
        "noPromotionClaim": True,
    }
    require_sources()
    assert "torch" not in sys.modules
    return {
        "completionSha256": digest(RUN / "completion.json"),
        "reportSha256": digest(RUN / "report.json"),
        "identitySha256": identity_sha,
        "sourceCommit": pins["sourceCommit"],
        "engineSha256": pins["engineSha256"],
        "checkpointHashes": completion["checkpointHashes"],
        "sourceCheckpointHashes": hashes,
        "actualLearningUpdates": 0,
        "runtimeOrStrengthAcceptanceOfLatestSource": False,
    }


def main() -> None:
    assert __debug__ and "torch" not in sys.modules
    operator_sha = digest(Path(__file__))
    assert len(sys.argv) == 2 and sys.argv[1] == operator_sha and not RUN.exists()
    require_sources()
    module = prep_module()
    assert digest(IDENTITY) == IDENTITY_SHA
    RUN.mkdir()
    (RUN / "operator.py").write_bytes(Path(__file__).read_bytes())
    (RUN / "preparation-launch-identity.json").write_bytes(IDENTITY.read_bytes())
    save(
        "queued.json",
        {
            "operatorSha256": operator_sha,
            "waitingForWholePreparation": read(IDENTITY),
            "sourceCheckpointHashes": {k: v[1] for k, v in SOURCES.items()},
            "actualLearningUpdates": 0,
            "migrationStarted": False,
            "noPromotionClaim": True,
        },
    )
    print(json.dumps(read(RUN / "queued.json")), flush=True)
    wait_for_preparation()
    assert digest(Path(__file__)) == digest(RUN / "operator.py") == operator_sha
    require_sources()
    pins = verify_runtime(module)
    helpers = module.original_build_helpers()
    helpers["require_idle"]()
    assert "torch" not in sys.modules
    assert platform.python_version() == "3.12.14"
    assert (
        subprocess.run(
            ["node", "--version"], capture_output=True, text=True, check=True
        ).stdout.strip()
        == "v26.10.0"
    )
    assert (
        json.loads(
            subprocess.run(
                [
                    "node",
                    str(CHECKOUT / "apps/api/dist/bot/training/cli.js"),
                    "--describe",
                ],
                capture_output=True,
                text=True,
                check=True,
            ).stdout
        )
        == pins["metadata"]
    )
    save(
        "started.json",
        {
            "operatorSha256": operator_sha,
            "preparationPins": pins,
            "actualLearningUpdates": 0,
        },
    )
    report = migrate_unchanged(pins)
    assert verify_runtime(module) == pins
    helpers["require_idle"]()
    require_sources()
    assert digest(Path(__file__)) == digest(RUN / "operator.py") == operator_sha
    assert digest(QUERIES) == digest(RUN / "queries.jsonl") == QUERIES_SHA
    save("report.json", report)
    save(
        "completion.json",
        {
            "completedEngineOnlyMigration": True,
            "operatorSha256": operator_sha,
            "foundationSha256": FOUNDATION_SHA,
            "preparationCompletionSha256": pins["completionSha256"],
            "sourceCommit": pins["sourceCommit"],
            "targetEngineSha256": pins["engineSha256"],
            "sourceEngineSha256": SOURCE_ENGINE_SHA,
            "reportSha256": digest(RUN / "report.json"),
            "sourceCheckpointHashes": {k: v[1] for k, v in SOURCES.items()},
            "checkpointHashes": {
                k: v["checkpointSha256"] for k, v in report["checkpoints"].items()
            },
            "actualLearningUpdates": 0,
            "noStrengthPhysicalMasteryOrPromotionClaim": True,
            "finalBlindNotPlayedByThisOperator": True,
            "outputs": {str(p.relative_to(RUN)): digest(p) for p in RUN.rglob("*") if p.is_file()},
        },
    )
    print(json.dumps(read(RUN / "completion.json")), flush=True)


if __name__ == "__main__":
    if not __debug__:
        raise RuntimeError("Optimization disables custody assertions")
    if len(sys.argv) == 3 and sys.argv[1] == "--closed":
        print(json.dumps(closed_migration(sys.argv[2])), flush=True)
    else:
        main()
