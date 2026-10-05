"""Synthetic stdlib guards only; never launch a job, import Torch or copy a model."""

import ast
import importlib.util
import io
import json
import tarfile
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

OPERATOR = Path(__file__).with_name("material-teacher-runtime.py")
spec = importlib.util.spec_from_file_location("material_teacher_runtime", OPERATOR)
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)
V50_REFERENCE = Path(
    "/Users/viniciusluiz/orca/workspaces/aegis-digimon-tcg/bot-final-qualification/tools/bot-training/operators/aegis-v50-integrated-runtime-qualification.py"
)


class TeacherRuntimeGuards(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.request = self.root / "request.json"
        self.value = {
            "formatVersion": 1,
            "source": {
                "commit": None,
                "archive": {"path": None, "sha256": None, "bytes": None},
                "manifest": {"path": None, "sha256": None},
            },
            "custody": {"completionSha256": None, "reportSha256": None},
        }

    def context(self):
        self.request.write_text(json.dumps(self.value))
        return operator.context(
            self.request, operator.digest(self.request), operator.digest(OPERATOR)
        )

    def test_unknown_actual_pins_reject_before_any_sealed_reader_extract_or_model(self) -> None:
        cases = [("commit", None), ("commit", "c" * 40)]
        for key, value in cases:
            self.value["source"][key] = value
            with (
                patch.object(operator, "load") as loader,
                patch.object(operator.tarfile, "open") as archive,
                self.assertRaises(ValueError),
            ):
                self.context()
            loader.assert_not_called()
            archive.assert_not_called()
        self.assertNotIn("torch", operator.sys.modules)

    def test_duplicate_keys_nonfinite_json_boolean_size_and_optimized_admission_fail(self) -> None:
        for text in ('{"x":1,"x":2}', '{"x":NaN}'):
            self.request.write_text(text)
            with self.assertRaises(ValueError):
                operator.read(self.request)
        self.value["source"] = {
            "commit": "c" * 40,
            "archive": {"sha256": "a" * 64, "bytes": True},
            "manifest": {"sha256": "b" * 64},
        }
        self.value["custody"] = {"completionSha256": "d" * 64, "reportSha256": "e" * 64}
        with self.assertRaisesRegex(ValueError, "archive bytes"):
            self.context()
        self.request.write_text(json.dumps(self.value))
        result = operator.subprocess.run(
            [
                operator.sys.executable,
                "-O",
                str(OPERATOR),
                "inspect",
                "--request",
                str(self.request),
                "--request-sha256",
                operator.digest(self.request),
                "--operator-sha256",
                operator.digest(OPERATOR),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Unsafe closure interpreter", result.stderr)

    def test_only_exact_teacher_delta_and_explicit_external_additions_are_allowed(self) -> None:
        old = {
            "symlinks": {},
            "files": {
                **{name: "1" * 64 for name in operator.MODULES},
                "apps/api/src/engine/index.ts": "1" * 64,
                "pnpm-lock.yaml": "1" * 64,
            },
        }
        changed = {name: "2" * 64 for name in operator.MODULES}
        added = {name: "3" * 64 for name in operator.TESTS}
        added["tools/bot-training/operators/material-teacher-runtime.py"] = "4" * 64
        added.update({name: "5" * 64 for name in operator.ADDED_FOLLOWTHROUGH})
        new = {"symlinks": {}, "files": {**old["files"], **changed, **added}}
        review = {
            "changed": changed,
            "added": added,
            "teacherPins": {**changed, **{name: added[name] for name in operator.TESTS}},
        }
        operator.source_delta(new, old, review)
        for name in (
            "apps/api/src/engine/index.ts",
            "pnpm-lock.yaml",
            "tools/bot-training/model.py",
            "apps/api/src/bot/training/opponents.ts",
        ):
            bad = {**new, "files": {**new["files"], name: "f" * 64}}
            with self.subTest(name=name), self.assertRaises(ValueError):
                operator.source_delta(bad, old, review)
            changed_bad = {
                key: value
                for key, value in bad["files"].items()
                if key in old["files"] and value != old["files"][key]
            }
            added_bad = {
                key: value for key, value in bad["files"].items() if key not in old["files"]
            }
            with self.assertRaisesRegex(ValueError, "source changed"):
                operator.source_delta(
                    bad, old, {**review, "changed": changed_bad, "added": added_bad}
                )

    def test_removed_source_missing_named_test_and_unpinned_teacher_fail(self) -> None:
        old = {"symlinks": {}, "files": {name: "1" * 64 for name in operator.MODULES}}
        new = {
            "symlinks": {},
            "files": {name: "2" * 64 for name in operator.MODULES | operator.TESTS},
        }
        review = {
            "changed": {name: new["files"][name] for name in operator.MODULES},
            "added": {name: new["files"][name] for name in operator.TESTS},
            "teacherPins": dict(new["files"]),
        }
        for bad in ({**new, "files": {}}, {**new, "symlinks": {"bad": "../bad"}}):
            with self.assertRaises(ValueError):
                operator.source_delta(bad, old, review)
        review["teacherPins"][next(iter(operator.MODULES))] = None
        with self.assertRaises(ValueError):
            operator.source_delta(new, old, review)

    def test_lane_paths_cannot_target_existing_sealed_namespace_or_symlink(self) -> None:
        with self.assertRaises(ValueError):
            operator.path_value(None, self.root)
        for value in (str(self.root / "../old"), "relative"):
            with self.assertRaises(ValueError):
                operator.path_value(value, self.root)
        link = self.root / "link"
        link.symlink_to(self.request)
        with self.assertRaises(ValueError):
            operator.path_value(str(link), self.root)

    def test_missing_root_go_or_unclosed_prepare_fails_before_worker_copy_or_subprocess(
        self,
    ) -> None:
        ctx = {"request": {"resourceGo": {"prepare": None}}}
        with (
            patch.object(operator.subprocess, "run") as command,
            patch.object(operator, "host") as host,
            self.assertRaises(ValueError),
        ):
            operator.prepare(ctx, "i" * 64, None)
        command.assert_not_called()
        host.assert_not_called()
        with (
            patch.object(operator, "closed_prepare", side_effect=ValueError("whole still live")),
            patch.object(operator, "migration_report") as model,
            patch.object(operator.subprocess, "run") as command,
            self.assertRaisesRegex(ValueError, "whole still live"),
        ):
            operator.migrate({}, "i" * 64, "p" * 64, "g" * 64)
        command.assert_not_called()
        model.assert_not_called()

    def test_resource_go_binds_actual_prepare_closure_and_boolean_approval(self) -> None:
        transfer = self.root / "transfers"
        transfer.mkdir()
        path = transfer / "material-teacher-go.json"
        ctx = {
            "request": {"resourceGo": {"migrate": str(path)}},
            "operatorSha256": "a" * 64,
            "requestSha256": "b" * 64,
            "v50": SimpleNamespace(
                same=lambda a, b: json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True),
                require_idle=Mock(),
            ),
        }
        prepared = {"identitySha256": "c" * 64, "completionSha256": "d" * 64}
        value = {
            "approved": True,
            "phase": "migrate",
            "operatorSha256": "a" * 64,
            "requestSha256": "b" * 64,
            "prepareIdentitySha256": "c" * 64,
            "prepareCompletionSha256": "d" * 64,
        }
        with patch.object(operator, "LAB", self.root):
            path.write_text(json.dumps(value))
            operator.resource_go(ctx, "migrate", operator.digest(path), prepared)
            for changes in (
                {"approved": 1},
                {"prepareCompletionSha256": None},
                {"operatorSha256": "f" * 64},
                {"phase": "prepare"},
            ):
                path.write_text(json.dumps({**value, **changes}))
                with self.assertRaises(ValueError):
                    operator.resource_go(ctx, "migrate", operator.digest(path), prepared)
        ctx["v50"].require_idle.assert_called_once()

    def test_actual_whole_guard_rejects_live_failed_boolean_identity_and_changed_wrapper(
        self,
    ) -> None:
        if not V50_REFERENCE.is_file():
            self.skipTest("Preserved source helper unavailable")
        module = operator.load(V50_REFERENCE, operator.V50_SHA)
        run = self.root / "material-teacher-prepare"
        launch = Path(str(run) + "-launch")
        launch.mkdir()
        (launch / "launch.sh").write_text("Explicit synthetic wrapper; never run")
        (launch / "exit-code.txt").write_text("0")
        identity = {
            "wholeWrapperPid": 123,
            "startTicks": "456",
            "run": run.name,
            "operatorSha256": "a" * 64,
            "wrapperSha256": operator.digest(launch / "launch.sh"),
        }
        helpers = operator.extract(
            V50_REFERENCE,
            operator.V50_SHA,
            {"verify_whole"},
            {**vars(module), "RUN": run, "process_live": lambda value: False},
        )
        helpers["verify_whole"](identity, "a" * 64)
        for changes in (
            {"wholeWrapperPid": True},
            {"startTicks": None},
            {"wrapperSha256": "f" * 64},
        ):
            with self.assertRaises(ValueError):
                helpers["verify_whole"]({**identity, **changes}, "a" * 64)
        (launch / "exit-code.txt").write_text("1")
        with self.assertRaises(ValueError):
            helpers["verify_whole"](identity, "a" * 64)
        (launch / "exit-code.txt").write_text("0")
        helpers["process_live"] = lambda value: True
        with self.assertRaisesRegex(ValueError, "still live"):
            helpers["verify_whole"](identity, "a" * 64)

    def test_vitest_summaries_allow_negative_fixture_logs_but_reject_incomplete_totals(
        self,
    ) -> None:
        green = "[engine] combat resolve failed: expected negative fixture\n Test Files 819 passed (819)\n      Tests 13783 passed (13783)\n"
        self.assertEqual(operator.vitest_counts(green), (819, 13783))
        for broken in (
            green.replace("819 passed (819)", "818 passed | 1 failed (819)"),
            green.replace("13783 passed (13783)", "13782 passed | 1 skipped (13783)"),
            green.replace("13783 passed (13783)", "13782 passed (13783)"),
            green.replace("Tests 13783 passed (13783)", ""),
            green + " Test Files 819 passed (819)\n",
        ):
            with self.assertRaises(ValueError):
                operator.vitest_counts(broken)

    def test_sealed_ast_migration_and_admission_preserve_original_order_without_top_level_torch(
        self,
    ) -> None:
        tree = ast.parse(OPERATOR.read_text())
        functions = {node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)}
        self.assertFalse(
            any(
                isinstance(node, (ast.Import, ast.ImportFrom)) and "torch" in ast.unparse(node)
                for node in tree.body
            )
        )
        model = ast.unparse(functions["migration_report"])
        self.assertIn("{'migrate_unchanged'}", model)
        self.assertNotIn("torch.load", model)
        migrate = ast.unparse(functions["migrate"])
        self.assertLess(migrate.index("closed_prepare(ctx"), migrate.index("migration_report(ctx"))
        self.assertLess(migrate.index("resource_go(ctx"), migrate.index("migration_report(ctx"))
        self.assertIn("CUDA_VISIBLE_DEVICES", migrate)
        self.assertIn("PYTHONDONTWRITEBYTECODE", migrate)
        self.assertNotIn("wait_for", ast.unparse(tree))
        self.assertNotIn("6210000", ast.unparse(tree))

    def test_original_helpers_are_byte_suppressed_and_only_selected_ast_runs(self) -> None:
        source = self.root / "sealed.py"
        source.write_text(
            "def good():\n    return 7\nraise RuntimeError('producer main must not execute')\n"
        )
        h = operator.extract(source, operator.digest(source), {"good"}, {})
        self.assertEqual(h["good"](), 7)
        source.write_text("import sys\nassert sys.dont_write_bytecode\nvalue=7\n")
        with patch.object(operator.sys, "dont_write_bytecode", False):
            self.assertEqual(operator.load(source, operator.digest(source)).value, 7)
        self.assertFalse((self.root / "__pycache__").exists())

    def test_original_archive_guard_rejects_traversal_duplicate_and_wrong_member_bytes(
        self,
    ) -> None:
        if not V50_REFERENCE.is_file():
            self.skipTest("Preserved source helper unavailable")
        module = operator.load(V50_REFERENCE, operator.V50_SHA)
        archive = self.root / "fixture.tar.gz"
        payload = b"Explicit synthetic source; never extract"
        source = self.root / "payload"
        source.write_bytes(payload)
        manifest = {"files": {"safe.txt": operator.digest(source)}, "symlinks": {}}
        for names in (["safe.txt"], ["../unsafe"], ["safe.txt", "safe.txt"], ["wrong.txt"]):
            with tarfile.open(archive, "w:gz") as bundle:
                for name in names:
                    item = tarfile.TarInfo(name)
                    item.size = len(payload)
                    bundle.addfile(item, io.BytesIO(payload))
            if names == ["safe.txt"]:
                module.verify_archive(archive, manifest)
                with self.assertRaises(ValueError):
                    module.verify_archive(
                        archive, {"files": {"safe.txt": "f" * 64}, "symlinks": {}}
                    )
            else:
                with self.assertRaises(ValueError):
                    module.verify_archive(archive, manifest)

    def test_direct_custody_context_and_exact_original_commands_with_explicit_stand_ins(
        self,
    ) -> None:
        if not V50_REFERENCE.is_file():
            self.skipTest("Preserved source helper unavailable")
        module = operator.load(V50_REFERENCE, operator.V50_SHA)
        module.closed = Mock(side_effect=AssertionError("Obsolete V50 closure forbidden"))
        transfer = self.root / "transfers"
        transfer.mkdir()
        baseline = transfer / "baseline.json"
        old = {
            "sourceCommit": "7d34b4c1267e0bc266736e61b43cb28debf598ee",
            "symlinks": {},
            "files": {name: "1" * 64 for name in operator.MODULES},
        }
        old["files"]["tools/bot-training/test_baseline.py"] = operator.hashlib.sha256(
            b"EXPLICIT SYNTHETIC SOURCE, NEVER EXTRACT OR EXECUTE"
        ).hexdigest()
        baseline.write_text(json.dumps(old))
        archive = transfer / "material-teacher-fixture.tar.gz"
        files = {}
        with tarfile.open(archive, "w:gz") as bundle:
            for name in set(old["files"]) | operator.TESTS:
                payload = b"EXPLICIT SYNTHETIC SOURCE, NEVER EXTRACT OR EXECUTE"
                item = tarfile.TarInfo(name)
                item.size = len(payload)
                bundle.addfile(item, io.BytesIO(payload))
                files[name] = operator.hashlib.sha256(payload).hexdigest()
        manifest = transfer / "material-teacher-manifest.json"
        manifest.write_text(
            json.dumps(
                {
                    "sourceCommit": "c" * 40,
                    "archiveSha256": operator.digest(archive),
                    "archiveBytes": archive.stat().st_size,
                    "files": files,
                    "symlinks": {},
                }
            )
        )
        custody = self.root / "custody"
        custody.mkdir()
        (custody / "material-custody-report.json").write_text(
            "Explicit synthetic custody; no real models"
        )
        launch = Path(str(custody) + "-launch")
        launch.mkdir()
        (launch / "exit-code.txt").write_text("0")
        (launch / "launch.sh").write_text("Explicit synthetic wrapper; never execute")
        identity = transfer / "identity.json"
        identity.write_text(
            json.dumps(
                {
                    "wholeWrapperPid": 987654321,
                    "startTicks": "123",
                    "run": custody.name,
                    "operatorSha256": "a" * 64,
                    "wrapperSha256": operator.digest(launch / "launch.sh"),
                }
            )
        )
        sources = {}
        for label in operator.LABELS:
            source = self.root / (label + ".pt")
            source.write_bytes(b"EXPLICIT SYNTHETIC CHECKPOINT; NEVER LOAD")
            sources[label] = (source, operator.digest(source))
        bindings = {
            "completionSha256": "d" * 64,
            "trained": True,
            "metadata": {"engineSha256": "e" * 64},
            "curriculum": {},
            "checkpointPaths": {label: str(pair[0]) for label, pair in sources.items()},
            "checkpointHashes": {label: pair[1] for label, pair in sources.items()},
        }
        consumer = SimpleNamespace(
            CUSTODY=custody,
            IDENTITY_SHA=operator.CUSTODY_ID,
            IDENTITY=identity,
            CUSTODY_SHA="a" * 64,
            custody_module=Mock(),
            completed_custody=Mock(return_value=bindings),
        )
        self.value = {
            "formatVersion": 1,
            "source": {
                "commit": "c" * 40,
                "archive": {
                    "path": str(archive),
                    "sha256": operator.digest(archive),
                    "bytes": archive.stat().st_size,
                },
                "manifest": {"path": str(manifest), "sha256": operator.digest(manifest)},
            },
            "custody": {
                "consumerSha256": operator.V45_SHA,
                "identitySha256": operator.CUSTODY_ID,
                "completionSha256": "d" * 64,
                "reportSha256": operator.digest(custody / "material-custody-report.json"),
            },
            "paths": {
                key: str(
                    self.root
                    / (
                        "checkouts"
                        if key == "checkout"
                        else "transfers"
                        if key.endswith("Identity")
                        else "runs"
                    )
                    / ("material-teacher-" + key)
                )
                for key in (
                    "checkout",
                    "prepare",
                    "migrate",
                    "prepareIdentity",
                    "migrationIdentity",
                )
            },
            "review": {
                "changed": {
                    name: value
                    for name, value in files.items()
                    if name in old["files"] and value != old["files"][name]
                },
                "added": {name: files[name] for name in operator.TESTS},
                "teacherPins": {name: files[name] for name in operator.MODULES | operator.TESTS},
            },
        }
        v49 = V50_REFERENCE.with_name("aegis-v49-latest-engine-migration.py")

        def fixture_loader(path, expected):
            if path == operator.V50_PATH:
                return module
            if path == operator.V45_PATH:
                return consumer
            return SimpleNamespace(SOURCES=sources)

        with (
            patch.multiple(
                operator,
                LAB=self.root,
                CUSTODY_RUN=custody,
                BASE_MANIFEST=baseline,
                BASE_MANIFEST_SHA=operator.digest(baseline),
                V50_PATH=V50_REFERENCE,
                V34_PATH=Path("/tmp/aegis-v34-prepare.py"),
                V48_PATH=Path("/tmp/aegis-v48-main-fixes-runtime-preparation.py"),
                V49_PATH=v49,
            ),
            patch.object(operator, "load", side_effect=fixture_loader),
        ):
            ctx = self.context()
            self.assertEqual(set(ctx["prior"]["checkpointBindings"]), operator.LABELS)
            module.closed.assert_not_called()
            h = operator.helpers(ctx)
            commands = h["commands"]()
            self.assertEqual(commands["python-tests"][-1], "test_baseline")
            self.assertNotIn("discover", commands["python-tests"])
            self.assertIn("src/cards/audit-docs.test.ts", commands["engine-tests"])
            self.assertIn("src/cards/P/P-075.test.ts", commands["engine-tests"])
            self.assertIn("--maxWorkers=1", commands["engine-tests"])
            self.assertIn("--no-file-parallelism", commands["teacher-tests"])
            self.assertIn("--reporter=verbose", commands["teacher-tests"])
            self.assertIn("--test-reporter=tap", commands["delivery-tests"])
            run = ctx["paths"]["prepare"]
            run.mkdir(parents=True)
            for phase, args in commands.items():
                log = run / (phase + ".log")
                contents = "Explicit synthetic phase log; no execution\n"
                if phase == "node-version":
                    contents = "v26.10.0\n"
                if phase == "python-version":
                    contents = "Python 3.12.14\n"
                if phase == "python-tests":
                    contents = "Ran 73 tests in 1.0s\n\nOK\n"
                if phase == "delivery-tests":
                    contents = (
                        "\n".join(
                            f"# {name} {count}"
                            for name, count in (
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
                log.write_text(contents)
                start = h["phase_start"](phase, args)
                (run / (phase + "-started.json")).write_text(json.dumps(start))
                (run / (phase + "-receipt.json")).write_text(
                    json.dumps(
                        {
                            **start,
                            "completed": True,
                            "exitCode": 0,
                            "logSha256": operator.digest(log),
                        }
                    )
                )
            self.assertEqual(len(h["verify_phases"]()), len(commands))
            for phase, contents in (
                ("python-tests", "Ran 61 tests in 1.0s\n\nOK\n"),
                ("delivery-tests", "# tests 18\n# pass 17\n# skipped 1\n"),
            ):
                log = run / (phase + ".log")
                before = log.read_text()
                receipt = run / (phase + "-receipt.json")
                original = receipt.read_text()
                log.write_text(contents)
                receipt.write_text(
                    json.dumps(
                        {
                            **h["phase_start"](phase, commands[phase]),
                            "completed": True,
                            "exitCode": 0,
                            "logSha256": operator.digest(log),
                        }
                    )
                )
                with self.assertRaises(ValueError):
                    h["verify_phases"]()
                log.write_text(before)
                receipt.write_text(original)
            self.assertEqual(
                commands["install"],
                ["pnpm", "install", "--frozen-lockfile", "--offline", "--ignore-scripts"],
            )
            module.require_idle = Mock()
            bindings["trained"] = False
            with self.assertRaises(ValueError):
                self.context()
        self.assertNotIn("torch", operator.sys.modules)
        self.assertFalse(Path(self.value["paths"]["checkout"]).exists())


if __name__ == "__main__":
    unittest.main()
