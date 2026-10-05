"""Future V49 guards: synthetic fixtures only, never real migration evidence.

The immutable external proof inputs are supplied explicitly by environment.
No Torch import, checkpoint loading, build, game, remote mutation or seed use.
"""

import ast
import copy
import hashlib
import io
import json
import os
import pickle
import re
import sys
import subprocess
import tempfile
import tarfile
import types
import unittest
from pathlib import Path
from typing import Any

OP = Path(__file__).with_name("aegis-v49-latest-engine-migration.py")
REFERENCE_ROOT = Path(os.environ["AEGIS_BOT_REFERENCE_ROOT"])
PROOF_ROOT = Path(os.environ["AEGIS_V48_PROOF_ROOT"])
PREPARER = PROOF_ROOT / "aegis-v48-main-fixes-runtime-preparation.py"
PREPARER_SHA = "172909ba9087ecdd5b8a651b3867d7a45d071aee19604d77f656e580915bde1f"
FOUNDATION = REFERENCE_ROOT / "2026-10-05-bt26-ex13-v35-fixed-engine-migration/operator.py"
REFERENCE = REFERENCE_ROOT / "2026-10-04-bt26-ex13-v25-engine-migration/operator.py"
PRIOR = REFERENCE_ROOT / "2026-10-05-bt26-ex13-v34-fixed-runtime-preparation"
MANIFEST = PROOF_ROOT / "aegis-v48-main-fixes-source-manifest.json"
ARCHIVE = PROOF_ROOT / "aegis-bt26-ex13-7c8d7c7e0-v48.tar.gz"
IDENTITY = Path(os.environ["AEGIS_V48_IDENTITY_FILE"])


def digest(p):
    with p.open("rb") as f:
        return hashlib.file_digest(f, "sha256").hexdigest()


def read(p):
    return json.loads(p.read_text())


def save(p, x):
    p.write_text(json.dumps(x, indent=2, sort_keys=True) + "\n")


def defs(p, names, ns):
    nodes = [
        n
        for n in ast.parse(p.read_text()).body
        if isinstance(n, ast.FunctionDef) and n.name in names
    ]
    assert len(nodes) == len(names)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(p), "exec"), ns)
    return ns


def runtime_fixture(mode="valid"):
    with tempfile.TemporaryDirectory(prefix="v49-future-runtime-fixture-") as tmp:
        lab = Path(tmp)
        prep = lab / "prep"
        run = lab / "migration"
        prior = lab / "prior"
        checkout = lab / "checkout"
        py = checkout / "tools/bot-training"
        transfer = lab / "transfers"
        launch = Path(str(prep) + "-launch")
        for p in (prep, run, prior, py, transfer, launch):
            p.mkdir(parents=True)
        identity = transfer / "identity.json"
        identity.write_bytes(IDENTITY.read_bytes())
        (run / "preparation-launch-identity.json").write_bytes(identity.read_bytes())
        operator = transfer / "preparer.py"
        operator.write_bytes(PREPARER.read_bytes())
        (prep / "operator.py").write_bytes(operator.read_bytes())
        (launch / "launch.sh").write_bytes(
            (PROOF_ROOT / "aegis-v48-main-fixes-runtime-preparation-launch.sh").read_bytes()
        )
        (launch / "exit-code.txt").write_text("0")
        manifest = transfer / "manifest.json"
        manifest.write_bytes(MANIFEST.read_bytes())
        (prep / "source-manifest.json").write_bytes(manifest.read_bytes())
        archive = transfer / "archive.tar.gz"
        archive.symlink_to(ARCHIVE)
        baselines = {
            name: digest(PRIOR / name)
            for name in (
                "completion.json",
                "metadata.json",
                "curriculum.json",
                "prior-python-source.json",
            )
        }
        for name in baselines:
            (prior / name).write_bytes((PRIOR / name).read_bytes())
            (prep / ("prior-" + name)).write_bytes((PRIOR / name).read_bytes())
        python_map = read(prior / "prior-python-source.json")
        assert len(python_map["files"]) == 24
        metadata = {**read(prior / "metadata.json"), "engineSha256": "a" * 64}
        curriculum = {**read(prior / "curriculum.json"), "engineSha256": "a" * 64}
        for name, obj in [
            ("metadata.json", metadata),
            ("metadata.log", metadata),
            ("curriculum.json", curriculum),
            ("curriculum.log", curriculum),
            ("prior-prior-python-source.json", python_map),
        ]:
            save(prep / name, obj)
        (prep / "prior-prior-python-source.json").write_bytes(
            (prior / "prior-python-source.json").read_bytes()
        )
        runtimefile = checkout / "apps/api/dist/fixture.js"
        runtimefile.parent.mkdir(parents=True)
        runtimefile.write_text("// future compiled byte fixture, no build\n")
        save(prep / "runtime-files.json", {"apps/api/dist/fixture.js": digest(runtimefile)})
        sources = {}
        for label in ("v17-reference", "source-challenger", "fitted-reference", "challenger"):
            p = transfer / (label + ".pt")
            p.write_bytes(("mock checkpoint " + label).encode())
            sources[label] = (p, digest(p))
        sourcehashes = {k: v[1] for k, v in sources.items()}
        sourcepaths = {k: str(v[0]) for k, v in sources.items()}
        bindings = {
            "trained": True,
            "completionSha256": "fixture-custody-seal",
            "checkpointPaths": sourcepaths,
            "checkpointHashes": sourcehashes,
        }
        save(prep / "current-cycle-bindings.json", bindings)
        checks = []
        module = types.SimpleNamespace(
            RUN=prep,
            CHECKOUT=checkout,
            COMMIT="7c8d7c7e0a38226bdd8d607e1531bb937db4d199",
            FOUNDATION_SHA="bf4f210309bd53885d7f7f218a61b8c4e057e0d72c647762d4ce81d9086af315",
            ARCHIVE=archive,
            ARCHIVE_SHA=digest(archive),
            MANIFEST=manifest,
            MANIFEST_SHA=digest(manifest),
            BASELINES=baselines,
            custody_bindings=lambda: bindings,
        )

        def verify_source(m):
            checks.append("future-source-helper-mocked")
            assert mode != "source_helper_reject" and m == read(manifest)

        module.original_build_helpers = lambda: {"verify_source": verify_source}

        def check_inputs(sha, b):
            checks.append("future-custody-check-inputs-mocked")
            assert sha == PREPARER_SHA and b == bindings and mode != "custody_helper_reject"

        module.check_inputs = check_inputs

        def fixture_digest(p):
            if p.is_relative_to(py):
                return (
                    "bad"
                    if mode == "python_changed"
                    else python_map["files"][str(p.relative_to(py))]
                )
            return digest(p)

        prior_migration = {"engineSha256": "c" * 64, "fixtureOnly": True}
        save(prep / "prior-migration-bindings.json", prior_migration)
        module.closed_migration = lambda: prior_migration
        ns = {
            "Any": Any,
            "Path": Path,
            "ast": ast,
            "copy": copy,
            "re": re,
            "json": json,
            "digest": fixture_digest,
            "read": read,
            "LAB": lab,
            "RUN": run,
            "PREP": prep,
            "PREP_OPERATOR": operator,
            "PREP_OPERATOR_SHA": PREPARER_SHA,
            "PREP_WRAPPER_SHA": digest(launch / "launch.sh"),
            "IDENTITY": identity,
            "IDENTITY_SHA": digest(identity),
            "CHECKOUT": checkout,
            "PYTHON_SOURCE": py,
            "OLD_PREP": prior,
            "SOURCE_ENGINE_SHA": read(prior / "metadata.json")["engineSha256"],
            "SOURCES": sources,
        }
        defs(OP, {"expected_commands", "verify_runtime"}, ns)
        commands = ns["expected_commands"](module)
        for phase, args in commands.items():
            text = {
                "metadata": json.dumps(metadata),
                "curriculum": json.dumps(curriculum),
                "engine-tests": "\x1b[32mTest Files 819 passed\nTests 13783 passed\x1b[0m\n",
                "python-tests": "Ran 61 tests in 1s\n\nOK\n",
            }.get(phase, "fixture successful command, not executed\n")
            (prep / (phase + ".log")).write_text(text)
            save(
                prep / (phase + "-receipt.json"),
                {
                    "phase": phase,
                    "command": args,
                    "completed": True,
                    "exitCode": 0,
                    "cwd": str(py if phase == "python-tests" else checkout),
                    "logSha256": digest(prep / (phase + ".log")),
                },
            )
        completion = {
            "completedPreparation": True,
            "actualLearningUpdates": 0,
            "sourceCommit": module.COMMIT,
            "checkout": str(checkout),
            "operatorSha256": PREPARER_SHA,
            "foundationSha256": module.FOUNDATION_SHA,
            "manifestSha256": module.MANIFEST_SHA,
            "archiveSha256": module.ARCHIVE_SHA,
            "allSourceFilesExact": 12317,
            "allPinnedPythonFilesExact": 24,
            "node": "v26.10.0",
            "python": "3.12.14",
            "metadataChangedOnlyEngineFingerprint": True,
            "sourceEngineSha256": ns["SOURCE_ENGINE_SHA"],
            "engineSha256": "a" * 64,
            "checkpointMetadataMigrationNotPerformed": True,
            "existingCheckoutTargetedForMutation": False,
            "noPromotionClaim": True,
            "finalBlindNotPlayedByThisOperator": True,
            "currentCustodyCompletionSha256": bindings["completionSha256"],
            "currentCheckpointsUnchanged": sourcehashes,
            "engineTests": 13783,
            "engineTestFiles": 819,
            "pythonTests": 61,
            "runtimeMapSha256": digest(prep / "runtime-files.json"),
            "priorWholeMigrationBindings": prior_migration,
        }
        if mode == "exit1":
            (launch / "exit-code.txt").write_text("1")
        if mode == "operator_changed":
            (prep / "operator.py").write_text("changed")
        if mode == "identity_changed":
            (run / "preparation-launch-identity.json").write_text("{}")
        if mode == "checkpoint_hashes":
            completion["currentCheckpointsUnchanged"] = {}
        if mode == "checkpoint_paths":
            bindings = copy.deepcopy(bindings)
            bindings["checkpointPaths"]["challenger"] = "wrong"
            save(prep / "current-cycle-bindings.json", bindings)
        if mode == "untrained":
            bindings["trained"] = False
            save(prep / "current-cycle-bindings.json", bindings)
        if mode == "source_commit":
            completion["sourceCommit"] = "wrong"
        if mode == "same_fingerprint":
            completion["engineSha256"] = ns["SOURCE_ENGINE_SHA"]
        if mode == "learning_updates":
            completion["actualLearningUpdates"] = 1
        if mode == "bool_learning_updates":
            completion["actualLearningUpdates"] = False
        if mode == "unchecked_migration":
            completion["checkpointMetadataMigrationNotPerformed"] = False
        if mode == "wrong_versions":
            completion["node"] = "v24.0.0"
        if mode == "manifest_changed":
            (prep / "source-manifest.json").write_text("{}")
        if mode == "baseline_changed":
            (prep / "prior-metadata.json").write_text("{}")
        if mode == "runtime_changed":
            runtimefile.write_text("changed")
        if mode in ("metadata_card_change", "metadata_log_change"):
            x = copy.deepcopy(metadata)
            x["cardIds"] = x["cardIds"][:-1]
            save(prep / ("metadata.json" if mode == "metadata_card_change" else "metadata.log"), x)
        if mode == "curriculum_change":
            x = copy.deepcopy(curriculum)
            x["decks"][0]["sha256"] = "wrong"
            save(prep / "curriculum.json", x)
        if mode in ("engine_test_count", "python_failed"):
            (
                prep / ("engine-tests.log" if mode == "engine_test_count" else "python-tests.log")
            ).write_text(
                "Test Files 819 passed\nTests 13782 passed\n"
                if mode == "engine_test_count"
                else "Ran 61 tests\nFAILED\n"
            )
        if mode in ("command_changed", "cwd_changed", "bool_exit", "phase_failed"):
            p = prep / "engine-tests-receipt.json"
            r = read(p)
            if mode == "command_changed":
                r["command"].append("--passWithNoTests")
            if mode == "cwd_changed":
                r["cwd"] = str(lab)
            if mode == "bool_exit":
                r["exitCode"] = False
            if mode == "phase_failed":
                r["exitCode"] = 1
            save(p, r)
        for phase in commands:
            p = prep / (phase + "-receipt.json")
            r = read(p)
            r["logSha256"] = digest(prep / (phase + ".log"))
            save(p, r)
        completion["logHashes"] = {
            phase + ".log": digest(prep / (phase + ".log")) for phase in commands
        }
        completion["outputs"] = {
            str(p.relative_to(prep)): digest(p)
            for p in prep.rglob("*")
            if p.is_file() and p != prep / "completion.json"
        }
        if mode == "prior_migration_changed":
            completion["priorWholeMigrationBindings"] = {}
        if mode == "same_prior_engine":
            completion["engineSha256"] = "c" * 64
        if mode == "engine_file_count":
            completion["engineTestFiles"] = 818
        if mode == "output_map_missing":
            completion["outputs"].pop("metadata.json")
        save(prep / "completion.json", completion)
        if mode == "nested_extra":
            p = prep / "extra/completion.json"
            p.parent.mkdir()
            p.write_text("{}")
        result = ns["verify_runtime"](module)
        assert len(commands) == 11 and checks == [
            "future-source-helper-mocked",
            "future-custody-check-inputs-mocked",
        ]
        assert result["metadata"] == metadata and result["engineSha256"] == "a" * 64
        return {
            "phaseCount": len(commands),
            "fixtureRuntimeMapMembers": 1,
            "actualSourceManifestMembers": len(read(manifest)["files"]),
            "torchImported": False,
        }


def migration_fixture(mode="valid", prior_receipt=True):
    tree = ast.parse(FOUNDATION.read_text())
    main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "main")
    loops = [
        n for n in main.body if isinstance(n, ast.For) and ast.unparse(n.iter) == "SOURCES.items()"
    ]
    assert len(loops) == 1
    with tempfile.TemporaryDirectory(prefix="v49-mocked-preservation-loop-") as tmp:
        run = Path(tmp) / "run"
        run.mkdir()
        prior = Path(tmp) / "prior"
        prior.mkdir()
        old = {"engineSha256": "b" * 64, "cardIds": ["fixture-only"]}
        new = {**old, "engineSha256": "a" * 64}
        save(prior / "metadata.json", old)
        sources = {}
        before = {}
        for name in ("v17-reference", "source-challenger", "fitted-reference", "challenger"):
            saved = {
                "metadata": old,
                "featureVersion": 7,
                "model": {"weight": [1.0, 2.0]},
                "optimizer": {
                    "state": {"0": {"step": 7072, "exp_avg": [0.1], "exp_avg_sq": [0.2]}},
                    "param_groups": [{"lr": 0.00003}],
                },
                "extra": ("preserved", b"opaque"),
            }
            if prior_receipt:
                saved["engineMigration"] = {"prior": True}
            if mode == "wrong_source_metadata":
                saved["metadata"] = {**old, "engineSha256": "wrong"}
            p = run / (name + "-original.pt")
            p.write_bytes(pickle.dumps(saved))
            sources[name] = (p, digest(p))
            before[name] = p.read_bytes()

        class FakeTensor:
            pass

        def load(p, **kwargs):
            return pickle.loads(p.getvalue() if isinstance(p, io.BytesIO) else p.read_bytes())

        def store(obj, p):
            obj = copy.deepcopy(obj)
            if mode == "save_changes_adam":
                obj["optimizer"]["state"]["0"]["step"] += 1
            p.write_bytes(pickle.dumps(obj))

        torch = types.SimpleNamespace(Tensor=FakeTensor, load=load, save=store)
        ns = {"Any": Any, "torch": torch}
        defs(REFERENCE, {"same"}, ns)

        class FakeScorer:
            def __init__(self, p, device):
                self.p = p
                assert device == "cpu"

            def choose(self, w):
                return w["mockGreedyIndex"] + (
                    1
                    if mode == "changed_choice" and not self.p.name.endswith("-original.pt")
                    else 0
                )

        if mode == "target_exists":
            (run / "v17-reference.pt").write_text("existing")
        if mode == "source_bytes_changed":
            next(iter(sources.values()))[0].write_bytes(b"bad")
        report = {"checkpoints": {}}
        windows = [{"mockGreedyIndex": i % 3} for i in range(28)]
        ns.update(
            SOURCES=sources,
            hashlib=hashlib,
            io=io,
            copy=copy,
            read=read,
            OLD_PREP=prior,
            RUN=run,
            SOURCE_ENGINE_SHA="b" * 64,
            pins={"metadata": new, "engineSha256": "a" * 64},
            CheckpointScorer=FakeScorer,
            windows=windows,
            report=report,
            digest=digest,
        )
        exec(compile(ast.Module(body=loops, type_ignores=[]), str(FOUNDATION), "exec"), ns)
        assert set(report["checkpoints"]) == set(sources)
        for name, (p, sha) in sources.items():
            assert p.read_bytes() == before[name] and digest(p) == sha
            target = load(run / (name + ".pt"))
            original = load(p)
            assert (
                target["model"] == original["model"]
                and target["optimizer"] == original["optimizer"]
            )
            assert report["checkpoints"][name]["identicalInputGreedyChoices"] == [
                i % 3 for i in range(28)
            ]
        return {
            "checkpointCount": 4,
            "syntheticQueriesPerCheckpoint": 28,
            "mockStorageRoundtripOnly": True,
            "priorReceiptPresent": prior_receipt,
        }


def closure_fixture(mode="valid"):
    """Opaque synthetic checkpoints and mocked prior closure; no model proof."""
    with tempfile.TemporaryDirectory(prefix="v49-future-closure-fixture-") as tmp:
        lab = Path(tmp)
        run = lab / "run"
        transfer = lab / "transfers"
        launch = Path(str(run) + "-launch")
        for path in (run, transfer, launch):
            path.mkdir()
        own = transfer / "aegis-v49-latest-engine-migration-launch-identity.json"
        operator_sha = digest(OP)
        (launch / "launch.sh").write_text("future wrapper fixture", encoding="utf-8")
        (launch / "exit-code.txt").write_text("0", encoding="utf-8")
        identity = {
            "wholeWrapperPid": 99999999,
            "startTicks": "123",
            "run": run.name,
            "operatorSha256": operator_sha,
            "wrapperSha256": digest(launch / "launch.sh"),
        }
        if mode == "live_wrapper":
            pid = os.getpid()
            text = (Path("/proc") / str(pid) / "stat").read_text(encoding="utf-8")
            identity.update(
                wholeWrapperPid=pid, startTicks=text[text.rindex(")") + 2 :].split()[19]
            )
        save(own, identity)
        (run / "operator.py").write_bytes(OP.read_bytes())
        queries = REFERENCE.parent / "queries.jsonl"
        (run / "queries.jsonl").write_bytes(queries.read_bytes())
        sources = {}
        records = {}
        for label in ("v17-reference", "source-challenger", "fitted-reference", "challenger"):
            source = transfer / (label + "-original.pt")
            target = run / (label + ".pt")
            source.write_bytes(("opaque original fixture " + label).encode())
            target.write_bytes(("opaque migrated fixture " + label).encode())
            sources[label] = (source, digest(source))
            records[label] = {
                "sourcePath": str(source),
                "sourceCheckpointSha256": digest(source),
                "path": str(target),
                "checkpointSha256": digest(target),
                "sourceEngineSha256": "b" * 64,
                "targetEngineSha256": "a" * 64,
                "actualLearningUpdates": 0,
                "metadataChangedOnlyEngineFingerprint": True,
                "modelAndAdamByteExact": True,
                "allSavedFieldsPreservedExceptMetadataAndMigrationReceipt": True,
                "identicalInputReloadChoicesExact": True,
                "identicalInputGreedyChoices": [0] * 28,
            }
        pins = {
            "sourceCommit": "fixture-only",
            "completionSha256": "fixture-prep-seal",
            "engineSha256": "a" * 64,
            "sourceCheckpointHashes": {k: v[1] for k, v in sources.items()},
        }
        prep = types.SimpleNamespace(CHECKOUT=lab / "checkout")
        prep_identity = transfer / "prep-identity.json"
        save(prep_identity, {"explicitFixture": True})
        report = {
            "operatorSha256": operator_sha,
            "preparationPins": pins,
            "actualLearningUpdates": 0,
            "identicalInputQuerySha256": digest(queries),
            "identicalInputWindows": 28,
            "gameBehaviorPreservationClaimed": False,
            "noPromotionClaim": True,
            "loadedModules": {
                k: str(prep.CHECKOUT / "tools/bot-training" / (k + ".py"))
                for k in ("inference", "features", "model")
            },
            "checkpoints": records,
        }
        completion = {
            "completedEngineOnlyMigration": True,
            "operatorSha256": operator_sha,
            "foundationSha256": digest(FOUNDATION),
            "preparationCompletionSha256": pins["completionSha256"],
            "sourceCommit": pins["sourceCommit"],
            "targetEngineSha256": "a" * 64,
            "sourceEngineSha256": "b" * 64,
            "actualLearningUpdates": 0,
            "noStrengthPhysicalMasteryOrPromotionClaim": True,
            "finalBlindNotPlayedByThisOperator": True,
            "sourceCheckpointHashes": pins["sourceCheckpointHashes"],
            "checkpointHashes": {k: v["checkpointSha256"] for k, v in records.items()},
        }
        save(
            run / "started.json",
            {"operatorSha256": operator_sha, "preparationPins": pins, "actualLearningUpdates": 0},
        )
        save(
            run / "queued.json",
            {
                "operatorSha256": operator_sha,
                "waitingForWholePreparation": read(prep_identity),
                "sourceCheckpointHashes": pins["sourceCheckpointHashes"],
                "actualLearningUpdates": 0,
                "migrationStarted": False,
                "noPromotionClaim": True,
            },
        )
        record = records["challenger"]
        if mode == "missing_role":
            del records["challenger"]
        if mode == "changed_target":
            (run / "challenger.pt").write_bytes(b"changed")
        if mode == "wrong_source_path":
            record["sourcePath"] = "wrong"
        if mode == "wrong_source_hash":
            record["sourceCheckpointSha256"] = "wrong"
        if mode == "wrong_target_path":
            record["path"] = "wrong"
        if mode == "wrong_target_engine":
            record["targetEngineSha256"] = "c" * 64
        if mode == "learning_update":
            record["actualLearningUpdates"] = 1
        if mode == "bool_learning_update":
            record["actualLearningUpdates"] = False
        if mode == "short_choices":
            record["identicalInputGreedyChoices"] = [0] * 27
        if mode == "bool_choices":
            record["identicalInputGreedyChoices"][0] = False
        if mode == "negative_choices":
            record["identicalInputGreedyChoices"][0] = -1
        if mode in (
            "modelAndAdamByteExact",
            "allSavedFieldsPreservedExceptMetadataAndMigrationReceipt",
            "metadataChangedOnlyEngineFingerprint",
            "identicalInputReloadChoicesExact",
        ):
            record[mode] = False
        if mode == "bool_windows":
            report["identicalInputWindows"] = True
        if mode == "claim_behavior":
            report["gameBehaviorPreservationClaimed"] = True
        if mode == "wrong_loaded_module":
            report["loadedModules"]["model"] = "wrong"
        if mode == "wrong_preparation":
            completion["preparationCompletionSha256"] = "wrong"
        if mode == "exit1":
            (launch / "exit-code.txt").write_text("1", encoding="utf-8")
        if mode == "started_changed":
            save(run / "started.json", {})
        if mode == "queued_changed":
            save(run / "queued.json", {})
        save(run / "report.json", report)
        completion["reportSha256"] = digest(run / "report.json")
        completion["outputs"] = {
            str(f.relative_to(run)): digest(f) for f in run.rglob("*") if f.is_file()
        }
        if mode == "output_missing":
            completion["outputs"].pop("challenger.pt")
        save(run / "completion.json", completion)
        checks = []
        ns = {
            "Any": Any,
            "Path": Path,
            "re": re,
            "sys": sys,
            "LAB": lab,
            "RUN": run,
            "__file__": str(OP),
            "digest": digest,
            "read": read,
            "require_sources": lambda: checks.append("mocked-immutable-source-check"),
            "prep_module": lambda: prep,
            "verify_runtime": lambda module: pins,
            "FOUNDATION_SHA": digest(FOUNDATION),
            "SOURCE_ENGINE_SHA": "b" * 64,
            "QUERIES_SHA": digest(queries),
            "SOURCES": sources,
            "IDENTITY": prep_identity,
        }
        defs(OP, {"closed_migration"}, ns)
        result = ns["closed_migration"](digest(own))
        assert checks == ["mocked-immutable-source-check"] * 2
        assert result["runtimeOrStrengthAcceptanceOfLatestSource"] is False
        return result


def wait_fixture(source, exit_code="0"):
    """Simulate predecessor exit just after a poll; do not wait or signal it."""
    tree = ast.parse(source.read_text(encoding="utf-8"))
    namespace = {"__name__": "fixture_only", "__file__": str(source)}
    exec(compile(tree, str(source), "exec"), namespace)
    with tempfile.TemporaryDirectory(prefix="v49-wait-fixture-") as tmp:
        prep = Path(tmp) / "prep"
        launch = Path(str(prep) + "-launch")
        launch.mkdir()
        (launch / "exit-code.txt").write_text(exit_code, encoding="utf-8")
        identity_path = Path(tmp) / "identity.json"
        namespace.update(PREP=prep, IDENTITY=identity_path)
        wait = next(
            n
            for n in tree.body
            if isinstance(n, ast.FunctionDef) and n.name == "wait_for_preparation"
        )
        identity_dict = next(
            n.test.comparators[0]
            for n in wait.body
            if isinstance(n, ast.Assert)
            and isinstance(n.test, ast.Compare)
            and isinstance(n.test.comparators[0], ast.Dict)
        )
        identity = eval(
            compile(ast.Expression(body=identity_dict), "fixture-identity", "eval"), namespace
        )
        save(identity_path, identity)
        namespace["IDENTITY_SHA"] = digest(identity_path)
        stat = Path(tmp) / "stat"
        fields = ["S", "1"] + ["0"] * 18
        fields[19] = identity["startTicks"]
        stat.write_text("1 (python) " + " ".join(fields), encoding="utf-8")
        clock = types.SimpleNamespace(elapsed=0)
        clock.monotonic = lambda: clock.elapsed

        def sleep(seconds):
            clock.elapsed += seconds
            stat.unlink()

        clock.sleep = sleep
        namespace["time"] = clock
        namespace["Path"] = lambda value: stat if str(value).startswith("/proc/") else Path(value)
        namespace["wait_for_preparation"]()
        return clock.elapsed


class FutureGuardTests(unittest.TestCase):
    def test_optimized_python_cannot_disable_guards(self):
        result = subprocess.run(
            [sys.executable, "-O", str(OP)], capture_output=True, text=True, check=False
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Optimization disables custody assertions", result.stderr)

    def test_phase_transition_poll_latency_mock(self):
        prior = PROOF_ROOT / "aegis-v47-updated-engine-migration.py"
        self.assertEqual(wait_fixture(prior), 30)
        self.assertEqual(wait_fixture(OP), 1)

    def test_failed_preparation_exit_still_rejected(self):
        with self.assertRaises(AssertionError):
            wait_fixture(OP, "1")

    def test_actual_source_and_archive_exact(self):
        manifest = read(MANIFEST)
        source_root = Path(__file__).resolve().parents[3]
        self.assertEqual(manifest["sourceCommit"], "7c8d7c7e0a38226bdd8d607e1531bb937db4d199")
        self.assertEqual(len(manifest["files"]), 12317)
        self.assertEqual(len(manifest["symlinks"]), 1)
        self.assertEqual(digest(ARCHIVE), manifest["archiveSha256"])
        for name, expected in manifest["files"].items():
            self.assertEqual(digest(source_root / name), expected, name)
        for name, target in manifest["symlinks"].items():
            self.assertEqual(os.readlink(source_root / name), target, name)
        files = {}
        links = {}
        seen = set()
        with tarfile.open(ARCHIVE, "r:gz") as archive:
            for member in archive:
                name = member.name
                self.assertNotIn(name, seen)
                seen.add(name)
                self.assertFalse(Path(name).is_absolute())
                self.assertNotIn("..", Path(name).parts)
                if member.isfile():
                    stream = archive.extractfile(member)
                    self.assertIsNotNone(stream)
                    with stream:
                        files[name] = hashlib.file_digest(stream, "sha256").hexdigest()
                elif member.issym():
                    links[name] = member.linkname
                elif not member.isdir():
                    self.fail("Unexpected source archive member: " + name)
        self.assertEqual(files, manifest["files"])
        self.assertEqual(links, manifest["symlinks"])

    def test_future_closure_mock(self):
        self.assertEqual(len(closure_fixture()["checkpointHashes"]), 4)

    def test_adversarial_future_closure_mocks(self):
        modes = [
            "missing_role",
            "changed_target",
            "wrong_source_path",
            "wrong_source_hash",
            "wrong_target_path",
            "wrong_target_engine",
            "learning_update",
            "bool_learning_update",
            "short_choices",
            "bool_choices",
            "negative_choices",
            "modelAndAdamByteExact",
            "allSavedFieldsPreservedExceptMetadataAndMigrationReceipt",
            "metadataChangedOnlyEngineFingerprint",
            "identicalInputReloadChoicesExact",
            "bool_windows",
            "claim_behavior",
            "wrong_loaded_module",
            "wrong_preparation",
            "exit1",
            "started_changed",
            "queued_changed",
            "output_missing",
        ]
        if sys.platform == "linux":
            modes.append("live_wrapper")
        for mode in modes:
            with (
                self.subTest(mode=mode),
                self.assertRaises((AssertionError, KeyError, FileNotFoundError)),
            ):
                closure_fixture(mode)

    def test_pinned_external_source_inputs(self):
        self.assertEqual(digest(PREPARER), PREPARER_SHA)
        self.assertEqual(
            digest(FOUNDATION), "435f271a27f28e29c78d917097f0672f0fac7792c72ce1ce7070e1a1aa193d2b"
        )
        self.assertEqual(
            digest(REFERENCE), "bb8ee142697bfeb7ac1788d8e253f31b4272da4a549113a1ebba304fcf8c48a8"
        )
        self.assertEqual(
            digest(MANIFEST), "540dbcc68792f5d62e8a5661afe11b61bcb4b22be7739f6b0a9ad2433df24dcc"
        )
        self.assertEqual(
            digest(IDENTITY), "3300e29a8464bb80c55f9506538ee5b4a219b615a08ca49c17ed6f4cf1323f22"
        )

    def test_valid_future_runtime_mock(self):
        self.assertEqual(runtime_fixture()["phaseCount"], 11)
        self.assertNotIn("torch", sys.modules)

    def test_adversarial_future_runtime_mocks(self):
        modes = [
            "exit1",
            "operator_changed",
            "identity_changed",
            "checkpoint_hashes",
            "checkpoint_paths",
            "untrained",
            "source_commit",
            "same_fingerprint",
            "learning_updates",
            "bool_learning_updates",
            "unchecked_migration",
            "wrong_versions",
            "manifest_changed",
            "baseline_changed",
            "runtime_changed",
            "metadata_card_change",
            "metadata_log_change",
            "curriculum_change",
            "engine_test_count",
            "engine_file_count",
            "python_failed",
            "command_changed",
            "cwd_changed",
            "bool_exit",
            "phase_failed",
            "output_map_missing",
            "nested_extra",
            "python_changed",
            "source_helper_reject",
            "custody_helper_reject",
            "prior_migration_changed",
            "same_prior_engine",
        ]
        for mode in modes:
            with (
                self.subTest(mode=mode),
                self.assertRaises((AssertionError, KeyError, FileNotFoundError)),
            ):
                runtime_fixture(mode)

    def test_unchanged_preservation_loop_fake_storage(self):
        for prior_receipt in (True, False):
            with self.subTest(prior_receipt=prior_receipt):
                self.assertEqual(
                    migration_fixture(prior_receipt=prior_receipt)["checkpointCount"], 4
                )

    def test_adversarial_preservation_fake_storage(self):
        for mode in (
            "wrong_source_metadata",
            "save_changes_adam",
            "changed_choice",
            "target_exists",
            "source_bytes_changed",
        ):
            with self.subTest(mode=mode), self.assertRaises(AssertionError):
                migration_fixture(mode)

    def test_model_imports_follow_complete_guards(self):
        tree = ast.parse(OP.read_text(encoding="utf-8"))
        functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
        main = ast.unparse(functions["main"])
        self.assertLess(main.index("wait_for_preparation()"), main.index("verify_runtime(module)"))
        self.assertLess(
            main.index("verify_runtime(module)"), main.index("helpers['require_idle']()")
        )
        self.assertLess(
            main.index("helpers['require_idle']()"), main.index("migrate_unchanged(pins)")
        )
        for name, node in functions.items():
            if name != "migrate_unchanged":
                self.assertNotIn("import torch", ast.unparse(node))
        self.assertIn("compile(ast.Module(body=loops", ast.unparse(functions["migrate_unchanged"]))
        self.assertIn("body=same_nodes", ast.unparse(functions["migrate_unchanged"]))


if __name__ == "__main__":
    unittest.main(verbosity=2)
