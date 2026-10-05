"""Hostile V50 guard tests. All future closure/build fixtures are SYNTHETIC.

Only the explicitly named archive/source test reads actual sealed source bytes.
No remote job, trained checkpoint, Torch import, CUDA query or game is invoked.
"""

import copy
import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tarfile
import tempfile
import types
import unittest
from contextlib import ExitStack, contextmanager
from pathlib import Path
from unittest.mock import Mock, patch

OP = Path(__file__).with_name("aegis-v50-integrated-runtime-qualification.py")


def load():
    spec = importlib.util.spec_from_file_location("synthetic_v50_test", OP)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


@contextmanager
def qualification_fixture():
    """Fake future file evidence with only the historical full consumer replaced."""
    module = load()
    with (
        tempfile.TemporaryDirectory(prefix="v50-synthetic-future-") as temporary,
        ExitStack() as stack,
    ):
        lab = Path(temporary)
        run, checkout, prep, v49 = (lab / name for name in ("run", "checkout", "prep", "v49"))
        for directory in (run, checkout / "tools/bot-training", prep, v49, lab / "transfers"):
            directory.mkdir(parents=True)
        for name, value in {
            "LAB": lab,
            "RUN": run,
            "CHECKOUT": checkout,
            "V49": v49,
            "PYTHON": lab / "venv/bin/python",
        }.items():
            stack.enter_context(patch.object(module, name, value))
        source = {
            "tools/bot-training/features.py": b"FEATURE_VERSION = 7\n",
            "apps/api/src/a.ts": b"// Synthetic API source\n",
            "packages/shared/src/s.ts": b"// Synthetic shared source\n",
        }
        for name, content in source.items():
            path = checkout / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        manifest = {
            "files": {name: module.digest(checkout / name) for name in source},
            "symlinks": {},
        }
        save(run / "source-manifest.json", manifest)
        stack.enter_context(
            patch.object(module, "MANIFEST_SHA", module.digest(run / "source-manifest.json"))
        )
        stack.enter_context(patch.object(module, "source_inputs", return_value=manifest))
        copy_target = run / "operator.py"
        copy_target.write_bytes(OP.read_bytes())
        operator_sha = module.digest(OP)
        metadata = {
            "engineSha256": "e" * 64,
            "schemaVersion": 4,
            "cardIds": [f"BT26-{i:03d}" for i in range(1, 105)]
            + [f"EX13-{i:03d}" for i in range(1, 78)]
            + [f"SYN-{i:03d}" for i in range(298)],
            "decks": list(range(26)),
        }
        curriculum = {
            "schemaVersion": 1,
            "engineSha256": metadata["engineSha256"],
            "decks": list(range(44)),
        }
        pins = {
            "metadata": metadata,
            "curriculum": curriculum,
            "engineSha256": metadata["engineSha256"],
            "completionSha256": "8" * 64,
        }
        for name, count in (("apps/api/dist", "api"), ("packages/shared/dist", "shared")):
            target = checkout / name / (count + ".js")
            target.parent.mkdir(parents=True)
            target.write_bytes(b"// Synthetic compiled bytes\n")
        runtime = module.runtime_map()
        save(run / "runtime-files.json", runtime)
        save(prep / "runtime-files.json", runtime)
        save(
            run / "python-files.json",
            {name: sha for name, sha in manifest["files"].items() if name.endswith(".py")},
        )
        save(prep / "completion.json", {"engineTests": 13783, "engineTestFiles": 819})
        (prep / "engine-tests.log").write_text("SYNTHETIC ENGINE LOG\n", encoding="utf-8")
        old_manifest, original = prep / "old-manifest.json", prep / "prior-python-source.json"
        save(old_manifest, manifest)
        save(original, {"files": {}})
        preparation = types.SimpleNamespace(
            RUN=prep, PRIOR=prep, MANIFEST=old_manifest, CHECKOUT=prep
        )
        bindings = {
            "checkpointHashes": {},
            "engineSha256": metadata["engineSha256"],
            "completionSha256": "9" * 64,
        }
        for label in ("v17-reference", "source-challenger", "fitted-reference", "challenger"):
            path = v49 / (label + ".pt")
            path.write_bytes(("SYNTHETIC CHECKPOINT " + label).encode())
            bindings["checkpointHashes"][label] = module.digest(path)
        sealed = types.SimpleNamespace(IDENTITY_SHA="7" * 64)
        stack.enter_context(
            patch.object(module, "predecessor", return_value=(sealed, preparation, bindings, pins))
        )
        stack.enter_context(
            patch.object(
                module, "compare_sources", return_value={"syntheticSourceComparison": True}
            )
        )
        stack.enter_context(
            patch.object(
                module,
                "build_helpers",
                return_value={"verify_source": module.source_guard, "require_idle": Mock()},
            )
        )
        save(run / "v49-bindings.json", bindings)
        save(run / "queued.json", module.queued(operator_sha))
        save(run / "started.json", module.started(operator_sha, bindings))
        save(run / "checkpoint-bindings.json", module.checkpoint_bindings(bindings))
        for name, value in (("metadata", metadata), ("curriculum", curriculum)):
            save(run / (name + ".json"), value)
            save(run / (name + ".log"), value)
        for phase, args in module.commands().items():
            logfile = run / (phase + ".log")
            text = "SYNTHETIC PHASE LOG\n"
            if phase == "node-version":
                text = "v26.10.0\n"
            elif phase == "python-version":
                text = "Python 3.12.14\n"
            elif phase == "python-tests":
                text = "SYNTHETIC\nRan 73 tests in 0.01s\n\nOK\n"
            elif phase == "delivery-tests":
                text = (
                    "SYNTHETIC\n"
                    + "\n".join(
                        f"# {key} {count}"
                        for key, count in (
                            ("tests", 18),
                            ("pass", 18),
                            ("fail", 0),
                            ("cancelled", 0),
                            ("skipped", 0),
                            ("todo", 0),
                        )
                    )
                    + "\n"
                )
            if not logfile.exists():
                logfile.write_text(text, encoding="utf-8")
            start = module.phase_start(phase, args)
            save(run / (phase + "-started.json"), start)
            save(
                run / (phase + "-receipt.json"),
                dict(start, completed=True, exitCode=0, logSha256=module.digest(logfile)),
            )
        report = module.verify_qualification(operator_sha)
        save(run / "report.json", report)
        save(
            run / "completion.json",
            {
                "reportSha256": module.digest(run / "report.json"),
                "qualification": report,
                "outputs": module.file_map(run, exclude={run / "completion.json"}),
            },
        )
        launch = Path(str(run) + "-launch")
        launch.mkdir()
        (launch / "launch.sh").write_bytes(b"# SYNTHETIC WRAPPER\n")
        (launch / "exit-code.txt").write_text("0\n", encoding="utf-8")
        identity = {
            "wholeWrapperPid": 987654321,
            "startTicks": "123",
            "run": run.name,
            "operatorSha256": operator_sha,
            "wrapperSha256": module.digest(launch / "launch.sh"),
        }
        identity_path = lab / "transfers" / (module.STEM + "-launch-identity.json")
        save(identity_path, identity)
        yield module, module.digest(identity_path), operator_sha


class V50Guards(unittest.TestCase):
    def test_actual_local_compiler_cache_only_difference_is_narrowly_validated(self):
        module = load()
        before = Path(
            os.environ.get("AEGIS_V50_CACHE_BASE", "/Users/viniciusluiz/aegis-bot-chronomon")
        )
        after = Path(
            os.environ.get(
                "AEGIS_V50_CACHE_CURRENT",
                "/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-delivery",
            )
        )
        prefix = "packages/shared/dist"
        old = {prefix + "/" + key: sha for key, sha in module.file_map(before / prefix).items()}
        new = {prefix + "/" + key: sha for key, sha in module.file_map(after / prefix).items()}
        proof = Path(os.environ.get("AEGIS_V50_LOCAL_PROOF_ROOT", "/tmp"))
        manifest = module.read(proof / "aegis-v50-integrated-source-manifest.json")
        with patch.object(module, "CHECKOUT", after):
            report = module.compare_runtime(new, old, before, manifest)
        self.assertTrue(report["allExecutableDataDeclarationsAndSourceMapsByteExact"])
        self.assertEqual(len(new), 455)

    def test_synthetic_compiler_cache_rejects_nonhistory_differences(self):
        module = load()
        cache = "packages/shared/dist/.tsbuildinfo"
        with tempfile.TemporaryDirectory() as temporary:
            old_checkout, checkout = Path(temporary) / "old", Path(temporary) / "new"
            before = {
                "version": "7.0.2",
                "root": [[1, 2]],
                "options": {"strict": True},
                "fileNames": ["../src/cards/data/cards.json", "../src/a.ts"],
                "fileInfos": [{"version": "a" * 32, "signature": "b" * 32}, "c" * 32],
                "latestChangedDtsFile": "./a.d.ts",
            }
            after = copy.deepcopy(before)
            del after["fileInfos"][0]["signature"]
            after["latestChangedDtsFile"] = "./b.d.ts"
            save(old_checkout / cache, before)
            manifest = {"files": {"packages/shared/src/cards/data/cards.json": "f" * 64}}
            base = {
                "packages/shared/dist/a.d.ts": "d" * 64,
                "packages/shared/dist/b.d.ts": "e" * 64,
                "packages/shared/dist/a.js": "f" * 64,
            }
            with patch.object(module, "CHECKOUT", checkout):
                for mode in (
                    "valid",
                    "option",
                    "version",
                    "input-version",
                    "signature-value",
                    "signature-format",
                    "source-name",
                    "diagnostics",
                    "latest-escape",
                    "latest-missing",
                    "executable",
                    "inventory",
                    "api-cache",
                ):
                    value = copy.deepcopy(after)
                    old, new = (
                        dict(base, **{cache: module.digest(old_checkout / cache)}),
                        dict(base),
                    )
                    if mode == "option":
                        value["options"]["strict"] = False
                    elif mode == "version":
                        value["version"] = "6.0.0"
                    elif mode == "input-version":
                        value["fileInfos"][0]["version"] = "c" * 32
                    elif mode == "signature-value":
                        value["fileInfos"][0]["signature"] = "c" * 32
                    elif mode == "signature-format":
                        value["fileInfos"][0]["signature"] = "malformed"
                    elif mode == "source-name":
                        value["fileNames"][0] = "../src/unpinned.json"
                    elif mode == "diagnostics":
                        value["semanticDiagnosticsPerFile"] = [1]
                    elif mode == "latest-escape":
                        value["latestChangedDtsFile"] = "./../../outside.d.ts"
                    elif mode == "latest-missing":
                        value["latestChangedDtsFile"] = "./missing.d.ts"
                    elif mode == "executable":
                        new["packages/shared/dist/a.js"] = "0" * 64
                    elif mode == "inventory":
                        new["packages/shared/dist/extra.js"] = "0" * 64
                    elif mode == "api-cache":
                        new["apps/api/dist/.tsbuildinfo"] = "0" * 64
                        old["apps/api/dist/.tsbuildinfo"] = "1" * 64
                    save(checkout / cache, value)
                    new[cache] = module.digest(checkout / cache)
                    with self.subTest(mode=mode):
                        if mode == "valid":
                            report = module.compare_runtime(new, old, old_checkout, manifest)
                            self.assertFalse(report["completeRuntimeMapsByteExact"])
                            self.assertEqual(
                                report["compilerCacheDifferences"][0][
                                    "optionalJsonSignatureHistory"
                                ],
                                ["../src/cards/data/cards.json"],
                            )
                        else:
                            with self.assertRaises(ValueError):
                                module.compare_runtime(new, old, old_checkout, manifest)

    def test_actual_archive_and_reviewed_source_delta(self):
        module = load()
        proof = Path(os.environ.get("AEGIS_V50_LOCAL_PROOF_ROOT", "/tmp"))
        root = Path(
            os.environ.get(
                "AEGIS_BOT_REFERENCE_ROOT",
                "/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training",
            )
        )
        module.ARCHIVE = proof / "aegis-bt26-ex13-7d34b4c12-v50.tar.gz"
        module.MANIFEST = proof / "aegis-v50-integrated-source-manifest.json"
        new = module.source_inputs()
        module.verify_archive(module.ARCHIVE, new)
        old = module.read(proof / "aegis-v48-main-fixes-source-manifest.json")
        original = module.read(
            root / "2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/prior-python-source.json"
        )
        result = module.compare_sources(new, old, original)
        self.assertEqual(result["protectedEngineDataRulesLockFilesExact"], 10621)
        for name in (
            "apps/api/src/engine/GameState.ts",
            "packages/shared/src/index.ts",
            "pnpm-lock.yaml",
            "tools/bot-training/features.py",
            "tools/bot-training/inference.py",
        ):
            if name not in new["files"]:
                continue
            bad = copy.deepcopy(new)
            bad["files"][name] = "f" * 64
            with self.subTest(source=name), self.assertRaises(ValueError):
                module.compare_sources(bad, old, original)
        for mutation in ("remove", "extra", "links", "train", "original"):
            bad = copy.deepcopy(new)
            source = copy.deepcopy(original)
            if mutation == "remove":
                del bad["files"]["AGENTS.md"]
            elif mutation == "extra":
                bad["files"]["tools/bot-training/unreviewed.py"] = "f" * 64
            elif mutation == "links":
                bad["symlinks"] = {}
            elif mutation == "train":
                bad["files"]["tools/bot-training/train.py"] = "f" * 64
            else:
                source["files"]["features.py"] = "f" * 64
            with self.subTest(delta=mutation), self.assertRaises(ValueError):
                module.compare_sources(bad, old, source)

    def test_archive_rejects_duplicates_traversal_links_special_and_missing(self):
        module = load()
        payload = b"source"
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "archive.tar.gz"
            expected = {"files": {"a.txt": hashlib.sha256(payload).hexdigest()}, "symlinks": {}}
            for mode in (
                "duplicate",
                "absolute",
                "traversal",
                "normalized",
                "backslash",
                "hardlink",
                "symlink",
                "fifo",
                "unknown",
                "missing",
                "hash",
                "extra-dir",
                "under-link",
            ):
                with tarfile.open(path, "w:gz") as bundle:
                    info = tarfile.TarInfo("a.txt")
                    info.size = len(payload)
                    bundle.addfile(info, io.BytesIO(payload))
                    name = {
                        "absolute": "/bad",
                        "traversal": "../bad",
                        "normalized": "a/./bad",
                        "backslash": "a\\bad",
                        "unknown": "unknown.txt",
                        "extra-dir": "unlisted",
                        "under-link": "alias/child",
                    }.get(mode, "a.txt" if mode == "duplicate" else "second")
                    if mode in {"missing", "hash"}:
                        continue
                    second = tarfile.TarInfo(name)
                    if mode in {"hardlink", "symlink", "fifo", "extra-dir"}:
                        second.type = {
                            "hardlink": tarfile.LNKTYPE,
                            "symlink": tarfile.SYMTYPE,
                            "fifo": tarfile.FIFOTYPE,
                            "extra-dir": tarfile.DIRTYPE,
                        }[mode]
                        second.linkname = "../../escape"
                        bundle.addfile(second)
                    else:
                        second.size = len(payload)
                        bundle.addfile(second, io.BytesIO(payload))
                manifest = copy.deepcopy(expected)
                if mode == "missing":
                    manifest["files"]["absent"] = "f" * 64
                if mode == "hash":
                    manifest["files"]["a.txt"] = "f" * 64
                if mode == "under-link":
                    manifest["symlinks"]["alias"] = "/outside"
                with self.subTest(mode=mode), self.assertRaises(ValueError):
                    module.verify_archive(path, manifest)

    def test_exclusive_writes_and_strict_json(self):
        module = load()
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "receipt.json"
            module.write(path, {"unchanged": True})
            with self.assertRaises(FileExistsError):
                module.write(path, {"changed": True})
            self.assertEqual(module.read(path), {"unchanged": True})
            for content in ('{"a":1,"a":2}', '{"a":NaN}', '{"a":Infinity}', '{"a":-Infinity}'):
                path.write_text(content, encoding="utf-8")
                with self.subTest(json=content), self.assertRaises(ValueError):
                    module.read(path)

    def test_synthetic_valid_closure_claims_only_cpu_runtime(self):
        with qualification_fixture() as (module, identity, _):
            result = module.closed(identity)
            self.assertTrue(result["cpuRuntimeQualified"])
            self.assertFalse(result["actualPrimaryModelOrCudaParityQualified"])
            self.assertFalse(result["finalBlindAccepted"])
            self.assertEqual(
                set(result["checkpointBindings"]),
                {"v17-reference", "source-challenger", "fitted-reference", "challenger"},
            )
            self.assertNotIn("torch", sys.modules)

    def test_synthetic_runtime_rejects_metadata_source_runtime_and_checkpoint_changes(self):
        for mode in (
            "fingerprint",
            "curriculum",
            "vocabulary",
            "feature",
            "python-map",
            "extra-python",
            "source",
            "extra-engine",
            "compiled",
            "old-compiled",
            "checkpoint",
            "checkpoint-path",
            "bindings",
            "operator",
            "manifest",
            "queued",
            "started",
        ):
            with self.subTest(mode=mode), qualification_fixture() as (module, identity, _):
                if mode in {"fingerprint", "vocabulary", "curriculum"}:
                    path = module.RUN / (
                        "curriculum.log" if mode == "curriculum" else "metadata.log"
                    )
                    value = module.read(path)
                    if mode == "vocabulary":
                        value["cardIds"].pop()
                    else:
                        value["engineSha256"] = "f" * 64
                    save(path, value)
                elif mode in {"source", "feature"}:
                    (module.CHECKOUT / "tools/bot-training/features.py").write_text(
                        "FEATURE_VERSION = 8\n", encoding="utf-8"
                    )
                elif mode == "extra-python":
                    (module.CHECKOUT / "tools/bot-training/extra.py").write_bytes(b"extra")
                elif mode == "extra-engine":
                    (module.CHECKOUT / "apps/api/src/extra.ts").write_bytes(b"extra")
                elif mode == "compiled":
                    (module.CHECKOUT / "apps/api/dist/api.js").write_bytes(b"mutated")
                elif mode == "old-compiled":
                    save(module.LAB / "prep/runtime-files.json", {})
                elif mode == "checkpoint":
                    (module.V49 / "challenger.pt").write_bytes(b"changed")
                elif mode == "checkpoint-path":
                    value = module.read(module.RUN / "checkpoint-bindings.json")
                    value["challenger"]["path"] = str(module.V49 / "fitted-reference.pt")
                    save(module.RUN / "checkpoint-bindings.json", value)
                elif mode in {"operator", "manifest"}:
                    (
                        module.RUN
                        / ("operator.py" if mode == "operator" else "source-manifest.json")
                    ).write_bytes(b"changed")
                else:
                    filename = {"bindings": "v49-bindings", "python-map": "python-files"}.get(
                        mode, mode
                    )
                    save(module.RUN / (filename + ".json"), {"forged": True})
                with self.assertRaises((ValueError, KeyError)):
                    module.closed(identity)

    def test_synthetic_phase_contracts_reject_forged_success(self):
        for mode in (
            "command",
            "cwd",
            "bool-exit",
            "nonzero",
            "incomplete",
            "hash",
            "start",
            "node",
            "python",
            "61-tests",
            "skipped",
            "17-delivery",
            "delivery-failure",
            "extra-log",
        ):
            with self.subTest(mode=mode), qualification_fixture() as (module, identity, _):
                path = module.RUN / "python-tests-receipt.json"
                receipt = module.read(path)
                if mode == "command":
                    receipt["command"] = ["echo", "OK"]
                elif mode == "cwd":
                    receipt["cwd"] = "/old/runtime"
                elif mode == "bool-exit":
                    receipt["exitCode"] = False
                elif mode == "nonzero":
                    receipt["exitCode"] = 1
                elif mode == "incomplete":
                    receipt["completed"] = False
                elif mode == "hash":
                    receipt["logSha256"] = "f" * 64
                elif mode == "start":
                    save(module.RUN / "python-tests-started.json", {})
                elif mode == "extra-log":
                    (module.RUN / "unexpected.log").write_bytes(b"extra")
                else:
                    phase = {
                        "node": "node-version",
                        "python": "python-version",
                        "17-delivery": "delivery-tests",
                        "delivery-failure": "delivery-tests",
                    }.get(mode, "python-tests")
                    log = module.RUN / (phase + ".log")
                    text = log.read_text(encoding="utf-8")
                    text = {
                        "node": "v24.21.0\n",
                        "python": "Python 3.12.12\n",
                        "61-tests": "Ran 61 tests in 1.0s\nOK\n",
                        "skipped": "Ran 73 tests in 1.0s\nOK (skipped=1)\n",
                    }.get(
                        mode,
                        text.replace("# pass 18", "# pass 17")
                        if mode == "17-delivery"
                        else text.replace("# fail 0", "# fail 1"),
                    )
                    log.write_text(text, encoding="utf-8")
                    other = module.read(module.RUN / (phase + "-receipt.json"))
                    other["logSha256"] = module.digest(log)
                    save(module.RUN / (phase + "-receipt.json"), other)
                    if phase == "python-tests":
                        receipt = other
                save(path, receipt)
                with self.assertRaises(ValueError):
                    module.closed(identity)

    def test_synthetic_whole_completion_rejects_incomplete_or_mutated_outputs(self):
        for mode in (
            "live",
            "exit",
            "no-exit",
            "wrapper",
            "completion",
            "extra-output",
            "report",
            "identity",
            "bool-pid",
            "bad-ticks",
            "symlink-output",
        ):
            with self.subTest(mode=mode), qualification_fixture() as (module, identity, _):
                launch = Path(str(module.RUN) + "-launch")
                identity_path = module.LAB / "transfers" / (module.STEM + "-launch-identity.json")
                if mode == "live":
                    live = patch.object(module, "process_live", return_value=True)
                else:
                    live = patch.object(module, "process_live", return_value=False)
                if mode == "exit":
                    (launch / "exit-code.txt").write_text("1\n", encoding="utf-8")
                elif mode == "no-exit":
                    (launch / "exit-code.txt").unlink()
                elif mode == "wrapper":
                    (launch / "launch.sh").write_bytes(b"changed")
                elif mode == "extra-output":
                    (module.RUN / "unexpected.json").write_bytes(b"extra")
                elif mode in {"completion", "report"}:
                    save(module.RUN / (mode + ".json"), {"cpuRuntimeQualified": True})
                elif mode == "symlink-output":
                    (module.RUN / "alias").symlink_to(module.RUN / "report.json")
                elif mode in {"identity", "bool-pid", "bad-ticks"}:
                    value = module.read(identity_path)
                    if mode == "bool-pid":
                        value["wholeWrapperPid"] = True
                    elif mode == "bad-ticks":
                        value["startTicks"] = 123
                    else:
                        value["run"] = "other"
                    save(identity_path, value)
                    identity = module.digest(identity_path)
                with live, self.assertRaises((ValueError, FileNotFoundError)):
                    module.closed(identity)

    def test_predecessor_full_consumer_is_called_without_shortcuts(self):
        module = load()
        sealed = types.ModuleType("synthetic_predecessor")
        sealed.RUN = module.V49
        prep = types.SimpleNamespace(MANIFEST=Path("synthetic-manifest"))
        bindings, pins = {"engineSha256": "e" * 64}, {"engineSha256": "e" * 64}
        order = []
        sealed.closed_migration = lambda sha: order.append(("closed_migration", sha)) or bindings
        sealed.require_sources = lambda: order.append(("require_sources",))
        sealed.prep_module = lambda: order.append(("prep_module",)) or prep
        sealed.verify_runtime = lambda value: order.append(("verify_runtime", value)) or pins
        spec = types.SimpleNamespace(loader=types.SimpleNamespace(exec_module=lambda value: None))
        hashes = lambda path: (
            module.V48_MANIFEST_SHA if path == prep.MANIFEST else module.V49_OPERATOR_SHA
        )
        with (
            patch.object(module, "predecessor_identity"),
            patch.object(module, "process_live", return_value=False),
            patch.object(module, "digest", side_effect=hashes),
            patch.object(module.importlib.util, "spec_from_file_location", return_value=spec),
            patch.object(module.importlib.util, "module_from_spec", return_value=sealed),
        ):
            self.assertEqual(module.predecessor()[2:], (bindings, pins))
        self.assertEqual(
            [item[0] for item in order],
            ["closed_migration", "require_sources", "prep_module", "verify_runtime"],
        )
        self.assertEqual(order[0][1], module.V49_IDENTITY_SHA)

    def test_public_idle_reuses_supported_helper_without_model_or_job_start(self):
        module = load()
        idle = Mock()
        prep = types.SimpleNamespace()
        sealed = types.SimpleNamespace(prep_module=Mock(return_value=prep))
        spec = types.SimpleNamespace(loader=types.SimpleNamespace(exec_module=Mock()))
        with (
            patch.object(module, "predecessor_identity") as identity,
            patch.object(module.importlib.util, "spec_from_file_location", return_value=spec),
            patch.object(module.importlib.util, "module_from_spec", return_value=sealed),
            patch.object(module, "build_helpers", return_value={"require_idle": idle}) as helpers,
        ):
            module.require_idle()
        identity.assert_called_once()
        helpers.assert_called_once_with(prep)
        idle.assert_called_once_with()
        self.assertNotIn("torch", sys.modules)

    def test_main_does_not_extract_or_run_phases_before_full_predecessor(self):
        module = load()
        with tempfile.TemporaryDirectory() as temporary:
            module.RUN, module.CHECKOUT = Path(temporary) / "run", Path(temporary) / "checkout"
            module.MANIFEST = Path(temporary) / "manifest.json"
            save(module.MANIFEST, {})
            with (
                patch.object(module, "source_inputs", return_value={}),
                patch.object(module, "predecessor_identity"),
                patch.object(module, "wait_for_predecessor"),
                patch.object(
                    module, "predecessor", side_effect=ValueError("actual predecessor rejected")
                ),
                patch.object(module, "command") as command,
                patch.object(module, "verify_archive") as archive,
            ):
                with self.assertRaisesRegex(ValueError, "actual predecessor rejected"):
                    module.main(module.digest(OP))
                command.assert_not_called()
                archive.assert_not_called()
                self.assertFalse(module.CHECKOUT.exists())
                self.assertFalse((module.RUN / "started.json").exists())

    def test_command_logs_real_exit_and_cpu_environment(self):
        module = load()
        with tempfile.TemporaryDirectory() as temporary:
            module.RUN = module.CHECKOUT = Path(temporary)
            args = [
                sys.executable,
                "-c",
                "import os; print(os.environ['CUDA_VISIBLE_DEVICES']); print(os.environ['PYTHONDONTWRITEBYTECODE'])",
            ]
            module.command("synthetic-success", args)
            self.assertEqual(
                (module.RUN / "synthetic-success.log").read_text(encoding="utf-8"), "-1\n1\n"
            )
            receipt = module.read(module.RUN / "synthetic-success-receipt.json")
            self.assertEqual(receipt["exitCode"], 0)
            self.assertFalse(receipt["primaryModelProof"])
            with self.assertRaises(subprocess.CalledProcessError):
                module.command("synthetic-failure", [sys.executable, "-c", "raise SystemExit(7)"])
            failure = module.read(module.RUN / "synthetic-failure-receipt.json")
            self.assertEqual(failure["exitCode"], 7)
            self.assertFalse(failure["completed"])

    def test_optimization_and_preloaded_torch_are_rejected(self):
        result = subprocess.run(
            [sys.executable, "-O", str(OP), "--closed", "f" * 64],
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Optimization disables", result.stderr)
        module = load()
        with (
            patch.dict(sys.modules, {"torch": types.ModuleType("SYNTHETIC torch")}),
            self.assertRaisesRegex(ValueError, "Unsafe closure interpreter"),
        ):
            module.closed("f" * 64)

    def test_wait_requires_actual_exit_zero_and_exact_identity(self):
        module = load()
        with tempfile.TemporaryDirectory() as temporary:
            module.V49 = Path(temporary) / "v49"
            launch = Path(str(module.V49) + "-launch")
            launch.mkdir()
            (launch / "exit-code.txt").write_text("1\n", encoding="utf-8")
            with (
                patch.object(module, "predecessor_identity") as identity,
                patch.object(module, "process_live", side_effect=[True, False]),
                patch.object(module.time, "sleep") as sleep,
            ):
                with self.assertRaisesRegex(ValueError, "V49 whole failed"):
                    module.wait_for_predecessor()
                sleep.assert_called_once_with(1)
                identity.assert_called_once()
            (launch / "exit-code.txt").write_text("0\n", encoding="utf-8")
            with (
                patch.object(module, "predecessor_identity") as identity,
                patch.object(module, "process_live", return_value=False),
            ):
                module.wait_for_predecessor()
                self.assertEqual(identity.call_count, 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)
