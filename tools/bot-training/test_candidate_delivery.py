"""Explicit stand-in closure fixtures; no real checkpoint copy or scorer load."""

import copy
import json
import shutil
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

import candidate_delivery as adapter

ACTUAL_HOST_CHECK = adapter.host_check
ACTUAL_LOAD_READER = adapter.load_reader


class CandidateDeliveryTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.lab = Path(temporary.name)
        self.v49, self.v50, self.checkout = [self.lab / name for name in ("v49", "v50", "checkout")]
        for path in (
            self.v49,
            self.v50,
            self.checkout / "tools/bot-training",
            self.lab / "transfers",
        ):
            path.mkdir(parents=True)
        self.origin = self.lab / "origin-receipt.json"
        self.origin_value = {
            "checkpointSha256": adapter.ORIGIN_SHA,
            "actualLearningUpdates": 7072,
            "optimizerStepDeltas": {str(i): 7072 for i in range(12)},
        }
        self.origin.write_text(json.dumps(self.origin_value))
        self.cp = {}
        for label in adapter.LABELS:
            path = self.v49 / f"{label}.pt"
            path.write_bytes(b"EXPLICIT SYNTHETIC CHECKPOINT; NEVER LOAD")
            self.cp[label] = {"path": str(path), "sha256": adapter.digest(path)}
        self.windows = [{"kind": "query", "window": {"actions": [{}]}} for _ in range(28)]
        self.queries = self.v49 / "queries.jsonl"
        self.queries.write_text("\n".join(json.dumps(row) for row in self.windows))
        self.model_record = {
            **self.cp["challenger"],
            "checkpointSha256": self.cp["challenger"]["sha256"],
            "sourceCheckpointSha256": adapter.ORIGIN_SHA,
            "modelAndAdamByteExact": True,
            "actualLearningUpdates": 0,
            "identicalInputGreedyChoices": [0] * 28,
        }
        (self.v49 / "report.json").write_text(
            json.dumps({"checkpoints": {"challenger": self.model_record}})
        )
        decks = [{"version": f"fixture-{i}", "sha256": "d" * 64} for i in range(44)]
        card_ids = (
            [f"BT26-{i:03d}" for i in range(1, 105)]
            + [f"EX13-{i:03d}" for i in range(1, 78)]
            + [f"EXPLICIT-FIXTURE-{i}" for i in range(298)]
        )
        self.metadata = {
            "schemaVersion": 4,
            "engineSha256": "e" * 64,
            "cardIds": card_ids,
            "decks": decks[:26],
        }
        (self.v50 / "metadata.json").write_text(json.dumps(self.metadata))
        (self.v50 / "curriculum.json").write_text(
            json.dumps({"engineSha256": "e" * 64, "decks": decks})
        )
        self.delivery = self.checkout / "tools/bot-training/delivery.mjs"
        self.delivery.write_text("// Explicit fixture, never execute\n")
        (self.v50 / "report.json").write_text(
            json.dumps(
                {
                    "metadataSha256": adapter.digest(self.v50 / "metadata.json"),
                    "curriculumSha256": adapter.digest(self.v50 / "curriculum.json"),
                }
            )
        )
        self.current = {
            "identitySha256": "1" * 64,
            "completionSha256": "2" * 64,
            "reportSha256": adapter.digest(self.v50 / "report.json"),
            "sourceCommit": adapter.SOURCE,
            "engineSha256": "e" * 64,
            "checkpointBindings": self.cp,
            "cpuRuntimeQualified": True,
            "actualPrimaryModelOrCudaParityQualified": False,
            "strengthPhysicalRoomCustodyAcceptance": False,
            "finalBlindAccepted": False,
            "noPromotionClaim": True,
        }
        self.prior = {
            "identitySha256": adapter.V49_ID,
            "completionSha256": "4" * 64,
            "reportSha256": adapter.digest(self.v49 / "report.json"),
            "engineSha256": "e" * 64,
            "checkpointHashes": {label: record["sha256"] for label, record in self.cp.items()},
        }
        self.v50_module = SimpleNamespace(
            RUN=self.v50,
            CHECKOUT=self.checkout,
            COMMIT=adapter.SOURCE,
            ARCHIVE_SHA=adapter.ARCHIVE_SHA,
            closed=Mock(side_effect=lambda _: self.current),
            require_idle=Mock(),
        )
        self.v49_module = SimpleNamespace(closed_migration=Mock(side_effect=lambda _: self.prior))
        self.request_path = self.lab / "request.json"
        self.trace = self.lab / "trace.mjs"
        self.trace.write_text("// Explicit instrumentation fixture; never run\n")
        self.output = self.lab / "deliveries/bot-final-delivery-v50/candidate-1"
        self.output.parent.mkdir(parents=True)
        self.request = {
            "formatVersion": 1,
            "requestPath": str(self.request_path),
            "node": "node",
            "output": str(self.output),
            "trace": {"path": str(self.trace), "sha256": adapter.digest(self.trace)},
            "v49": {
                "operator": {
                    "path": str(self.lab / "transfers/aegis-v49-latest-engine-migration.py"),
                    "sha256": adapter.V49_SHA,
                },
                **{
                    key: self.prior[key]
                    for key in ("identitySha256", "completionSha256", "reportSha256")
                },
            },
            "v50": {
                "operator": {
                    "path": str(
                        self.lab / "transfers/aegis-v50-integrated-runtime-qualification.py"
                    ),
                    "sha256": adapter.V50_SHA,
                },
                **{
                    key: self.current[key]
                    for key in ("identitySha256", "completionSha256", "reportSha256")
                },
            },
            "resourceGo": {
                "package-probe": str(self.lab / "package-go.json"),
                "rooms": str(self.lab / "rooms-go.json"),
            },
        }
        overrides = {
            "LAB": self.lab,
            "V49": self.v49,
            "V50": self.v50,
            "CHECKOUT": self.checkout,
            "V40_RECEIPT": self.origin,
            "V40_RECEIPT_SHA": adapter.digest(self.origin),
            "QUERY_SHA": adapter.digest(self.queries),
            "DELIVERY_SHA": adapter.digest(self.delivery),
        }
        globals_patch = patch.multiple(adapter, **overrides)
        globals_patch.start()
        self.addCleanup(globals_patch.stop)
        for name, replacement in (
            ("host_check", Mock(return_value={"node": "never-run", "python": "never-run"})),
            (
                "load_reader",
                Mock(
                    side_effect=lambda _, expected: (
                        self.v50_module if "v50" in expected.name else self.v49_module
                    )
                ),
            ),
        ):
            helper = patch.object(adapter, name, replacement)
            helper.start()
            self.addCleanup(helper.stop)

    def pins(self) -> dict:
        self.request_path.write_text(json.dumps(self.request))
        return adapter.preflight(self.request_path, adapter.digest(self.request_path))

    def test_valid_fake_closures_select_only_challenger_without_any_copy(self) -> None:
        result = self.pins()
        self.assertEqual(result["primary"], self.cp["challenger"])
        self.assertEqual(result["windows"], [row["window"] for row in self.windows])
        self.v50_module.require_idle.assert_called_once()
        self.assertFalse(self.output.exists())

    def test_sealed_reader_import_suppresses_bytecode_and_child_environment(self) -> None:
        reader = self.lab / "sealed-reader.py"
        reader.write_text("import sys\nassert sys.dont_write_bytecode\nvalue = 1\n")

        def real_fixture_import(item, expected):
            module = ACTUAL_LOAD_READER(
                {"path": str(reader), "sha256": adapter.digest(reader)}, reader
            )
            self.assertEqual(module.value, 1)
            return self.v50_module if "v50" in expected.name else self.v49_module

        with (
            patch.object(adapter, "load_reader", side_effect=real_fixture_import),
            patch.object(adapter.sys, "dont_write_bytecode", False),
        ):
            self.pins()
            self.assertTrue(adapter.sys.dont_write_bytecode)
        self.assertFalse((self.lab / "__pycache__").exists())
        with patch.dict(adapter.os.environ, {"PYTHONDONTWRITEBYTECODE": "0"}):
            self.assertEqual(adapter.child_environment()["PYTHONDONTWRITEBYTECODE"], "1")
            self.assertEqual(adapter.os.environ["PYTHONDONTWRITEBYTECODE"], "0")

    def test_execution_bytes_rejects_changed_trace_and_adapter_before_command(self) -> None:
        pins = self.pins()
        self.assertEqual(adapter.execution_bytes(pins), self.trace)
        self.trace.write_text("// Replaced instrumentation\n")
        with patch.object(adapter, "run_command") as command, self.assertRaises(ValueError):
            adapter.execution_bytes(pins)
        command.assert_not_called()
        self.trace.write_text("// Explicit instrumentation fixture; never run\n")
        pins["adapterSha256"] = "f" * 64
        with self.assertRaises(ValueError):
            adapter.execution_bytes(pins)
        self.assertFalse(self.output.exists())

    def test_post_phase_trace_change_cannot_complete_and_all_children_suppress_bytecode(
        self,
    ) -> None:
        pins = self.pins()
        for path in (self.v49, self.v50):
            (path / "completion.json").write_text("Explicit stand-in closure")
        approval = self.lab / "package-go.json"
        approval.write_text(
            json.dumps(
                {
                    "phase": "package-probe",
                    "adapterSha256": pins["adapterSha256"],
                    "requestSha256": pins["requestSha256"],
                    "v50CompletionSha256": pins["v50"]["completionSha256"],
                    "v49CompletionSha256": pins["v49"]["completionSha256"],
                    "checkpointSha256": pins["primary"]["sha256"],
                    "approved": True,
                }
            )
        )
        environments = []

        def stand_in_command(args, log, *, cwd, environment):
            environments.append(environment)
            log.write_text("Explicit synthetic subprocess; no model or checkpoint copied\n")
            package = self.output / "package"
            if args[2] == "pack":
                package.mkdir()
                (package / "scorer.mjs").write_text(self.delivery.read_text())
                (package / "manifest.json").write_text(
                    json.dumps(
                        {"checkpointSha256": pins["primary"]["sha256"], "metadata": self.metadata}
                    )
                )
                return json.dumps(
                    {
                        "package": str(package),
                        "status": "candidate",
                        "manifestSha256": adapter.digest(package / "manifest.json"),
                    }
                )
            if args[2] == "validate":
                return ""
            run = self.output / "package-probe"
            (run / "probe").mkdir()
            (run / "probe/queries.json").write_text(json.dumps({"choices": [0] * 28}))
            (run / "transport-proof.json").write_text(
                json.dumps(
                    {
                        "phase": "package-probe",
                        "acceptance": False,
                        "exitCode": 0,
                        "checkpointSha256": pins["primary"]["sha256"],
                        "ready": [{"checkpointSha256": pins["primary"]["sha256"], "readyMs": 10}],
                        "queries": [{"action": 0, "candidates": 1, "latencyMs": 1, "error": False}]
                        * 28,
                        "policyTimeoutMs": 1000,
                        "transportTimeoutMs": 2000,
                    }
                )
            )
            self.trace.write_text("// Changed during stand-in phase\n")
            return ""

        with (
            patch.object(adapter, "run_command", side_effect=stand_in_command),
            self.assertRaisesRegex(ValueError, "mismatched file pin"),
        ):
            adapter.execute_phase(pins, "package-probe", adapter.digest(approval))
        self.assertEqual(len(environments), 3)
        self.assertTrue(
            all(environment["PYTHONDONTWRITEBYTECODE"] == "1" for environment in environments)
        )
        self.assertFalse((self.output / "package-probe/completion.json").exists())

    def test_null_future_pins_reject_before_reader_and_copy(self) -> None:
        for label in ("v49", "v50"):
            for key in ("identitySha256", "completionSha256", "reportSha256"):
                original = self.request[label][key]
                self.request[label][key] = None
                with self.subTest(label=label, key=key), self.assertRaises(ValueError):
                    self.pins()
                self.request[label][key] = original
        adapter.load_reader.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_mismatched_paths_hashes_engine_and_acceptance_reject_before_phase(self) -> None:
        mutations = [
            lambda: self.cp["challenger"].update(path=None),
            lambda: self.cp["challenger"].update(path=str(self.v49 / "fitted-reference.pt")),
            lambda: self.cp["challenger"].update(sha256="f" * 64),
            lambda: self.current.update(engineSha256="f" * 64),
            lambda: self.current.update(sourceCommit="f" * 40),
            lambda: self.current.update(strengthPhysicalRoomCustodyAcceptance=True),
            lambda: self.current.update(completionSha256="f" * 64),
        ]
        initial = copy.deepcopy(self.current)
        for mutate in mutations:
            self.current.clear()
            self.current.update(copy.deepcopy(initial))
            self.cp = self.current["checkpointBindings"]
            mutate()
            with (
                self.subTest(mutation=mutate),
                patch.object(adapter, "run_command") as command,
                self.assertRaises(ValueError),
            ):
                self.pins()
            command.assert_not_called()
            self.assertFalse(self.output.exists())

    def test_unclosed_reader_failure_does_not_start_copy_or_model(self) -> None:
        self.v50_module.closed.side_effect = ValueError("whole still live")
        with (
            patch.object(adapter, "run_command") as command,
            self.assertRaisesRegex(ValueError, "whole still live"),
        ):
            self.pins()
        command.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_missing_or_wrong_root_go_rejects_before_copy(self) -> None:
        pins = self.pins()
        with patch.object(adapter, "run_command") as command:
            with self.assertRaisesRegex(ValueError, "resourceGo"):
                adapter.execute_phase(pins, "package-probe", None)
            path = self.lab / "package-go.json"
            path.write_text(json.dumps({"approved": True}))
            with self.assertRaisesRegex(ValueError, "does not bind"):
                adapter.execute_phase(pins, "package-probe", adapter.digest(path))
            command.assert_not_called()
        self.assertFalse(self.output.exists())

    def test_root_go_is_bound_to_exact_phase_request_adapter_and_model(self) -> None:
        pins = self.pins()
        value = {
            "phase": "package-probe",
            "adapterSha256": adapter.digest(Path(adapter.__file__)),
            "requestSha256": pins["requestSha256"],
            "v50CompletionSha256": pins["v50"]["completionSha256"],
            "v49CompletionSha256": pins["v49"]["completionSha256"],
            "checkpointSha256": pins["primary"]["sha256"],
            "approved": True,
        }
        path = self.lab / "package-go.json"
        path.write_text(json.dumps(value))
        adapter.resource_go(pins, "package-probe", adapter.digest(path))
        for changes in (
            {"phase": "rooms"},
            {"adapterSha256": "f" * 64},
            {"requestSha256": "f" * 64},
            {"checkpointSha256": "f" * 64},
            {"approved": False},
        ):
            path.write_text(json.dumps({**value, **changes}))
            with self.assertRaises(ValueError):
                adapter.resource_go(pins, "package-probe", adapter.digest(path))
        self.assertFalse(self.output.exists())

    def test_actual_adam_steps_and_migration_origin_cannot_be_relabelled(self) -> None:
        self.origin_value["optimizerStepDeltas"]["0"] = 7071
        self.origin.write_text(json.dumps(self.origin_value))
        with (
            patch.object(adapter, "V40_RECEIPT_SHA", adapter.digest(self.origin)),
            self.assertRaisesRegex(ValueError, "Adam provenance"),
        ):
            self.pins()

        self.origin.write_text(
            json.dumps(
                {**self.origin_value, "optimizerStepDeltas": {str(i): 7072 for i in range(12)}}
            )
        )
        self.model_record["sourceCheckpointSha256"] = "f" * 64
        (self.v49 / "report.json").write_text(
            json.dumps({"checkpoints": {"challenger": self.model_record}})
        )
        self.prior["reportSha256"] = adapter.digest(self.v49 / "report.json")
        self.request["v49"]["reportSha256"] = self.prior["reportSha256"]
        with (
            patch.object(adapter, "V40_RECEIPT_SHA", adapter.digest(self.origin)),
            self.assertRaisesRegex(ValueError, "actual e55"),
        ):
            self.pins()

    def test_rooms_go_pins_the_package_and_successful_probe_across_phases(self) -> None:
        pins = self.pins()
        package = self.output / "package"
        package.mkdir(parents=True)
        manifest = package / "manifest.json"
        manifest.write_text("Explicit synthetic manifest; never launch")
        proof = self.output / "package-probe/completion.json"
        proof.parent.mkdir()
        proof.write_text(
            json.dumps(
                {
                    "completed": True,
                    "acceptance": False,
                    "checkpointSha256": pins["primary"]["sha256"],
                    "manifestSha256": adapter.digest(manifest),
                }
            )
        )
        value = {
            "phase": "rooms",
            "adapterSha256": adapter.digest(Path(adapter.__file__)),
            "requestSha256": pins["requestSha256"],
            "v50CompletionSha256": pins["v50"]["completionSha256"],
            "v49CompletionSha256": pins["v49"]["completionSha256"],
            "checkpointSha256": pins["primary"]["sha256"],
            "approved": True,
            "packageManifestSha256": adapter.digest(manifest),
            "packageProbeCompletionSha256": adapter.digest(proof),
        }
        approval = self.lab / "rooms-go.json"
        approval.write_text(json.dumps(value))
        adapter.resource_go(pins, "rooms", adapter.digest(approval))
        manifest.write_text("Replaced candidate scorer manifest")
        with patch.object(adapter, "run_command") as command, self.assertRaises(ValueError):
            adapter.execute_phase(pins, "rooms", adapter.digest(approval))
        command.assert_not_called()

    def test_null_and_symlink_path_and_modified_reader_are_rejected(self) -> None:
        with self.assertRaises(ValueError):
            adapter.checked_path(None)
        link = self.lab / "link"
        link.symlink_to(self.origin)
        with self.assertRaises(ValueError):
            adapter.checked_path(str(link))
        with self.assertRaises(ValueError):
            adapter.pinned(self.origin, "f" * 64)

    def test_trace_is_actual_ready_and_queries_only_never_strength(self) -> None:
        pins = self.pins()
        path = self.lab / "trace.json"
        proof = {
            "phase": "package-probe",
            "acceptance": False,
            "exitCode": 0,
            "checkpointSha256": pins["primary"]["sha256"],
            "ready": [{"checkpointSha256": pins["primary"]["sha256"], "readyMs": 12}],
            "queries": [{"action": 0, "candidates": 1, "latencyMs": 2, "error": False}],
            "policyTimeoutMs": 1000,
            "transportTimeoutMs": 2000,
        }
        path.write_text(json.dumps(proof))
        adapter.trace_check(path, pins, "package-probe")
        for changes in (
            {"acceptance": True},
            {"policyTimeoutMs": 2000},
            {"checkpointSha256": "f" * 64},
            {"queries": [{"action": 2, "candidates": 1, "latencyMs": 2, "error": False}]},
        ):
            path.write_text(json.dumps({**proof, **changes}))
            with self.assertRaises(ValueError):
                adapter.trace_check(path, pins, "package-probe")

    def test_original_room_guard_rejects_fallback_rejection_timeout_and_short_scope(self) -> None:
        pins = self.pins()
        original_sources = [
            Path("/tmp/aegis-v43-corrective-room-verification.py"),
            Path("/tmp/aegis-v37-fixed-room-verification.py"),
            Path("/tmp/aegis-v25-room-verification.py"),
            Path("/tmp/aegis-v19b-room-verification-queue.py"),
        ]
        if not all(path.is_file() for path in original_sources):
            self.skipTest("Requires preserved external V43/V37/V25/V19b source references")
        copied = {}
        for source, expected_sha in zip(
            original_sources, adapter.ROOM_HELPERS.values(), strict=True
        ):
            self.assertEqual(adapter.digest(source), expected_sha)
            target = self.lab / source.name
            shutil.copyfile(source, target)
            copied[target] = adapter.digest(target)
        run = self.lab / "rooms"
        (run / "verification").mkdir(parents=True)
        cp = Path(pins["primary"]["path"])
        config = {
            "games": 26,
            "seed": 6170000,
            "checkpoint": str(cp),
            "checkpointSha256": pins["primary"]["sha256"],
            "metadata": self.metadata,
            "botSeat": 1,
            "policyTimeoutMs": 1000,
            "botPacing": "normal",
            "matchTimeoutMs": 600000,
        }
        (run / "verification/config.json").write_text(json.dumps(config))
        rows = [
            {
                "index": i,
                "seed": 6170000 + i,
                "botVersion": f"fixture-{i}",
                "humanVersion": f"fixture-{(i + 1) % 26}",
                "botName": "BT26 AI",
                "gameOver": {"kind": "gameOver", "result": {"outcome": "win"}},
                "fallback": {"timeout": 0, "error": 0},
                "rejections": [],
                "intentRejections": [],
                "modelQueries": 1,
                "successfulQueries": 1,
                "latenciesMs": [2],
                "selectedActions": {"endPhase": 1},
            }
            for i in range(26)
        ]
        result = run / "verification/results.json"
        result.write_text(json.dumps(rows))
        with patch.object(adapter, "ROOM_HELPERS", copied):
            self.assertEqual(adapter.room_guard(run, cp, pins)["modelQueries"], 26)
            for changes in (
                {"fallback": {"timeout": 1, "error": 0}},
                {"rejections": [{"kind": "actionRejected"}]},
                {"intentRejections": [{"result": {"ok": False}}]},
                {"latenciesMs": [1000]},
                {"botVersion": "wrong-list"},
            ):
                bad = copy.deepcopy(rows)
                bad[0].update(changes)
                result.write_text(json.dumps(bad))
                with self.subTest(changes=changes), self.assertRaises(AssertionError):
                    adapter.room_guard(run, cp, pins)
            result.write_text(json.dumps(rows[:25]))
            with self.assertRaises(AssertionError):
                adapter.room_guard(run, cp, pins)

    def test_host_identity_is_exact_and_does_not_import_torch(self) -> None:
        versions = {"torch": "2.7.1+cu128", "numpy": "2.2.6", "click": "8.1.8"}
        with (
            patch.object(adapter.platform, "python_version", return_value="3.12.14"),
            patch.object(adapter.sys, "executable", str(self.lab / "venv/bin/python")),
            patch.object(adapter.shutil, "which", return_value="/fixture/node"),
            patch.object(
                adapter.subprocess, "run", return_value=SimpleNamespace(stdout="v26.10.0\n")
            ),
            patch.object(
                adapter.importlib.metadata, "version", side_effect=lambda name: versions[name]
            ),
        ):
            self.assertEqual(ACTUAL_HOST_CHECK("node")["packages"], versions)
            versions["torch"] = "2.7.1"
            with self.assertRaisesRegex(ValueError, "identities differ"):
                ACTUAL_HOST_CHECK("node")


if __name__ == "__main__":
    unittest.main()
