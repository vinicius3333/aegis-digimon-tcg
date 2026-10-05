"""Synthetic gap admission/consumer tests; no remote, games, Torch or actual proof."""

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
OPERATOR = Path(__file__).with_name("material-teacher-gap-learning.py")
SPEC = importlib.util.spec_from_file_location("gap_admission", OPERATOR)
assert SPEC is not None and SPEC.loader is not None
GAP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GAP)
BASE = OPERATOR.with_name("material-teacher-learning.py")
EFFECT = OPERATOR.with_name("material-teacher-effect-learning.py")
EXPANSIONS = [{"games": 880, "seed": 6000000 + 880 * i} for i in range(4)]
SEEDS = {"comparison": 6135000, "contexts": 6202500, "diagnostic": 6202400, "ppo": 6145000}
ORIGINAL_PHASES = ("diagnostic", "contexts", "contexts-1", "contexts-2")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pins(index: int) -> dict[str, str]:
    return {"identitySha256": f"{index:x}" * 64, "completionSha256": f"{index + 8:x}" * 64}


class GapAdmissionTests(unittest.TestCase):
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
        self.base_request = self.transfers / "material-teacher-learning-r2-request.json"
        self.base_request.write_text('{"synthetic":true}\n', encoding="utf-8")
        self.entry = self.transfers / "material-teacher-effect-entry.mjs"
        self.entry.write_text("// synthetic external producer\n", encoding="utf-8")
        self.policy = self.transfers / "material-teacher-effect-policy.mjs"
        self.policy.write_text("// synthetic policy helper\n", encoding="utf-8")
        self.prior = {
            phase: pins(i) for i, phase in enumerate(["diagnostic", "contexts", *self.expansions()])
        }
        self.effect_request = self.transfers / "material-teacher-effect-request.json"
        self.effect_request.write_text(
            json.dumps(
                {
                    "formatVersion": 1,
                    "baseRequest": {
                        "path": str(self.base_request),
                        "sha256": sha(self.base_request),
                    },
                    "entry": str(self.entry),
                    "expertModules": {
                        str(self.entry): sha(self.entry),
                        str(self.policy): sha(self.policy),
                    },
                    "oldPhases": {p: self.prior[p] for p in ORIGINAL_PHASES},
                }
            ),
            encoding="utf-8",
        )
        self.request = self.transfers / "material-teacher-gap-learning-request.json"
        self.actor = {
            "formatVersion": 1,
            "effectOperator": {"path": str(self.effect_path), "sha256": GAP.EFFECT_SHA},
            "effectRequest": {"path": str(self.effect_request), "sha256": sha(self.effect_request)},
            "oldPhases": copy.deepcopy(self.prior),
            "gap": [{"seed": 6003520, "games": 880}, {"seed": 6004400, "games": 880}],
        }
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
            change = patch.object(GAP, name, value)
            change.start()
            self.addCleanup(change.stop)
        self.effect = GAP.effect_module()
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
        self.real_prior_closed = self.effect_ns["closed_phase"]
        self.effect_ns["closed_phase"] = self.prior_closed
        self.ns = GAP.namespace(self.effect, self.base, self.effect_ns)

    def expansions(self) -> list[str]:
        return [f"contexts-{i + 1}" for i in range(len(EXPANSIONS))]

    def original_context(self) -> dict:
        phases = [
            "diagnostic",
            "contexts",
            *self.expansions(),
            "imitation",
            "ppo",
            "comparison",
        ]
        commands = {}
        for phase in phases:
            commands[phase] = ["python", "collect.py", "--worker", "original.js"]
            commands[phase] += [
                "--seed",
                "1",
                "--games",
                "880",
                "--output",
                str(self.run_path / phase),
            ]
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

    def prior_closed(self, ctx: dict, phase: str, identity: str) -> dict:
        self.calls.append(("prior-closed", ctx, phase, identity))
        if phase in ORIGINAL_PHASES:
            return self.real_prior_closed(ctx, phase, identity)
        return {"completionSha256": self.prior[phase]["completionSha256"]}

    def write_actor(self) -> str:
        self.request.write_text(json.dumps(self.actor), encoding="utf-8")
        return sha(self.request)

    def context(self) -> dict:
        return self.ns["context"](self.request, self.write_actor(), sha(OPERATOR))

    def test_prior_owners_consumed_and_only_declared_blocks_added(self) -> None:
        original_request = copy.deepcopy(self.before["request"])
        ctx = self.context()
        self.assertEqual(
            self.calls[0],
            ("base-context", self.base_request, sha(self.base_request), self.effect.BASE_SHA),
        )
        consumed = [c[2] for c in self.calls if c[0] == "prior-closed"]
        self.assertEqual(consumed, ["contexts-3", "contexts-4"])
        for call in self.calls:
            if call[0] == "prior-closed":
                self.assertIs(call[1], ctx["effectContext"])
            if call[0] == "base-closed":
                self.assertIs(call[1], self.before)
        self.assertEqual(self.before["request"], original_request)
        effect_commands = ctx["effectContext"]["commands"]
        template = effect_commands["contexts-4"]
        self.assertEqual(template[template.index("--worker") + 1], str(self.entry))
        for phase, command in effect_commands.items():
            self.assertEqual(ctx["commands"][phase], command)
        for phase, (seed, games) in GAP.GAP_BLOCKS.items():
            expected = template.copy()
            for option, value in (
                ("--seed", seed),
                ("--games", games),
                ("--output", self.run_path / phase),
            ):
                expected[expected.index(option) + 1] = str(value)
            self.assertEqual(ctx["commands"][phase], expected)
        self.assertEqual(set(ctx["commands"]) - set(effect_commands), set(GAP.GAP_BLOCKS))
        self.assertEqual(ctx["gapPhases"], {*GAP.GAP_BLOCKS, *GAP.LEARNING_PHASES})

    def test_fresh_blocks_keep_original_folds_and_bindings(self) -> None:
        ctx = self.context()
        blocks = {name: (seed, count) for name, seed, count in self.ns["blocks"](ctx["request"])}
        self.assertEqual(blocks["contexts-5"], (6003520, 880))
        self.assertEqual(blocks["contexts-6"], (6004400, 880))
        self.assertTrue(
            all(
                count % 440 == 0
                for name, (_, count) in blocks.items()
                if name.startswith("contexts-")
            )
        )
        self.assertLessEqual(6004400 + 880, 6210000)
        original = self.before["request"]["phaseBindings"]
        for phase in ctx["gapPhases"]:
            self.assertEqual(ctx["request"]["phaseBindings"][phase], GAP.bindings(phase))
            self.assertNotIn(GAP.bindings(phase)["identity"], json.dumps(original))
        for phase in GAP.PRIOR_PHASES:
            self.assertEqual(ctx["request"]["phaseBindings"][phase], original[phase])

    def test_optional_block_absent_unless_declared(self) -> None:
        self.actor["gap"] = self.actor["gap"][:1]
        ctx = self.context()
        self.assertNotIn("contexts-6", ctx["commands"])
        self.assertNotIn("contexts-6", ctx["gapPhases"])
        with self.assertRaisesRegex(ValueError, "Unknown gap"):
            self.ns["go"](ctx, "contexts-6", "1" * 64, idle=True)

    def test_prior_closure_routes_to_actual_owner_and_fails_closed(self) -> None:
        ctx = self.context()
        for phase in GAP.PRIOR_PHASES:
            self.ns["closed_phase"](ctx, phase, self.prior[phase]["identitySha256"])
            owner = [c for c in self.calls if c[0] == "prior-closed"][-1]
            self.assertIs(owner[1], ctx["effectContext"])
            if phase in ORIGINAL_PHASES:
                self.assertIs(self.calls[-1][1], self.before)
            with self.assertRaisesRegex(ValueError, "Wrong prior predecessor"):
                self.ns["closed_phase"](ctx, phase, "a" * 64)
        self.prior["contexts-4"] = {**self.prior["contexts-4"], "completionSha256": "e" * 64}
        with self.assertRaisesRegex(ValueError, "Prior closure changed"):
            self.ns["closed_phase"](ctx, "contexts-4", self.prior["contexts-4"]["identitySha256"])
        with self.assertRaisesRegex(ValueError, "Prior closure changed"):
            self.context()

    def test_prior_or_undeclared_phase_cannot_launch_before_side_effect(self) -> None:
        self.actor["gap"] = self.actor["gap"][:1]
        ctx = self.context()
        with patch.object(self.base.subprocess, "run", side_effect=AssertionError("job started")):
            for phase in [*GAP.PRIOR_PHASES, "contexts-6", "contexts-7", "unknown"]:
                with self.assertRaisesRegex(ValueError, "cannot launch"):
                    self.ns["run"](ctx, phase, "1" * 64, "5" * 64)
        self.assertFalse(self.run_path.exists())

    def test_new_whole_keeps_original_closed_process_guard(self) -> None:
        ctx = self.context()
        identity_path = Path(GAP.bindings("contexts-5")["identity"])
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
            self.ns["whole"](ctx, "contexts-5", sha(identity_path), closed=True)
        self.assertEqual(seen, [({}, sha(OPERATOR))])

    def approval(self, ctx: dict, phase: str, predecessors: list[str]) -> str:
        path = Path(GAP.bindings(phase)["resourceGo"])
        value = {
            "approved": True,
            "phase": phase,
            "operatorSha256": sha(OPERATOR),
            "requestSha256": ctx["requestSha256"],
            "prepareCompletionSha256": "3" * 64,
            "migrationCompletionSha256": "4" * 64,
            "predecessors": {name: self.prior.get(name, pins(7)) for name in predecessors},
        }
        path.write_text(json.dumps(value), encoding="utf-8")
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

    def test_root_go_consumes_prior_owner_then_idle(self) -> None:
        ctx = self.context()
        approval_sha = self.approval(ctx, "contexts-5", ["diagnostic"])
        self.ns["go"](ctx, "contexts-5", approval_sha, idle=True)
        self.assertEqual(self.calls[-2:], [("host",), ("idle",)])
        self.assertIs(self.calls[-3][1], self.before)
        self.assertEqual(self.calls[-3][2], "diagnostic")

    def test_wrong_go_owner_boolean_and_predecessor(self) -> None:
        for key, replacement in (
            ("approved", 1),
            ("operatorSha256", GAP.EFFECT_SHA),
            ("requestSha256", sha(self.effect_request)),
            ("phase", "contexts-4"),
            ("predecessors", {}),
            ("predecessors", {"diagnostic": pins(0), "contexts-4": self.prior["contexts-4"]}),
        ):
            with self.subTest(key=key, replacement=replacement):
                ctx = self.context()
                path = Path(GAP.bindings("contexts-5")["resourceGo"])
                self.approval(ctx, "contexts-5", ["diagnostic"])
                value = json.loads(path.read_text(encoding="utf-8"))
                value[key] = replacement
                path.write_text(json.dumps(value), encoding="utf-8")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-5", sha(path), idle=True)
                self.assertNotIn(("host",), self.calls)

    def test_optional_block_requires_full_first_gap_closure(self) -> None:
        ctx = self.context()
        approval_sha = self.approval(ctx, "contexts-6", ["diagnostic"])
        with self.assertRaisesRegex(ValueError, "Missing/unknown predecessor closure"):
            self.ns["go"](ctx, "contexts-6", approval_sha, idle=True)
        approval_sha = self.approval(ctx, "contexts-6", ["diagnostic", "contexts-5"])
        seen = []

        def closed_whole(ctx: dict, phase: str, identity: str, *, closed: bool) -> None:
            seen.append((phase, identity, closed))
            raise ValueError("synthetic contexts-5 full consumer reached")

        self.ns["whole"] = closed_whole
        with self.assertRaisesRegex(ValueError, "contexts-5 full consumer"):
            self.ns["go"](ctx, "contexts-6", approval_sha, idle=True)
        self.assertEqual(seen, [("contexts-5", pins(7)["identitySha256"], True)])
        self.assertNotIn(("host",), self.calls)

    def test_optional_go_binds_exact_first_gap_identity_and_completion(self) -> None:
        ctx = self.context()
        original_closed = self.ns["closed_phase"]
        bound = {"identitySha256": "a" * 64, "completionSha256": "b" * 64}

        def synthetic_closed(current: dict, phase: str, identity: str) -> dict:
            if phase != "contexts-5":
                return original_closed(current, phase, identity)
            if identity != bound["identitySha256"]:
                raise ValueError("Synthetic first gap identity changed")
            return {"completionSha256": bound["completionSha256"]}

        self.ns["closed_phase"] = synthetic_closed
        path = Path(GAP.bindings("contexts-6")["resourceGo"])
        for key, reason in (
            ("identitySha256", "first gap identity changed"),
            ("completionSha256", "Predecessor changed"),
        ):
            with self.subTest(key=key):
                self.approval(ctx, "contexts-6", ["diagnostic", "contexts-5"])
                approval = json.loads(path.read_text(encoding="utf-8"))
                approval["predecessors"]["contexts-5"] = {**bound, key: "c" * 64}
                path.write_text(json.dumps(approval), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, reason):
                    self.ns["go"](ctx, "contexts-6", sha(path), idle=True)
                self.assertNotIn(("host",), self.calls)
        self.approval(ctx, "contexts-6", ["diagnostic", "contexts-5"])
        approval = json.loads(path.read_text(encoding="utf-8"))
        approval["predecessors"]["contexts-5"] = bound
        path.write_text(json.dumps(approval), encoding="utf-8")
        self.ns["go"](ctx, "contexts-6", sha(path), idle=True)
        self.assertEqual(self.calls[-2:], [("host",), ("idle",)])

    def test_imitation_must_consume_original_prefix_through_gap(self) -> None:
        ctx = self.context()
        prefix = ["diagnostic", "contexts", *self.expansions()]
        approval_sha = self.approval(ctx, "imitation", prefix)
        with self.assertRaisesRegex(ValueError, "closed gap prefix"):
            self.ns["go"](ctx, "imitation", approval_sha, idle=False)
        approval_sha = self.approval(ctx, "imitation", [*prefix[:-1], "contexts-5"])
        with self.assertRaisesRegex(ValueError, "closed original prefix"):
            self.ns["go"](ctx, "imitation", approval_sha, idle=False)
        approval_sha = self.approval(ctx, "imitation", [*prefix, "contexts-5"])
        seen = []

        def closed_whole(ctx: dict, phase: str, identity: str, *, closed: bool) -> None:
            seen.append(phase)
            raise ValueError("synthetic gap closure reached")

        self.ns["whole"] = closed_whole
        with self.assertRaisesRegex(ValueError, "gap closure reached"):
            self.ns["go"](ctx, "imitation", approval_sha, idle=False)
        self.assertEqual(seen, ["contexts-5"])

    def test_corpus_never_relaxes_families_seats_folds_or_visibility(self) -> None:
        ctx = self.context()
        families = ("dnaDigivolve", "effectDigiXrosMaterial")
        complete = {f"{family}:seat{seat}": 1 for family in families for seat in (0, 1)}
        cards = [f"BT26-{i:03}" for i in range(1, 105)] + [f"EX13-{i:03}" for i in range(1, 78)]
        reports = {
            name: {
                "games": 880,
                "coverage": {
                    "nontrivialSupervisedLabelsByFold": {"training": {}, "validation": {}}
                },
                "visibleSupervisedSetCardsByFold": {"training": [], "validation": []},
            }
            for name in ["diagnostic", "contexts", *self.expansions(), "contexts-5"]
        }
        reports["contexts"]["coverage"]["nontrivialSupervisedLabelsByFold"] = {
            "training": complete,
            "validation": {**complete, "effectDigiXrosMaterial:seat1": 0},
        }
        reports["contexts"]["visibleSupervisedSetCardsByFold"]["validation"] = cards
        self.ns["collection"] = lambda ctx, name: reports[name]
        self.ns["load"] = lambda path, expected: SimpleNamespace(MECHANISMS=families)
        with self.assertRaisesRegex(ValueError, "Missing raw eight-family"):
            self.ns["corpus"](ctx, list(reports), create=False)
        reports["contexts-5"]["coverage"]["nontrivialSupervisedLabelsByFold"]["validation"] = {
            "effectDigiXrosMaterial:seat1": 1
        }
        reports["contexts-5"]["visibleSupervisedSetCardsByFold"]["training"] = cards[:-1]
        with self.assertRaisesRegex(ValueError, "never borrow validation"):
            self.ns["corpus"](ctx, list(reports), create=False)
        self.assertFalse((self.run_path / "corpus").exists())

    def test_hostile_gap_request_shapes_and_pins(self) -> None:
        blocks = self.actor["gap"]
        cases = [
            {"formatVersion": True},
            {"formatVersion": 2},
            {"extra": True},
            {"oldPhases": {p: self.prior[p] for p in ORIGINAL_PHASES}},
            {"oldPhases": {**self.prior, "contexts-4": {"identitySha256": True}}},
            {"effectOperator": {"path": str(self.effect_path), "sha256": "0" * 64}},
            {"effectRequest": {"path": str(self.base_request), "sha256": sha(self.effect_request)}},
            {"gap": []},
            {"gap": [*blocks, {"seed": 6005280, "games": 880}]},
            {"gap": blocks[1:]},
            {"gap": [{"seed": 6003520, "games": 440}]},
            {"gap": [{"seed": 6002640, "games": 880}]},
            {"gap": [{"seed": 6210000, "games": 880}]},
            {"gap": [{"seed": 6003520, "games": True}]},
            {"gap": [{"seed": 6003520.0, "games": 880}]},
            {"gap": [{"seed": 6003520, "games": 880, "worker": "other.mjs"}]},
            {"gap": {"contexts-5": blocks[0]}},
        ]
        for changes in cases:
            with self.subTest(changes=changes):
                original = self.actor
                self.actor = {**copy.deepcopy(original), **changes}
                with self.assertRaises(ValueError):
                    GAP.envelope(self.effect, self.base, self.request, self.write_actor())
                self.actor = original

    def test_prior_pins_must_equal_effect_request_and_modules(self) -> None:
        self.actor["oldPhases"]["contexts-2"] = pins(7)
        with self.assertRaisesRegex(ValueError, "differ from the effect request"):
            self.context()
        self.actor["oldPhases"] = copy.deepcopy(self.prior)
        with (
            patch.object(GAP, "POLICY_SHA", "0" * 64),
            self.assertRaisesRegex(ValueError, "entry and policy"),
        ):
            self.context()

    def test_duplicate_keys_nonfinite_and_symlinks(self) -> None:
        for text in ('{"formatVersion":1,"formatVersion":1}', '{"formatVersion":NaN}'):
            self.request.write_text(text, encoding="utf-8")
            with self.assertRaises(ValueError):
                GAP.envelope(self.effect, self.base, self.request, sha(self.request))
        self.write_actor()
        linked = self.lab / "linked"
        linked.symlink_to(self.transfers, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlink"):
            GAP.envelope(self.effect, self.base, linked / self.request.name, sha(self.request))
        with self.assertRaisesRegex(ValueError, "symlink"):
            GAP.sealed_source(linked / self.effect_path.name, GAP.EFFECT_SHA)

    def test_changed_inputs_rejected_before_and_after_go(self) -> None:
        for path in (self.policy, self.effect_request, self.effect_path, self.base_request):
            with self.subTest(path=path.name):
                ctx = self.context()
                approval_sha = self.approval(ctx, "contexts-5", ["diagnostic"])
                saved = path.read_bytes()
                path.write_bytes(saved + b"\n")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-5", approval_sha, idle=True)
                self.assertNotIn(("host",), self.calls)
                path.write_bytes(saved)
                ctx["runtime"].host = lambda path=path, saved=saved: path.write_bytes(saved + b"#")
                with self.assertRaises(ValueError):
                    self.ns["go"](ctx, "contexts-5", approval_sha, idle=True)
                path.write_bytes(saved)

    def test_local_runtime_override_cannot_admit_production(self) -> None:
        for value in ("", str(self.lab)):
            with (
                self.subTest(value=value),
                patch.dict(os.environ, {"AEGIS_QUALIFIED_ROOT": value}),
                self.assertRaisesRegex(ValueError, "runtime override"),
            ):
                self.context()

    def test_tensor_subprocess_calls_gap_adapter(self) -> None:
        ctx = self.context()
        argv = self.ns["tensor_command"](ctx, "imitation", "1" * 64, "5" * 64)
        self.assertEqual(argv[1], str(OPERATOR))
        self.assertEqual(argv[argv.index("--request") + 1], str(self.request))
        self.assertEqual(argv[argv.index("--operator-sha256") + 1], sha(OPERATOR))

    def test_public_consumer_api_and_prior_source_mutation(self) -> None:
        api = GAP.api()
        for name in ("context", "closed_phase", "scope", "natural", "phase_path", "data_outputs"):
            self.assertTrue(callable(getattr(GAP, name)))
            self.assertTrue(callable(api[name]))
        self.effect_path.write_text("# mutated\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "pin changed"):
            GAP.api()

    def test_executed_and_parsed_sources_are_the_hashed_buffers(self) -> None:
        reader = Path.read_bytes

        def changed(path: Path) -> bytes:
            if path in (self.effect_path, self.base_path):
                return b"raise RuntimeError('unreviewed code executed')\n"
            return reader(path)

        with patch.object(Path, "read_bytes", changed):
            with patch.object(GAP, "_EFFECT", None), self.assertRaisesRegex(ValueError, "byte pin"):
                GAP.effect_module()
            with self.assertRaisesRegex(ValueError, "byte pin"):
                GAP.namespace(self.effect, self.base, self.effect_ns)


if __name__ == "__main__":
    unittest.main()
