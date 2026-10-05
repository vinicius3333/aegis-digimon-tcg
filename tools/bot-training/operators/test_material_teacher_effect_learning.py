"""Synthetic admission/consumer tests; no remote, games, Torch or actual proof."""

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
from unittest.mock import patch

sys.dont_write_bytecode = True
OPERATOR = Path(__file__).with_name("material-teacher-effect-learning.py")
SPEC = importlib.util.spec_from_file_location("effect_admission", OPERATOR)
assert SPEC is not None and SPEC.loader is not None
ADAPTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ADAPTER)
BASE = OPERATOR.with_name("material-teacher-learning.py")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class ExpertAdmissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parents[3])
        self.addCleanup(self.temp.cleanup)
        self.lab = Path(self.temp.name)
        self.transfers = self.lab / "transfers"
        self.transfers.mkdir()
        self.base_path = self.transfers / "material-teacher-learning.py"
        self.base_path.write_bytes(BASE.read_bytes())
        self.base_request = self.transfers / "material-teacher-learning-r2-request.json"
        self.base_request.write_text('{"synthetic":true}\n', encoding="utf-8")
        self.entry = self.transfers / "material-teacher-effect-entry.mjs"
        self.entry.write_text("// synthetic external producer\n", encoding="utf-8")
        self.policy = self.transfers / "material-teacher-effect-policy.mjs"
        self.policy.write_text("// synthetic policy helper\n", encoding="utf-8")
        self.request = self.transfers / "expert-request.json"
        for name, value in {
            "LAB": self.lab,
            "BASE_OPERATOR": self.base_path,
            "BASE_REQUEST": self.base_request,
            "BASE_REQUEST_SHA": sha(self.base_request),
            "_API": None,
        }.items():
            change = patch.object(ADAPTER, name, value)
            change.start()
            self.addCleanup(change.stop)
        self.base = ADAPTER.original()
        self.actor = {
            "formatVersion": 1,
            "baseRequest": {"path": str(self.base_request), "sha256": sha(self.base_request)},
            "entry": str(self.entry),
            "expertModules": {str(self.entry): sha(self.entry), str(self.policy): sha(self.policy)},
            "oldPhases": {
                phase: {"identitySha256": "1" * 64, "completionSha256": "2" * 64}
                for phase in ADAPTER.OLD_PHASES
            },
        }
        self.calls: list[tuple] = []
        commands = {
            phase: ["python", "collect.py", "--worker", "original.js", "--seed", str(i)]
            for i, phase in enumerate(sorted(ADAPTER.OLD_PHASES | ADAPTER.OWN_PHASES))
        }
        self.before = {
            "commands": commands,
            "operatorSha256": ADAPTER.BASE_SHA,
            "requestSha256": ADAPTER.BASE_REQUEST_SHA,
            "requestPath": self.base_request,
            "prepared": {"completionSha256": "3" * 64},
            "migrated": {"completionSha256": "4" * 64},
            "request": {"phaseBindings": {}},
            "run": self.lab / "runs/material-teacher-learning-synthetic",
        }

        def context(path: Path, request_sha: str, operator_sha: str) -> dict:
            self.calls.append(("context", path, request_sha, operator_sha))
            return self.before

        def closed(ctx: dict, phase: str, identity: str) -> dict:
            self.calls.append(("closed", ctx, phase, identity))
            return {"completionSha256": self.actor["oldPhases"][phase]["completionSha256"]}

        self.base.context = context
        self.base.closed_phase = closed
        self.ns = ADAPTER.namespace(self.base)

    def write_actor(self) -> str:
        self.request.write_text(json.dumps(self.actor), encoding="utf-8")
        return sha(self.request)

    def context(self) -> dict:
        return self.ns["context"](self.request, self.write_actor(), sha(OPERATOR))

    def test_exact_original_owner_and_only_unused_worker_changes(self) -> None:
        ctx = self.context()
        self.assertEqual(
            self.calls[0],
            ("context", self.base_request, ADAPTER.BASE_REQUEST_SHA, ADAPTER.BASE_SHA),
        )
        self.assertEqual(len(self.calls), 5)
        for call in self.calls[1:]:
            self.assertIs(call[1], self.before)
            self.assertIn(call[2], ADAPTER.OLD_PHASES)
        self.assertIs(ctx["request"], self.before["request"])
        for phase, command in self.before["commands"].items():
            expected = command.copy()
            if phase in ADAPTER.EXPERT_PHASES:
                expected[expected.index("--worker") + 1] = str(self.entry)
            self.assertEqual(ctx["commands"][phase], expected)
        self.assertTrue(
            all(
                c[c.index("--worker") + 1] == "original.js"
                for c in self.before["commands"].values()
            )
        )

    def test_original_closure_never_uses_new_whole_owner(self) -> None:
        ctx = self.context()
        for phase in ADAPTER.OLD_PHASES:
            self.ns["closed_phase"](ctx, phase, "1" * 64)
            self.assertIs(self.calls[-1][1], self.before)
            with self.assertRaisesRegex(ValueError, "Wrong original predecessor"):
                self.ns["closed_phase"](ctx, phase, "a" * 64)

    def test_original_phase_cannot_launch_before_side_effect(self) -> None:
        ctx = self.context()
        with patch.object(self.base.subprocess, "run", side_effect=AssertionError("job started")):
            for phase in ADAPTER.OLD_PHASES | {"unknown", "contexts-5"}:
                with self.assertRaisesRegex(ValueError, "cannot launch"):
                    self.ns["run"](ctx, phase, "1" * 64, "5" * 64)
        self.assertFalse(ctx["run"].exists())

    def test_new_whole_keeps_original_closed_process_guard(self) -> None:
        ctx = self.context()
        identity_path = self.transfers / "synthetic-identity.json"
        identity_path.write_text("{}", encoding="utf-8")
        ctx["request"]["phaseBindings"]["contexts-3"] = {"identity": str(identity_path)}
        seen = []

        def verify(identity: dict, operator_sha: str) -> None:
            seen.append((identity, operator_sha))
            raise ValueError("synthetic real whole rejected")

        ctx["runtime"] = SimpleNamespace(
            V50_PATH="original", V50_SHA="pin", extract=lambda *args: {"verify_whole": verify}
        )
        ctx["runtimeContext"] = {"v50": SimpleNamespace()}
        with self.assertRaisesRegex(ValueError, "real whole rejected"):
            self.ns["whole"](ctx, "contexts-3", sha(identity_path), closed=True)
        self.assertEqual(seen, [({}, sha(OPERATOR))])

    def approval(self, ctx: dict, phase: str) -> tuple[Path, str]:
        path = self.transfers / (phase + "-go.json")
        value = {
            "approved": True,
            "phase": phase,
            "operatorSha256": sha(OPERATOR),
            "requestSha256": ctx["requestSha256"],
            "prepareCompletionSha256": "3" * 64,
            "migrationCompletionSha256": "4" * 64,
            "predecessors": {"diagnostic": self.actor["oldPhases"]["diagnostic"]},
        }
        path.write_text(json.dumps(value), encoding="utf-8")
        ctx["request"]["phaseBindings"][phase] = {"resourceGo": str(path)}
        ctx["runtimeContext"] = {
            "v50": SimpleNamespace(
                same=lambda a, b: json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
            )
        }
        ctx["runtime"] = SimpleNamespace(
            host=lambda: self.calls.append(("host",)),
            helpers=lambda _: {
                "foundation": {"require_idle": lambda: self.calls.append(("idle",))}
            },
        )
        return path, sha(path)

    def test_root_go_and_original_predecessor_then_idle(self) -> None:
        ctx = self.context()
        _, approval_sha = self.approval(ctx, "contexts-3")
        self.ns["go"](ctx, "contexts-3", approval_sha, idle=True)
        self.assertIs(self.calls[-3][1], self.before)
        self.assertEqual(self.calls[-2:], [("host",), ("idle",)])

    def test_changed_expert_bytes_rejected_before_and_after_go(self) -> None:
        ctx = self.context()
        _, approval_sha = self.approval(ctx, "contexts-3")
        self.entry.write_text("// changed\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "pin changed"):
            self.ns["go"](ctx, "contexts-3", approval_sha, idle=True)
        self.assertNotIn(("host",), self.calls)
        self.entry.write_text("// synthetic external producer\n", encoding="utf-8")
        ctx["runtime"].host = lambda: self.entry.write_text(
            "// changed after admission\n", encoding="utf-8"
        )
        with self.assertRaisesRegex(ValueError, "pin changed"):
            self.ns["go"](ctx, "contexts-3", approval_sha, idle=True)

    def test_wrong_go_owner_boolean_and_missing_predecessor(self) -> None:
        for key, replacement in (
            ("approved", 1),
            ("operatorSha256", ADAPTER.BASE_SHA),
            ("requestSha256", ADAPTER.BASE_REQUEST_SHA),
            ("predecessors", {}),
        ):
            with self.subTest(key=key):
                ctx = self.context()
                path, _ = self.approval(ctx, "contexts-3")
                value = json.loads(path.read_text(encoding="utf-8"))
                value[key] = replacement
                path.write_text(json.dumps(value), encoding="utf-8")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-3", sha(path), idle=False)

    def test_hostile_actor_shapes_and_pins(self) -> None:
        cases = [
            {"formatVersion": True},
            {"formatVersion": 2},
            {"extra": True},
            {"oldPhases": {}},
            {"entry": []},
            {"entry": str(self.transfers / "unsealed.mjs")},
            {"expertModules": {str(self.entry): None, str(self.policy): sha(self.policy)}},
            {"expertModules": {str(self.entry): "0" * 64, str(self.policy): sha(self.policy)}},
            {"baseRequest": {"path": str(self.base_request), "sha256": "0" * 64}},
            {"expertModules": {str(self.entry.parent / ".." / "outside.mjs"): "1" * 64}},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                original = self.actor
                self.actor = {**copy.deepcopy(original), **changes}
                with self.assertRaises(ValueError):
                    ADAPTER.envelope(self.base, self.request, self.write_actor())
                self.actor = original

    def test_duplicate_keys_nonfinite_and_symlink_ancestors(self) -> None:
        for text in ('{"formatVersion":1,"formatVersion":1}', '{"formatVersion":NaN}'):
            self.request.write_text(text, encoding="utf-8")
            with self.assertRaises(ValueError):
                ADAPTER.envelope(self.base, self.request, sha(self.request))
        self.write_actor()
        linked = self.lab / "linked"
        linked.symlink_to(self.transfers, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlink"):
            ADAPTER.pin(linked / self.request.name, sha(self.request))
        self.entry.unlink()
        self.entry.symlink_to(self.base_request)
        with self.assertRaisesRegex(ValueError, "symlink"):
            ADAPTER.envelope(self.base, self.request, sha(self.request))

    def test_tensor_subprocess_calls_adapter_not_old_owner(self) -> None:
        ctx = self.context()
        argv = self.ns["tensor_command"](ctx, "imitation", "1" * 64, "5" * 64)
        self.assertEqual(argv[1], str(OPERATOR))
        self.assertEqual(argv[argv.index("--request") + 1], str(self.request))
        self.assertEqual(argv[argv.index("--operator-sha256") + 1], sha(OPERATOR))

    def test_external_consumer_api_and_original_source_mutation(self) -> None:
        api = ADAPTER.api()
        for name in ("context", "closed_phase", "scope", "natural", "phase_path", "data_outputs"):
            self.assertTrue(callable(getattr(ADAPTER, name)))
            self.assertTrue(callable(api[name]))
        self.base_path.write_text("# mutated\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "pin changed"):
            ADAPTER.api()

    def test_local_runtime_override_cannot_admit_production(self) -> None:
        for value in ("", str(self.lab)):
            with (
                self.subTest(value=value),
                patch.dict(os.environ, {"AEGIS_QUALIFIED_ROOT": value}),
                self.assertRaisesRegex(ValueError, "runtime override"),
            ):
                self.context()

    def test_imported_policy_cannot_be_missing_unpinned_or_changed(self) -> None:
        original = copy.deepcopy(self.actor["expertModules"])
        self.actor["expertModules"] = {str(self.entry): sha(self.entry)}
        with self.assertRaisesRegex(ValueError, "entry and policy"):
            self.context()
        self.actor["expertModules"] = {**original, str(self.transfers / "unknown.mjs"): "a" * 64}
        with self.assertRaisesRegex(ValueError, "entry and policy"):
            self.context()
        self.actor["expertModules"] = original
        ctx = self.context()
        _, approval_sha = self.approval(ctx, "contexts-3")
        self.policy.write_text("// changed imported helper\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "pin changed"):
            self.ns["go"](ctx, "contexts-3", approval_sha, idle=True)
        self.assertNotIn(("host",), self.calls)

    def test_executed_and_parsed_source_is_the_hashed_buffer(self) -> None:
        reader = Path.read_bytes

        def changed(path: Path) -> bytes:
            if path == self.base_path:
                return b"raise RuntimeError('unreviewed code executed')\n"
            return reader(path)

        with patch.object(Path, "read_bytes", changed):
            for call in (ADAPTER.original, lambda: ADAPTER.namespace(self.base)):
                with self.assertRaisesRegex(ValueError, "source byte pin"):
                    call()


if __name__ == "__main__":
    unittest.main()
