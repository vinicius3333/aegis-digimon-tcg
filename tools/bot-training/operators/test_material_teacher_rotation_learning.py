"""Synthetic rotation admission/consumer tests; no remote, games, Torch or actual proof."""

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
OPERATOR = Path(__file__).with_name("material-teacher-rotation-learning.py")
SPEC = importlib.util.spec_from_file_location("rotation_admission", OPERATOR)
assert SPEC is not None and SPEC.loader is not None
ROTATION = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ROTATION)
BASE = OPERATOR.with_name("material-teacher-learning.py")
EFFECT = OPERATOR.with_name("material-teacher-effect-learning.py")
GAP = OPERATOR.with_name("material-teacher-gap-learning.py")
EXPANSIONS = [{"games": 880, "seed": 6000000 + 880 * i} for i in range(4)]
SEEDS = {"comparison": 6135000, "contexts": 6202500, "diagnostic": 6202400, "ppo": 6145000}
ORIGINAL_PHASES = ("diagnostic", "contexts", "contexts-1", "contexts-2")
EFFECT_PHASES = ("contexts-3", "contexts-4")
GAP_PHASES = ("contexts-5", "contexts-6")
PRIOR = (*ORIGINAL_PHASES, *EFFECT_PHASES, *GAP_PHASES)


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pins(index: int) -> dict[str, str]:
    return {"identitySha256": f"{index:x}" * 64, "completionSha256": f"{index + 9:x}"[-1] * 64}


class RotationAdmissionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).parents[3])
        self.addCleanup(self.temp.cleanup)
        self.lab = Path(self.temp.name)
        self.transfers = self.lab / "transfers"
        self.transfers.mkdir()
        self.run_path = self.lab / "runs/material-teacher-learning-synthetic"
        self.base_path = self.transfers / "material-teacher-learning.py"
        self.base_path.write_bytes(BASE.read_bytes())
        self.effect_path = self.transfers / "material-teacher-effect-learning.py"
        self.effect_path.write_bytes(EFFECT.read_bytes())
        self.gap_path = self.transfers / "material-teacher-gap-learning.py"
        self.gap_path.write_bytes(GAP.read_bytes())
        self.base_request = self.transfers / "material-teacher-learning-r2-request.json"
        self.base_request.write_text('{"synthetic":true}\n', encoding="utf-8")
        self.entry = self.transfers / "material-teacher-effect-entry.mjs"
        self.entry.write_text("// synthetic external producer\n", encoding="utf-8")
        self.policy = self.transfers / "material-teacher-effect-policy.mjs"
        self.policy.write_text("// synthetic policy helper\n", encoding="utf-8")
        self.prior = {phase: pins(i) for i, phase in enumerate(PRIOR)}
        self.effect_request = self.write_json(
            "material-teacher-effect-request.json",
            {
                "formatVersion": 1,
                "baseRequest": {"path": str(self.base_request), "sha256": sha(self.base_request)},
                "entry": str(self.entry),
                "expertModules": {
                    str(self.entry): sha(self.entry),
                    str(self.policy): sha(self.policy),
                },
                "oldPhases": {p: self.prior[p] for p in ORIGINAL_PHASES},
            },
        )
        self.gap_request = self.write_json(
            "material-teacher-gap-request.json",
            {
                "formatVersion": 1,
                "effectOperator": {"path": str(self.effect_path), "sha256": sha(EFFECT)},
                "effectRequest": {
                    "path": str(self.effect_request),
                    "sha256": sha(self.effect_request),
                },
                "oldPhases": {p: self.prior[p] for p in (*ORIGINAL_PHASES, *EFFECT_PHASES)},
                "gap": [{"seed": 6003520, "games": 880}, {"seed": 6004400, "games": 880}],
            },
        )
        self.request = self.transfers / "material-teacher-rotation-learning-request.json"
        self.actor = {
            "formatVersion": 1,
            "priorOwner": {"path": str(self.gap_path), "sha256": ROTATION.GAP_SHA},
            "priorRequest": {"path": str(self.gap_request), "sha256": sha(self.gap_request)},
            "oldPhases": copy.deepcopy(self.prior),
            "rotation": {"seed": 6005280, "games": 3960},
        }
        for name, value in {
            "LAB": self.lab,
            "GAP_OPERATOR": self.gap_path,
            "GAP_REQUEST": self.gap_request,
            "GAP_REQUEST_SHA": sha(self.gap_request),
            "_GAP": None,
            "_API": None,
        }.items():
            change = patch.object(ROTATION, name, value)
            change.start()
            self.addCleanup(change.stop)
        self.gap = ROTATION.gap_module()
        for name, value in {
            "LAB": self.lab,
            "EFFECT_OPERATOR": self.effect_path,
            "EFFECT_REQUEST": self.effect_request,
            "EFFECT_REQUEST_SHA": sha(self.effect_request),
            "ENTRY_SHA": sha(self.entry),
            "POLICY_SHA": sha(self.policy),
            "_EFFECT": None,
            "_API": None,
        }.items():
            setattr(self.gap, name, value)
        self.effect = self.gap.effect_module()
        for name, value in {
            "LAB": self.lab,
            "BASE_OPERATOR": self.base_path,
            "BASE_REQUEST": self.base_request,
            "BASE_REQUEST_SHA": sha(self.base_request),
            "_API": None,
        }.items():
            setattr(self.effect, name, value)
        self.base = self.effect.original()
        self.calls: list[tuple] = []
        self.before = self.original_context()
        self.base.context = self.base_context
        self.base.closed_phase = self.base_closed
        self.effect_ns = self.effect.namespace(self.base)
        real_effect_closed = self.effect_ns["closed_phase"]

        def effect_closed(ctx: dict, phase: str, identity: str) -> dict:
            self.calls.append(("effect-closed", ctx, phase, identity))
            if phase in ORIGINAL_PHASES:
                return real_effect_closed(ctx, phase, identity)
            return {"completionSha256": self.prior[phase]["completionSha256"]}

        self.effect_ns["closed_phase"] = effect_closed
        self.gap_ns = self.gap.namespace(self.effect, self.base, self.effect_ns)
        real_gap_closed = self.gap_ns["closed_phase"]

        def gap_closed(ctx: dict, phase: str, identity: str) -> dict:
            self.calls.append(("gap-closed", ctx, phase, identity))
            if phase in GAP_PHASES:
                # Synthetic stand-in for the gap owner's real closed contexts-5/6 consumer.
                return {"completionSha256": self.prior[phase]["completionSha256"]}
            return real_gap_closed(ctx, phase, identity)

        self.gap_ns["closed_phase"] = gap_closed
        self.ns = ROTATION.namespace(self.gap, self.effect, self.base, self.gap_ns)

    def write_json(self, name: str, value: dict) -> Path:
        path = self.transfers / name
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def original_context(self) -> dict:
        expansions = [f"contexts-{i + 1}" for i in range(len(EXPANSIONS))]
        phases = ["diagnostic", "contexts", *expansions, "imitation", "ppo", "comparison"]
        commands = {
            phase: [
                "python",
                "collect.py",
                "--worker",
                "original.js",
                "--seed",
                "1",
                "--games",
                "880",
                "--output",
                str(self.run_path / phase),
            ]
            for phase in phases
        }
        return {
            "commands": commands,
            "operatorSha256": self.effect.BASE_SHA,
            "requestSha256": sha(self.base_request),
            "requestPath": self.base_request,
            "prepared": {"completionSha256": "3" * 64},
            "migrated": {"completionSha256": "4" * 64},
            "request": {
                "seeds": dict(SEEDS),
                "contextExpansions": copy.deepcopy(EXPANSIONS),
                "phaseBindings": {
                    phase: {
                        "identity": str(self.transfers / f"r2-{phase}-identity.json"),
                        "resourceGo": str(self.transfers / f"r2-{phase}-go.json"),
                    }
                    for phase in phases
                },
            },
            "run": self.run_path,
            "checkout": self.lab / "checkout",
        }

    def base_context(self, path: Path, request_sha: str, operator_sha: str) -> dict:
        self.calls.append(("base-context", path, request_sha, operator_sha))
        return self.before

    def base_closed(self, ctx: dict, phase: str, identity: str) -> dict:
        self.calls.append(("base-closed", ctx, phase, identity))
        return {"completionSha256": self.prior[phase]["completionSha256"]}

    def write_actor(self) -> str:
        self.request.write_text(json.dumps(self.actor), encoding="utf-8")
        return sha(self.request)

    def context(self) -> dict:
        return self.ns["context"](self.request, self.write_actor(), sha(OPERATOR))

    def approval(self, ctx: dict, phase: str, predecessors: dict[str, dict]) -> str:
        path = Path(ROTATION.bindings(phase)["resourceGo"])
        path.write_text(
            json.dumps(
                {
                    "approved": True,
                    "phase": phase,
                    "operatorSha256": sha(OPERATOR),
                    "requestSha256": ctx["requestSha256"],
                    "prepareCompletionSha256": "3" * 64,
                    "migrationCompletionSha256": "4" * 64,
                    "predecessors": predecessors,
                }
            ),
            encoding="utf-8",
        )
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
        return sha(path)

    def test_prior_owners_consumed_and_only_rotation_block_added(self) -> None:
        gap_request_before = json.loads(self.gap_request.read_text(encoding="utf-8"))
        ctx = self.context()
        gap_ctx = ctx["gapContext"]
        consumed = [(c[2], c[1]) for c in self.calls if c[0] == "gap-closed"]
        self.assertEqual([phase for phase, _ in consumed], list(GAP_PHASES))
        self.assertTrue(all(owner is gap_ctx for _, owner in consumed))
        effect_consumed = [c[2] for c in self.calls if c[0] == "effect-closed"]
        self.assertEqual(effect_consumed, list(EFFECT_PHASES))
        self.assertEqual(
            json.loads(self.gap_request.read_text(encoding="utf-8")), gap_request_before
        )
        self.assertEqual(len(gap_ctx["request"]["contextExpansions"]), 6)
        for phase, command in gap_ctx["commands"].items():
            self.assertEqual(ctx["commands"][phase], command)
        expected = gap_ctx["commands"]["contexts-6"].copy()
        for option, value in (
            ("--seed", 6005280),
            ("--games", 3960),
            ("--output", self.run_path / "contexts-7"),
        ):
            expected[expected.index(option) + 1] = str(value)
        self.assertEqual(ctx["commands"]["contexts-7"], expected)
        self.assertEqual(expected[expected.index("--worker") + 1], str(self.entry))
        self.assertEqual(set(ctx["commands"]) - set(gap_ctx["commands"]), {"contexts-7"})
        self.assertEqual(ctx["rotationPhases"], {"contexts-7", "imitation", "ppo", "comparison"})

    def test_block_keeps_original_period_folds_and_new_bindings(self) -> None:
        ctx = self.context()
        blocks = {name: (seed, count) for name, seed, count in self.ns["blocks"](ctx["request"])}
        self.assertEqual(blocks["contexts-7"], (6005280, 3960))
        self.assertEqual(3960 % 440, 0)
        self.assertEqual(blocks["contexts-6"][0] + blocks["contexts-6"][1], 6005280)
        self.assertLessEqual(6005280 + 3960, 6210000)
        gap_bindings = ctx["gapContext"]["request"]["phaseBindings"]
        for phase in ROTATION.ROTATION_PHASES:
            self.assertEqual(ctx["request"]["phaseBindings"][phase], ROTATION.bindings(phase))
            self.assertNotIn(ROTATION.bindings(phase)["identity"], json.dumps(gap_bindings))
        for phase in PRIOR:
            self.assertEqual(ctx["request"]["phaseBindings"][phase], gap_bindings[phase])
        for games in (3872, 4400 - 1):
            request = copy.deepcopy(ctx["request"])
            request["contextExpansions"][-1]["games"] = games
            with self.assertRaisesRegex(ValueError, "fold opportunity periods"):
                self.ns["blocks"](request)

    def test_prior_closure_routes_to_actual_owner_and_fails_closed(self) -> None:
        ctx = self.context()
        for phase in PRIOR:
            self.ns["closed_phase"](ctx, phase, self.prior[phase]["identitySha256"])
            owner = [c for c in self.calls if c[0] == "gap-closed"][-1]
            self.assertEqual(owner[2], phase)
            self.assertIs(owner[1], ctx["gapContext"])
            if phase in ORIGINAL_PHASES:
                self.assertEqual(self.calls[-1][0], "base-closed")
                self.assertIs(self.calls[-1][1], self.before)
            with self.assertRaisesRegex(ValueError, "Wrong prior predecessor"):
                self.ns["closed_phase"](ctx, phase, "a" * 64)
        for phase in ("contexts-6", "contexts-2"):
            saved = self.prior[phase]
            self.prior[phase] = {**saved, "completionSha256": "e" * 64}
            with self.assertRaisesRegex(ValueError, "closure changed"):
                self.ns["closed_phase"](ctx, phase, saved["identitySha256"])
            self.prior[phase] = saved
        with self.assertRaisesRegex(ValueError, "Unknown rotation phase"):
            self.ns["closed_phase"](ctx, "contexts-8", "1" * 64)

    def test_prior_or_unknown_phase_cannot_launch_before_side_effect(self) -> None:
        ctx = self.context()
        with patch.object(self.base.subprocess, "run", side_effect=AssertionError("job started")):
            for phase in [*PRIOR, "contexts-8", "unknown"]:
                with self.assertRaisesRegex(ValueError, "cannot launch"):
                    self.ns["run"](ctx, phase, "1" * 64, "5" * 64)
        self.assertFalse(self.run_path.exists())

    def test_new_whole_keeps_original_closed_process_guard(self) -> None:
        ctx = self.context()
        identity_path = Path(ROTATION.bindings("contexts-7")["identity"])
        identity_path.write_text("{}", encoding="utf-8")
        seen = []

        def verify(identity: dict, operator_sha: str) -> None:
            seen.append((identity, operator_sha))
            raise ValueError("synthetic real whole rejected")

        ctx["runtime"] = SimpleNamespace(
            V50_PATH="original", V50_SHA="pin", extract=lambda *args: {"verify_whole": verify}
        )
        ctx["runtimeContext"] = {"v50": SimpleNamespace()}
        with self.assertRaisesRegex(ValueError, "real whole rejected"):
            self.ns["whole"](ctx, "contexts-7", sha(identity_path), closed=True)
        self.assertEqual(seen, [({}, sha(OPERATOR))])

    def test_go_binds_exact_diagnostic_and_contexts6_closures(self) -> None:
        ctx = self.context()
        for selected in (["diagnostic"], ["diagnostic", "contexts-5"], ["contexts-6"]):
            with self.subTest(selected=selected):
                approval_sha = self.approval(
                    ctx, "contexts-7", {p: self.prior[p] for p in selected}
                )
                with self.assertRaisesRegex(ValueError, "Missing/unknown predecessor"):
                    self.ns["go"](ctx, "contexts-7", approval_sha, idle=True)
        exact = {p: self.prior[p] for p in ("diagnostic", "contexts-6")}
        for key, reason in (
            ("identitySha256", "Wrong prior predecessor identity"),
            ("completionSha256", "Predecessor changed"),
        ):
            for phase in ("diagnostic", "contexts-6"):
                with self.subTest(key=key, phase=phase):
                    changed = copy.deepcopy(exact)
                    changed[phase][key] = "c" * 64
                    approval_sha = self.approval(ctx, "contexts-7", changed)
                    with self.assertRaisesRegex(ValueError, reason):
                        self.ns["go"](ctx, "contexts-7", approval_sha, idle=True)
        self.assertNotIn(("host",), self.calls)
        self.ns["go"](ctx, "contexts-7", self.approval(ctx, "contexts-7", exact), idle=True)
        owners = [c[2] for c in self.calls if c[0] == "gap-closed"][-2:]
        self.assertEqual(sorted(owners), ["contexts-6", "diagnostic"])
        self.assertEqual(self.calls[-2:], [("host",), ("idle",)])

    def test_wrong_go_owner_boolean_and_phase(self) -> None:
        exact = {p: self.prior[p] for p in ("diagnostic", "contexts-6")}
        for key, replacement in (
            ("approved", 1),
            ("operatorSha256", ROTATION.GAP_SHA),
            ("requestSha256", "f" * 64),
            ("phase", "contexts-6"),
        ):
            with self.subTest(key=key):
                ctx = self.context()
                path = Path(ROTATION.bindings("contexts-7")["resourceGo"])
                self.approval(ctx, "contexts-7", exact)
                value = json.loads(path.read_text(encoding="utf-8"))
                value[key] = replacement
                path.write_text(json.dumps(value), encoding="utf-8")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-7", sha(path), idle=True)
                self.assertNotIn(("host",), self.calls)

    def test_imitation_must_consume_all_closed_data_through_contexts7(self) -> None:
        ctx = self.context()
        through_six = {p: self.prior[p] for p in PRIOR}
        with self.assertRaisesRegex(ValueError, "through contexts-7"):
            self.ns["go"](
                ctx, "imitation", self.approval(ctx, "imitation", through_six), idle=False
            )
        skipped = {
            **{p: v for p, v in through_six.items() if p != "contexts-6"},
            "contexts-7": pins(10),
        }
        with self.assertRaisesRegex(ValueError, "closed original prefix"):
            self.ns["go"](ctx, "imitation", self.approval(ctx, "imitation", skipped), idle=False)
        seen = []

        def closed_whole(ctx: dict, phase: str, identity: str, *, closed: bool) -> None:
            seen.append((phase, closed))
            raise ValueError("synthetic contexts-7 full consumer reached")

        self.ns["whole"] = closed_whole
        complete = {**through_six, "contexts-7": pins(10)}
        with self.assertRaisesRegex(ValueError, "contexts-7 full consumer"):
            self.ns["go"](ctx, "imitation", self.approval(ctx, "imitation", complete), idle=False)
        self.assertEqual(seen, [("contexts-7", True)])

    def test_hostile_rotation_request_shapes_and_pins(self) -> None:
        cases = [
            {"formatVersion": True},
            {"formatVersion": 2},
            {"extra": True},
            {"acceptedStrengthOrMastery": False},
            {"oldPhases": {p: self.prior[p] for p in PRIOR[:6]}},
            {"oldPhases": {**self.prior, "contexts-7": pins(10)}},
            {"oldPhases": {**self.prior, "contexts-6": {"identitySha256": True}}},
            {"priorOwner": {"path": str(self.gap_path), "sha256": "0" * 64}},
            {"priorOwner": {"path": str(self.effect_path), "sha256": ROTATION.GAP_SHA}},
            {"priorRequest": {"path": str(self.effect_request), "sha256": sha(self.gap_request)}},
            {"rotation": {"seed": 6005280, "games": 3872}},
            {"rotation": {"seed": 6005280, "games": 880}},
            {"rotation": {"seed": 6004400, "games": 3960}},
            {"rotation": {"seed": 6005280, "games": True}},
            {"rotation": {"seed": 6005280.0, "games": 3960}},
            {"rotation": {"seed": 6005280, "games": 3960, "worker": "other.mjs"}},
            {"rotation": [{"seed": 6005280, "games": 3960}]},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                original = self.actor
                self.actor = {**copy.deepcopy(original), **changes}
                with self.assertRaises(ValueError):
                    ROTATION.envelope(self.effect, self.base, self.request, self.write_actor())
                self.actor = original

    def test_prior_pins_must_equal_gap_request(self) -> None:
        self.actor["oldPhases"]["contexts-2"] = pins(10)
        with self.assertRaisesRegex(ValueError, "differ from the gap request"):
            self.context()
        self.actor["oldPhases"] = copy.deepcopy(self.prior)
        self.actor["oldPhases"]["contexts-6"] = pins(10)
        with self.assertRaisesRegex(ValueError, "Prior closure changed"):
            self.context()

    def test_duplicate_keys_nonfinite_and_symlinks(self) -> None:
        for text in ('{"formatVersion":1,"formatVersion":1}', '{"formatVersion":NaN}'):
            self.request.write_text(text, encoding="utf-8")
            with self.assertRaises(ValueError):
                ROTATION.envelope(self.effect, self.base, self.request, sha(self.request))
        self.write_actor()
        linked = self.lab / "linked"
        linked.symlink_to(self.transfers, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlink"):
            ROTATION.envelope(self.effect, self.base, linked / self.request.name, sha(self.request))
        with self.assertRaisesRegex(ValueError, "symlink"):
            ROTATION.sealed_source(linked / self.gap_path.name, ROTATION.GAP_SHA)

    def test_changed_inputs_rejected_before_and_after_go(self) -> None:
        exact = {p: self.prior[p] for p in ("diagnostic", "contexts-6")}
        for path in (self.gap_path, self.gap_request, self.effect_request, self.policy):
            with self.subTest(path=path.name):
                ctx = self.context()
                approval_sha = self.approval(ctx, "contexts-7", exact)
                saved = path.read_bytes()
                path.write_bytes(saved + b"\n")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-7", approval_sha, idle=True)
                self.assertNotIn(("host",), self.calls)
                path.write_bytes(saved)
                ctx["runtime"].host = lambda path=path, saved=saved: path.write_bytes(saved + b"#")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-7", approval_sha, idle=True)
                path.write_bytes(saved)

    def test_local_runtime_override_cannot_admit_production(self) -> None:
        for value in ("", str(self.lab)):
            with (
                self.subTest(value=value),
                patch.dict(os.environ, {"AEGIS_QUALIFIED_ROOT": value}),
                self.assertRaisesRegex(ValueError, "runtime override"),
            ):
                self.context()

    def test_tensor_subprocess_calls_rotation_operator(self) -> None:
        ctx = self.context()
        argv = self.ns["tensor_command"](ctx, "imitation", "1" * 64, "5" * 64)
        self.assertEqual(argv[1], str(OPERATOR))
        self.assertEqual(argv[argv.index("--request") + 1], str(self.request))
        self.assertEqual(argv[argv.index("--operator-sha256") + 1], sha(OPERATOR))

    def test_public_consumer_api_and_prior_source_mutation(self) -> None:
        api = ROTATION.api()
        for name in ("context", "closed_phase", "scope", "natural", "phase_path", "data_outputs"):
            self.assertTrue(callable(getattr(ROTATION, name)))
            self.assertTrue(callable(api[name]))
        self.gap_path.write_text("# mutated\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "byte pin"):
            ROTATION.api()

    def test_executed_gap_source_is_the_hashed_buffer(self) -> None:
        reader = Path.read_bytes

        def changed(path: Path) -> bytes:
            if path == self.gap_path:
                return b"raise RuntimeError('unreviewed code executed')\n"
            return reader(path)

        with (
            patch.object(Path, "read_bytes", changed),
            patch.object(ROTATION, "_GAP", None),
            self.assertRaisesRegex(ValueError, "byte pin"),
        ):
            ROTATION.gap_module()


if __name__ == "__main__":
    unittest.main()
