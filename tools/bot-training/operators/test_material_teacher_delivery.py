"""Synthetic hostile admission checks only: no model copies, Torch, or jobs."""

import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

OPERATOR = Path(__file__).with_name("material-teacher-delivery.py")
spec = importlib.util.spec_from_file_location("material_teacher_delivery", OPERATOR)
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)
HASH = "a" * 64  # Synthetic hashes are never actual qualification or checkpoints.


def same(left, right):
    return json.dumps(left, sort_keys=True) == json.dumps(right, sort_keys=True)


class DeliveryGuards(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        lab = patch.object(operator, "LAB", self.root)
        lab.start()
        self.addCleanup(lab.stop)
        self.path = self.root / "synthetic-request.json"
        self.request = {
            "formatVersion": 1,
            "candidateMode": "trained-ppo",
            "runtime": {
                "operator": str(operator.LAB / "transfers/material-teacher-runtime-reviewed.py"),
                "request": str(operator.LAB / "transfers/material-teacher-runtime-request.json"),
                **{
                    key: HASH
                    for key in (
                        "operatorSha256",
                        "requestSha256",
                        "prepareIdentitySha256",
                        "prepareCompletionSha256",
                        "prepareReportSha256",
                        "migrationIdentitySha256",
                        "migrationCompletionSha256",
                        "migrationReportSha256",
                        "engineSha256",
                    )
                },
            },
            "learning": {
                "operator": str(operator.LAB / "transfers/material-teacher-learning.py"),
                "request": str(operator.LAB / "transfers/material-teacher-learning-request.json"),
                "checkpointPath": str(
                    operator.LAB / "runs/material-teacher-learning-test/ppo/checkpoint.pt"
                ),
                **{
                    key: HASH
                    for key in (
                        "operatorSha256",
                        "requestSha256",
                        "identitySha256",
                        "completionSha256",
                        "reportSha256",
                        "checkpointSha256",
                    )
                },
            },
            "helpers": {
                "path": str(operator.LAB / "transfers/candidate_delivery.py"),
                "sha256": operator.HELPER_SHA,
            },
            "windowHelper": {
                "path": str(operator.LAB / "transfers/aegis-v50-cuda-choice-parity.py"),
                "sha256": operator.WINDOW_SHA,
            },
            "trace": {
                "path": str(operator.LAB / "transfers/candidate-transport-trace.mjs"),
                "sha256": operator.TRACE_SHA,
            },
            "extraWindowFiles": copy.deepcopy(operator.EXTRA),
            "output": str(operator.LAB / "deliveries/material-teacher-delivery-synthetic"),
            "version": "bt26-ex13-teacher-ppo-candidate",
            "node": "node",
            "phaseBindings": {
                phase: {
                    "run": str(operator.LAB / f"runs/material-teacher-delivery-synthetic-{phase}"),
                    "identity": str(operator.LAB / f"transfers/delivery-{phase}-identity.json"),
                    "resourceGo": str(operator.LAB / f"transfers/delivery-{phase}-go.json"),
                }
                for phase in ("package-probe", "rooms")
            },
        }
        self.prepared = {
            "identitySha256": HASH,
            "completionSha256": HASH,
            "reportSha256": HASH,
            "sourceCommit": operator.SOURCE,
            "engineSha256": HASH,
            "cpuRuntimeQualified": True,
        }
        self.migrated = {
            **self.prepared,
            "actualLearningUpdates": 0,
            "acceptedStrengthOrMastery": False,
            "checkpointBindings": {
                "challenger": {"path": self.request["learning"]["checkpointPath"], "sha256": HASH}
            },
        }
        self.runtime_ctx = {
            "request": {
                "source": {
                    "commit": operator.SOURCE,
                    "archive": {"sha256": operator.ARCHIVE, "bytes": 43769742},
                    "manifest": {"sha256": operator.MANIFEST},
                }
            }
        }
        self.runtime = SimpleNamespace(
            context=Mock(return_value=self.runtime_ctx),
            closed_prepare=Mock(return_value=self.prepared),
            closed_migration=Mock(return_value=self.migrated),
        )
        self.learned = {
            **self.prepared,
            "preparedBindings": self.prepared,
            "migrationBindings": self.migrated,
            "acceptedStrengthOrMastery": False,
            "finiteChangedActualLearningVerified": True,
            "actualLearningUpdates": 10,
            "selectedLearningUpdates": 10,
            "checkpointPath": self.request["learning"]["checkpointPath"],
            "checkpointSha256": HASH,
        }
        self.learning = SimpleNamespace(
            context=Mock(
                return_value={
                    "runtimeContext": self.runtime_ctx,
                    "prepared": self.prepared,
                    "migrated": self.migrated,
                }
            ),
            closed_phase=Mock(return_value=self.learned),
        )

    def context(self):
        self.path.write_text(json.dumps(self.request))
        return operator.context(self.path, operator.digest(self.path), operator.digest(OPERATOR))

    def test_null_future_pins_reject_before_reader_copy_or_model(self):
        for section in ("runtime", "learning"):
            for key in self.request[section]:
                if not key.endswith("Sha256"):
                    continue
                original = self.request[section][key]
                self.request[section][key] = None
                with patch.object(operator, "load") as loader, self.assertRaises(ValueError):
                    self.context()
                loader.assert_not_called()
                self.request[section][key] = original
        self.assertNotIn("torch", sys.modules)

    def test_invalid_null_relative_traversal_and_wrong_paths_fail_before_readers(self):
        for key in ("operator", "request", "checkpointPath"):
            original = self.request["learning"][key]
            for bad in (
                None,
                "relative",
                "/tmp/fake.pt",
                str(operator.LAB / "runs/../transfers/evil"),
            ):
                self.request["learning"][key] = bad
                with patch.object(operator, "load") as loader, self.assertRaises(ValueError):
                    self.context()
                loader.assert_not_called()
            self.request["learning"][key] = original

    def test_real_nested_checkpoint_shape_admits_but_escape_or_symlink_rejects(self):
        operator.request_fields(self.request)
        original = self.request["learning"]["checkpointPath"]
        for wrong in (
            str(operator.LAB / "runs/checkpoint.pt"),
            str(operator.LAB / "runs/material-teacher-learning-test/imitation/checkpoint.pt"),
            str(operator.LAB / "runs/other/ppo/checkpoint.pt"),
        ):
            self.request["learning"]["checkpointPath"] = wrong
            with self.assertRaises(ValueError):
                operator.request_fields(self.request)
        self.request["learning"]["checkpointPath"] = original
        linked = operator.LAB / "runs/material-teacher-learning-test"
        linked.parent.mkdir()
        target = self.root / "symlink-target"
        target.mkdir()
        linked.symlink_to(target, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Symlink"):
            operator.request_fields(self.request)

    def test_historical_selection_or_sealed_helper_cannot_be_substituted(self):
        for mutate in (
            lambda value: value["extraWindowFiles"][2].update(lineIndices=[16, 17, 30]),
            lambda value: value["helpers"].update(sha256=HASH),
            lambda value: value["trace"].update(sha256=HASH),
            lambda value: value.update(version="accepted"),
        ):
            value = copy.deepcopy(self.request)
            mutate(value)
            with self.assertRaises(ValueError):
                operator.request_fields(value)

    def test_frozen_source_and_runtime_closure_mismatch_stop_before_learning(self):
        for section, key, wrong in (
            (self.runtime_ctx["request"]["source"], "commit", "b" * 40),
            (self.prepared, "completionSha256", "b" * 64),
            (self.migrated, "engineSha256", "b" * 64),
        ):
            original = section[key]
            section[key] = wrong
            with (
                patch.object(operator, "load", return_value=self.runtime) as loader,
                self.assertRaises(ValueError),
            ):
                self.context()
            self.assertEqual(loader.call_count, 1)
            section[key] = original

    def test_open_or_failed_actual_runtime_reader_cannot_reach_model(self):
        self.runtime.closed_prepare.side_effect = ValueError("actual whole still live or exit143")
        with (
            patch.object(operator, "load", return_value=self.runtime) as loader,
            self.assertRaisesRegex(ValueError, "whole"),
        ):
            self.context()
        self.assertEqual(loader.call_count, 1)
        self.runtime.closed_migration.assert_not_called()

    def test_invalid_finite_adam_or_selected_checkpoint_proof_fails_before_helpers(self):
        cases = (
            ("finiteChangedActualLearningVerified", False),
            ("actualLearningUpdates", 0),
            ("actualLearningUpdates", True),
            ("selectedLearningUpdates", 0),
            ("checkpointSha256", "b" * 64),
            ("checkpointPath", "/tmp/substitute.pt"),
            ("acceptedStrengthOrMastery", True),
        )
        for key, value in cases:
            original = self.learned[key]
            self.learned[key] = value
            with (
                patch.object(operator, "load", side_effect=[self.runtime, self.learning]) as loader,
                self.assertRaises(ValueError),
            ):
                self.context()
            self.assertEqual(loader.call_count, 2)
            self.learned[key] = original

    def test_missing_actual_checkpoint_bytes_fail_before_copy_or_scorer(self):
        with (
            patch.object(operator, "load", side_effect=[self.runtime, self.learning]) as loader,
            self.assertRaises(ValueError),
        ):
            self.context()
        self.assertEqual(loader.call_count, 2)

    def test_sha_mismatch_symlink_and_duplicate_nonfinite_json_fail(self):
        self.path.write_text("synthetic bytes, no model")
        with self.assertRaises(ValueError):
            operator.pin(self.path, HASH)
        link = self.root / "link"
        link.symlink_to(self.path)
        with self.assertRaises(ValueError):
            operator.digest(link)
        for value in ('{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}'):
            self.path.write_text(value)
            with self.assertRaises(ValueError):
                operator.read(self.path)

    def go_context(self, mode="trained-ppo"):
        go_path = self.root / "synthetic-go.json"
        ctx = {
            "request": {
                "candidateMode": mode,
                "phaseBindings": {
                    phase: {"resourceGo": str(go_path)} for phase in ("package-probe", "rooms")
                },
            },
            "operatorSha256": HASH,
            "requestSha256": HASH,
            "primary": {"sha256": HASH},
            "prepared": {"completionSha256": HASH},
            "migrated": {"completionSha256": HASH},
            "learned": {"completionSha256": HASH} if mode == "trained-ppo" else None,
            "runtimeContext": {"v50": SimpleNamespace(same=same)},
            "runtime": SimpleNamespace(helpers=Mock()),
        }
        expected = {
            "approved": True,
            "phase": "package-probe",
            "operatorSha256": HASH,
            "requestSha256": HASH,
            "identitySha256": HASH,
            "candidateMode": mode,
            "checkpointSha256": HASH,
            "prepareCompletionSha256": HASH,
            "migrationCompletionSha256": HASH,
            "ppoCompletionSha256": HASH if mode == "trained-ppo" else None,
        }
        return ctx, go_path, expected

    def test_missing_or_mismatched_root_go_fails_before_any_execution(self):
        ctx, path, expected = self.go_context()
        path.write_text(json.dumps(expected))
        for identity, approval in ((None, operator.digest(path)), (HASH, None), (HASH, "b" * 64)):
            with self.assertRaises(ValueError):
                operator.go(ctx, "package-probe", identity, approval, idle=True)
        for key, value in (
            ("approved", 1),
            ("phase", "rooms"),
            ("checkpointSha256", "b" * 64),
            ("ppoCompletionSha256", None),
        ):
            invalid_go = {**expected, key: value}
            path.write_text(json.dumps(invalid_go))
            with self.assertRaises(ValueError):
                operator.go(ctx, "package-probe", HASH, operator.digest(path), idle=True)
        ctx["runtime"].helpers.assert_not_called()

    def test_valid_exact_go_uses_unchanged_foundation_idle_not_retired_v50(self):
        ctx, path, expected = self.go_context()
        idle = Mock()
        ctx["runtime"].helpers.return_value = {"foundation": {"require_idle": idle}}
        path.write_text(json.dumps(expected))
        operator.go(ctx, "package-probe", HASH, operator.digest(path), idle=True)
        idle.assert_called_once_with()

    def test_preserved_candidate_cannot_run_managed_rooms(self):
        ctx, path, expected = self.go_context("preserved-primary")
        path.write_text(json.dumps(expected))
        with (
            patch.object(operator, "closed_phase") as closed,
            self.assertRaisesRegex(ValueError, "trained"),
        ):
            operator.go(ctx, "rooms", HASH, operator.digest(path), idle=False)
        closed.assert_not_called()

    def test_execute_without_go_never_creates_copies_or_starts_scorer(self):
        ctx, _, _ = self.go_context()
        with (
            patch.object(operator, "whole"),
            patch.object(Path, "mkdir") as mkdir,
            self.assertRaises(ValueError),
        ):
            operator.execute(ctx, "package-probe", HASH, None)
        mkdir.assert_not_called()

    def test_unsupported_host_fails_before_directory_or_checkpoint_copy(self):
        ctx = {
            "helpers": SimpleNamespace(
                host_check=Mock(side_effect=ValueError("unsupported actual host"))
            ),
            "request": {"node": "node"},
        }
        with (
            patch.object(operator, "whole"),
            patch.object(operator, "go"),
            patch.object(Path, "mkdir") as mkdir,
            self.assertRaisesRegex(ValueError, "host"),
        ):
            operator.execute(ctx, "package-probe", HASH, HASH)
        mkdir.assert_not_called()

    def test_direct_worker_requires_actual_go_and_live_whole_before_model_import(self):
        with (
            patch.object(operator, "go", side_effect=ValueError("missing actual Go")),
            patch.object(operator.importlib, "import_module") as importer,
            self.assertRaises(ValueError),
        ):
            operator.direct_worker({}, HASH, None)
        importer.assert_not_called()
        with (
            patch.object(operator, "go"),
            patch.object(
                operator, "whole", side_effect=ValueError("not actual live owned wrapper")
            ),
            patch.object(operator.importlib, "import_module") as importer,
            self.assertRaises(ValueError),
        ):
            operator.direct_worker({}, HASH, HASH)
        importer.assert_not_called()

    def test_closed_reader_rejects_live_failed_whole_before_outputs(self):
        with (
            patch.object(operator, "whole", side_effect=ValueError("whole not closed0")),
            patch.object(operator, "read") as reader,
            self.assertRaises(ValueError),
        ):
            operator.closed_phase({}, "package-probe", HASH)
        reader.assert_not_called()

    def test_source_adapter_whole_uses_only_bound_original_with_selected_paths(self):
        original = SimpleNamespace(whole=Mock())
        adapter = SimpleNamespace()  # Actual public adapter deliberately has no whole.
        paths = {
            "checkout": self.root / "checkout",
            "prepare": self.root / "actual-prepare",
            "migrate": self.root / "actual-migration",
            "prepareIdentity": self.root / "actual-prepare-id.json",
        }
        runtime_ctx = {"paths": paths, "_adapterRuntime": original, "operatorSha256": "b" * 64}
        ctx = {
            "runtime": adapter,
            "runtimeContext": runtime_ctx,
            "operatorSha256": HASH,
            "request": {
                "phaseBindings": {
                    phase: {
                        "run": str(self.root / phase),
                        "identity": str(self.root / (phase + "-identity.json")),
                    }
                    for phase in ("package-probe", "rooms")
                }
            },
        }
        for phase in ("package-probe", "rooms"):
            for closed in (False, True):
                operator.whole(ctx, phase, HASH, closed=closed)
                selected, mechanism_phase, identity = original.whole.call_args.args
                self.assertEqual((mechanism_phase, identity), ("prepare", HASH))
                self.assertEqual(selected["paths"]["prepare"], self.root / phase)
                self.assertEqual(
                    selected["paths"]["prepareIdentity"], self.root / (phase + "-identity.json")
                )
                self.assertEqual(selected["paths"]["checkout"], paths["checkout"])
                self.assertEqual(selected["paths"]["migrate"], paths["migrate"])
                self.assertEqual(selected["operatorSha256"], HASH)
                self.assertEqual(original.whole.call_args.kwargs, {"closed": closed})
        self.assertEqual(runtime_ctx["paths"], paths)
        self.assertEqual(runtime_ctx["operatorSha256"], "b" * 64)
        del runtime_ctx["_adapterRuntime"]
        ctx["runtime"].whole = Mock()  # No permissive old-reader/module fallback.
        with self.assertRaisesRegex(ValueError, "source-adapter"):
            operator.whole(ctx, "package-probe", HASH, closed=False)
        ctx["runtime"].whole.assert_not_called()
        runtime_ctx["_adapterRuntime"] = SimpleNamespace()
        with self.assertRaises(ValueError):
            operator.whole(ctx, "rooms", HASH, closed=True)

    def test_rooms_require_actual_closed_probe_pins_and_exact_root_go(self):
        ctx, path, expected = self.go_context()
        expected.update(
            phase="rooms",
            packageProbeIdentitySha256=HASH,
            packageProbeCompletionSha256=HASH,
            manifestSha256=HASH,
        )
        proof = {"identitySha256": HASH, "completionSha256": HASH, "manifestSha256": HASH}
        for key in ("packageProbeIdentitySha256", "packageProbeCompletionSha256", "manifestSha256"):
            path.write_text(json.dumps({**expected, key: None}))
            with patch.object(operator, "closed_phase") as closed, self.assertRaises(ValueError):
                operator.go(ctx, "rooms", HASH, operator.digest(path), idle=False)
            closed.assert_not_called()
        path.write_text(json.dumps({**expected, "packageProbeCompletionSha256": "b" * 64}))
        with (
            patch.object(operator, "closed_phase", return_value=proof),
            self.assertRaises(ValueError),
        ):
            operator.go(ctx, "rooms", HASH, operator.digest(path), idle=False)
        path.write_text(json.dumps(expected))
        with patch.object(operator, "closed_phase", return_value=proof) as closed:
            operator.go(ctx, "rooms", HASH, operator.digest(path), idle=False)
        closed.assert_called_once_with(ctx, "package-probe", HASH)

    def test_actual_closed_output_or_package_mutation_rejects(self):
        run = self.root / "phase"
        run.mkdir()
        (run / "operator.py").write_bytes(OPERATOR.read_bytes())
        completion = {
            "identitySha256": HASH,
            "operatorSha256": operator.digest(OPERATOR),
            "requestSha256": HASH,
            "resourceGoSha256": HASH,
            "outputs": {"file": HASH},
            "packageFiles": {"checkpoint.pt": HASH},
            "report": {
                "acceptance": False,
                "noStrengthOrPromotionClaim": True,
                "checkpointSha256": HASH,
            },
        }
        (run / "completion.json").write_text(json.dumps(completion))
        (run / "report.json").write_text(json.dumps(completion["report"]))
        ctx = {
            "operatorSha256": operator.digest(OPERATOR),
            "requestSha256": HASH,
            "primary": {"sha256": HASH},
            "request": {"output": str(self.root)},
            "runtimeContext": {"v50": SimpleNamespace(file_map=Mock())},
        }
        for maps in (
            ({"file": "b" * 64}, {"checkpoint.pt": HASH}),
            ({"file": HASH}, {"checkpoint.pt": "b" * 64}),
        ):
            ctx["runtimeContext"]["v50"].file_map.side_effect = maps
            with (
                patch.object(operator, "phase_path", return_value=run),
                patch.object(operator, "whole"),
                patch.object(operator, "go"),
                self.assertRaisesRegex(ValueError, "files changed"),
            ):
                operator.closed_phase(ctx, "package-probe", HASH)
        ctx["runtimeContext"]["v50"].file_map.side_effect = (
            {"file": HASH},
            {"checkpoint.pt": HASH},
        )
        with (
            patch.object(operator, "phase_path", return_value=run),
            patch.object(operator, "whole"),
            patch.object(operator, "go"),
        ):
            result = operator.closed_phase(ctx, "package-probe", HASH)
        self.assertFalse(result["acceptance"])
        (run / "operator.py").write_text("synthetic substituted operator")
        with (
            patch.object(operator, "phase_path", return_value=run),
            patch.object(operator, "whole"),
            self.assertRaises(ValueError),
        ):
            operator.closed_phase(ctx, "package-probe", HASH)

    def test_supported_sealed_delivery_and_transport_bytes_remain_exact(self):
        root = OPERATOR.parents[1]
        self.assertEqual(operator.digest(root / "delivery.mjs"), operator.DELIVERY_SHA)
        self.assertEqual(operator.digest(root / "candidate_delivery.py"), operator.HELPER_SHA)
        self.assertEqual(
            operator.digest(root / "candidate-transport-trace.mjs"), operator.TRACE_SHA
        )


if __name__ == "__main__":
    unittest.main()
