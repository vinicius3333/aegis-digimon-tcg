"""Bounded synthetic source-basis adapter guards; no actual jobs/models/closures.

Use ORIGINAL_RUNTIME_SOURCE and ORIGINAL_BASIS_IDENTITY for existing local
read-only byte references. Toy completion/report and consumer return values are
explicit stand-ins, never actual source/runtime/migration qualification.
"""

import ast
import copy
import hashlib
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "source_adapter", HERE / "material-teacher-source-runtime.py"
)
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)
ORIGINAL = Path(
    os.environ.get("ORIGINAL_RUNTIME_SOURCE", "/tmp/material-teacher-runtime-reviewed.py")
)
IDENTITY = Path(
    os.environ.get(
        "ORIGINAL_BASIS_IDENTITY",
        "/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training/2026-10-05-bt26-ex13-v41-preparation/whole-launch-identity.json",
    )
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class AdapterGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="synthetic-source-basis-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.run = self.root / adapter.BASIS_RUN.name
        self.run.mkdir()
        self.identity = self.root / "actual-identity-reference.json"
        self.identity.write_bytes(IDENTITY.read_bytes())
        self.completion = self.run / "completion.json"
        self.report = self.run / "fresh-report.json"
        self.completion.write_text('{"synthetic": "completion"}', encoding="utf-8")
        self.report.write_text('{"synthetic": "report"}', encoding="utf-8")
        self.request = {
            "consumerSha256": adapter.BASIS_CONSUMER_SHA,
            "identitySha256": adapter.BASIS_ID,
            "completionSha256": sha(self.completion),
            "reportSha256": sha(self.report),
        }
        for name, value in (
            ("BASIS_COMPLETION_SHA", sha(self.completion)),
            ("BASIS_REPORT_SHA", sha(self.report)),
        ):
            synthetic_pin = patch.object(adapter, name, value)
            synthetic_pin.start()
            self.addCleanup(synthetic_pin.stop)
        self.actual = {
            "trained": True,
            "checkpointPaths": {label: "SYNTHETIC-" + label for label in adapter.LABELS},
            "checkpointHashes": {label: "SYNTHETIC-" + label for label in adapter.LABELS},
            "metadata": {"synthetic": True},
            "curriculum": {"synthetic": True},
        }
        self.consume = Mock(return_value=self.actual)
        self.consumer = SimpleNamespace(
            FRESH=self.run,
            IDENTITY_SHA=adapter.BASIS_ID,
            FRESH_SHA=adapter.BASIS_OPERATOR,
            FRESH_WRAPPER_SHA=adapter.BASIS_WRAPPER,
            IDENTITY=self.identity,
            completed_fresh=self.consume,
            fresh_module=Mock(return_value="SYNTHETIC original module boundary"),
        )
        self.run_patch = patch.object(adapter, "BASIS_RUN", self.run)
        self.run_patch.start()
        self.addCleanup(self.run_patch.stop)

    def consume_basis(self):
        return adapter.source_basis(self.consumer, self.request)

    def fixed_request(self):
        return {
            "source": {
                "commit": adapter.SOURCE,
                "archive": {"sha256": adapter.ARCHIVE, "bytes": 43769742},
                "manifest": {"sha256": adapter.MANIFEST},
            },
            "basis": self.request,
        }

    def module_fixture(self):
        result = {
            "prior": {
                "custody": {
                    "sourceBasisType": "actual-closed-v41-four-policy-development",
                    "historicalPhysicalAccepted": False,
                    "historicalRoomsAccepted": False,
                }
            }
        }
        return SimpleNamespace(
            read=lambda path: json.loads(path.read_text()),
            admitted_context=Mock(return_value=result),
        )

    def call_bound(self, request, module=None):
        p = self.root / "synthetic-request.json"
        p.write_text(json.dumps(request), encoding="utf-8")
        return adapter.bound_context(
            module or self.module_fixture(), p, sha(p), sha(Path(adapter.__file__))
        )

    def test_actual_original_bytes_match_exact_reference_pins(self):
        self.assertEqual(sha(ORIGINAL), adapter.SEALED_SHA)
        self.assertEqual(sha(IDENTITY), adapter.BASIS_ID)

    def test_only_context_qualification_main_ast_changed(self):
        tree = ast.parse(ORIGINAL.read_text())
        before = {n.name: ast.dump(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        adapted = adapter.adapted_tree(tree)
        after = {n.name: ast.dump(n) for n in tree.body if isinstance(n, ast.FunctionDef)}
        changed = {name for name in before if before[name] != after[name]}
        self.assertEqual(changed, {"context", "qualification", "main"})
        self.assertEqual([n.name for n in adapted.body], ["context", "qualification", "main"])
        for name in (
            "prepare",
            "qualification",
            "migration_report",
            "migrate",
            "closed_prepare",
            "closed_migration",
            "whole",
            "resource_go",
            "helpers",
            "source_delta",
        ):
            self.assertIn(name, before)
        text = ast.unparse(adapted)
        self.assertNotIn("request['custody']", text)
        self.assertIn("request['basis']['consumerSha256'] == BASIS_CONSUMER_SHA", text)
        self.assertNotIn("consumer.completed_custody", text)
        self.assertNotIn("actualV44Custody", text)
        self.assertIn("actualV41SourceBasis", text)

    def test_original_whole_guard_precedes_basis_consumer(self):
        tree = adapter.adapted_tree(ast.parse(ORIGINAL.read_text()))
        context = next(n for n in tree.body if n.name == "context")
        text = ast.unparse(context)
        self.assertLess(
            text.index("['verify_whole'](identity, consumer.FRESH_SHA)"),
            text.index("custody = source_basis"),
        )

    def test_selector_cardinality_missing_or_duplicate_fail_closed(self):
        source = ORIGINAL.read_text()
        for changed in (
            source.replace("consumer.CUSTODY_SHA", "consumer.UNRELATED"),
            source.replace("consumer.CUSTODY_SHA", "consumer.CUSTODY_SHA or consumer.CUSTODY_SHA"),
        ):
            with self.subTest(changed=changed[-100:]), self.assertRaises(ValueError):
                adapter.adapted_tree(ast.parse(changed))

    def test_runtime_preserves_original_build_migration_code_objects(self):
        with patch.object(adapter, "SEALED", ORIGINAL):
            runtime = adapter.runtime()
        spec = importlib.util.spec_from_file_location("original_f14_fixture", ORIGINAL)
        original = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(original)
        for name in (
            "prepare",
            "helpers",
            "vitest_counts",
            "source_delta",
            "resource_go",
            "migration_report",
            "migrate",
            "closed_prepare",
            "closed_migration",
            "whole",
            "host",
        ):
            with self.subTest(name=name):
                self.assertEqual(getattr(runtime, name).__code__, getattr(original, name).__code__)
        self.assertEqual(runtime.__file__, adapter.__file__)
        self.assertEqual(runtime.CUSTODY_RUN, self.run)
        self.assertEqual(runtime.CUSTODY_ID, adapter.BASIS_ID)

    def test_sealed_source_mutation_or_symlink_rejected(self):
        altered = self.root / "altered.py"
        altered.write_bytes(ORIGINAL.read_bytes() + b"\n# altered\n")
        with patch.object(adapter, "SEALED", altered), self.assertRaises(ValueError):
            adapter.runtime()
        altered.unlink()
        altered.symlink_to(ORIGINAL)
        with patch.object(adapter, "SEALED", altered), self.assertRaises(ValueError):
            adapter.runtime()

    def test_nominal_synthetic_basis_calls_original_consumer_once(self):
        result = self.consume_basis()
        self.consume.assert_called_once()
        self.consumer.fresh_module.assert_called_once()
        self.assertEqual(result["checkpointPaths"], self.actual["checkpointPaths"])
        self.assertEqual(result["checkpointHashes"], self.actual["checkpointHashes"])
        self.assertEqual(result["metadata"], self.actual["metadata"])
        self.assertEqual(result["curriculum"], self.actual["curriculum"])
        self.assertFalse(result["historicalPhysicalAccepted"])
        self.assertFalse(result["historicalRoomsAccepted"])
        self.assertFalse(result["acceptedStrengthOrMastery"])
        self.assertEqual(result["sourceBasisType"], "actual-closed-v41-four-policy-development")

    def test_completion_or_report_unknown_before_original_consumer(self):
        for key in ("completionSha256", "reportSha256"):
            with self.subTest(key=key):
                prior = self.request[key]
                self.request[key] = None
                with self.assertRaises(ValueError):
                    self.consume_basis()
                self.consume.assert_not_called()
                self.request[key] = prior

    def test_completion_report_identity_changed_before_original_consumer(self):
        for path in (self.completion, self.report, self.identity):
            with self.subTest(path=path.name):
                before = path.read_bytes()
                path.write_bytes(before + b"\n# synthetic mutation")
                with self.assertRaises(ValueError):
                    self.consume_basis()
                self.consume.assert_not_called()
                path.write_bytes(before)

    def test_no_wrong_source_consumer_identity_or_operator(self):
        for key in ("IDENTITY_SHA", "FRESH_SHA", "FRESH_WRAPPER_SHA"):
            prior = getattr(self.consumer, key)
            setattr(self.consumer, key, "0" * 64)
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.consume_basis()
            self.consume.assert_not_called()
            setattr(self.consumer, key, prior)

    def test_missing_fourth_policy_or_untrained_basis_rejected(self):
        for change in ("trained", "checkpointPaths", "checkpointHashes"):
            actual = copy.deepcopy(self.actual)
            if change == "trained":
                actual[change] = False
            else:
                actual[change].pop("challenger")
            self.consume.return_value = actual
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.consume_basis()

    def test_original_consumer_rejects_failed_or_live_whole(self):
        self.consume.side_effect = ValueError(
            "SYNTHETIC original strict consumer failed/live/no whole0"
        )
        with self.assertRaises(ValueError):
            self.consume_basis()

    def test_post_consumer_producer_mutation_rejected(self):
        def mutate(_):
            self.completion.write_text("{}")
            return self.actual

        self.consume.side_effect = mutate
        with self.assertRaises(ValueError):
            self.consume_basis()

    def test_bound_context_keeps_public_context_fields_and_marks_false(self):
        module = self.module_fixture()
        result = self.call_bound(self.fixed_request(), module)
        module.admitted_context.assert_called_once()
        self.assertIs(result["_adapterRuntime"], module)
        self.assertFalse(result["prior"]["custody"]["historicalRoomsAccepted"])

    def test_unknown_basis_hash_prevents_actual_context_consumer(self):
        request = self.fixed_request()
        request["basis"] = dict(self.request, completionSha256=None)
        module = self.module_fixture()
        with self.assertRaises(ValueError):
            self.call_bound(request, module)
        module.admitted_context.assert_not_called()

    def test_frozen_commit_archive_manifest_or_size_cannot_change(self):
        for location, key, value in (
            ("source", "commit", "0" * 40),
            ("archive", "sha256", "0" * 64),
            ("archive", "bytes", True),
            ("manifest", "sha256", "0" * 64),
        ):
            request = self.fixed_request()
            selected = request["source"] if location == "source" else request["source"][location]
            selected[key] = value
            module = self.module_fixture()
            with self.subTest(location=location), self.assertRaises(ValueError):
                self.call_bound(request, module)
            module.admitted_context.assert_not_called()

    def test_v44_cannot_be_relabelled_completed(self):
        request = self.fixed_request()
        request["custody"] = dict(self.request)
        module = self.module_fixture()
        with self.assertRaises(ValueError):
            self.call_bound(request, module)
        module.admitted_context.assert_not_called()

    def test_preloaded_torch_and_optimized_interpreter_fail_before_reader(self):
        with (
            patch.dict(sys.modules, {"torch": object()}),
            patch.object(adapter, "runtime") as reader,
        ):
            with self.assertRaises(ValueError):
                adapter.context(self.root / "unknown.json", "0" * 64, "0" * 64)
            reader.assert_not_called()
        module = {"__name__": "synthetic_optimized", "__file__": adapter.__file__}
        exec(  # noqa: S102 - own stdlib guard source under explicit synthetic module, optimized admission rejection only.
            compile(Path(adapter.__file__).read_text(), adapter.__file__, "exec", optimize=1),
            module,
        )
        with self.assertRaises(ValueError):
            module["context"](self.root / "unknown.json", "0" * 64, "0" * 64)

    def test_actual_public_closures_delegate_original_without_shape_change(self):
        original = SimpleNamespace(
            closed_prepare=Mock(return_value={"SYNTHETIC": "prepare-shape"}),
            closed_migration=Mock(return_value={"SYNTHETIC": "migration-shape"}),
        )
        ctx = {"_adapterRuntime": original, "operatorSha256": sha(Path(adapter.__file__))}
        with patch.object(adapter, "SEALED", ORIGINAL):
            self.assertEqual(
                adapter.closed_prepare(ctx, "actual-identity-required"),
                {"SYNTHETIC": "prepare-shape"},
            )
            self.assertEqual(
                adapter.closed_migration(ctx, "migration-id-required", "prepare-id-required"),
                {"SYNTHETIC": "migration-shape"},
            )
        original.closed_prepare.assert_called_once_with(ctx, "actual-identity-required")
        original.closed_migration.assert_called_once_with(
            ctx, "migration-id-required", "prepare-id-required"
        )
        self.assertNotIn("torch", sys.modules)


if __name__ == "__main__":
    unittest.main(verbosity=2)
