"""Bounded synthetic admission guards; no games, model imports or runtime admission."""

import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

OPERATOR = Path(__file__).with_name("material-teacher-learning.py")
spec = importlib.util.spec_from_file_location("material_teacher_learning", OPERATOR)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
SOURCE = OPERATOR.parent.parent
REFERENCES = Path("/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training")
GLOBAL = REFERENCES / "2026-10-04-bt26-ex13-v19b-global-completed-thin-proof/global/operator.py"
HELPER = Path("/tmp/aegis-v27-fresh-curriculum-comparison.py")


class LearningGuards(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.checkout = self.root / "checkout"
        self.source = self.checkout / "tools/bot-training"
        self.source.mkdir(parents=True)
        for name in ("prepare_learning.py", "learning_mechanisms.py", "bridge.py"):
            (self.source / name).write_bytes((SOURCE / name).read_bytes())
        decks = [{"version": f"recipe-{i}", "sha256": "a" * 64} for i in range(44)]
        self.cards = [f"BT26-{i:03}" for i in range(1, 105)] + [
            f"EX13-{i:03}" for i in range(1, 78)
        ]
        self.metadata = {
            "engineSha256": "b" * 64,
            "cardIds": [*self.cards, *[f"other-{i}" for i in range(298)]],
            "decks": decks[:26],
        }
        self.curriculum = {"engineSha256": "b" * 64, "decks": decks}
        self.bindings = {
            label: {"path": str(self.root / (label + ".pt")), "sha256": "c" * 64}
            for label in module.LABELS
        }
        self.request = {
            "formatVersion": 1,
            "futureRun": str(module.LAB / "runs/material-teacher-learning-fixture"),
            "seeds": {
                "diagnostic": 6202400,
                "contexts": 6202500,
                "ppo": 6145000,
                "comparison": 6135000,
            },
            "contextExpansions": [],
            "imitationSeed": 8261,
        }
        self.ctx = {
            "request": self.request,
            "run": self.root / "run",
            "checkout": self.checkout,
            "metadata": self.metadata,
            "curriculum": self.curriculum,
            "migrated": {"checkpointBindings": self.bindings},
            "runtimeContext": {
                "manifest": {
                    "files": {
                        "tools/bot-training/bridge.py": module.digest(self.source / "bridge.py")
                    }
                }
            },
        }
        self.ctx["operatorSha256"] = "f" * 64
        self.ctx["run"].mkdir()
        self.ctx["commands"] = module.command_plan(self.checkout, self.bindings, self.request)

    def put(self, path, value):
        path.write_text(json.dumps(value), encoding="utf-8")

    def collect_fixture(self, name="contexts", games=436, seed=6202500):
        directory = self.ctx["run"] / name
        directory.mkdir()
        argv = self.ctx["commands"]["contexts"].copy()
        for flag, value in (("--output", directory), ("--games", games), ("--seed", seed)):
            argv[argv.index(flag) + 1] = str(value)
        self.ctx["commands"][name] = argv
        config = {
            "metadata": self.metadata,
            "curriculum": self.curriculum,
            "featureVersion": 7,
            "seed": seed,
            "games": games,
            "workers": 4,
            "learnerDriver": "teacher",
            "device": None,
            "sourceCheckpoint": None,
        }
        self.put(directory / "config.json", config)
        rows = []
        intents = [
            {"type": "linkCard"},
            {"type": "dnaDigivolve"},
            {"type": "appFusion"},
            {"type": "playCard", "assembly": {"materialIds": ["x"]}},
            {
                "type": "respondDecision",
                "decisionId": "assembly",
                "response": {"kind": "selectCards", "instanceIds": ["x"]},
            },
            {"type": "respondDecision", "response": {"kind": "selectCards", "instanceIds": ["x"]}},
            {"type": "playCard", "digiXros": {"materialIds": ["x"]}},
            {"type": "respondDecision", "response": {"kind": "selectCards", "instanceIds": ["x"]}},
        ]
        for index in range(games):
            decks, seat = module.scheduled(self.ctx, index)
            pins = [{"version": version, "sha256": "a" * 64} for version in decks]
            family = index % 8
            window = {
                "type": "decision",
                "role": "learner",
                "kind": "selectCards",
                "selected": [],
                "observation": {"seat": seat, "cards": [{"cardId": card} for card in self.cards]},
                "teacher": {"action": 1},
                "actions": [{"intent": {"type": "endPhase"}}, {"intent": intents[family]}],
            }
            if family in (5, 7):
                window["request"] = {
                    "options": {"assemblyCardId" if family == 5 else "digiXrosCardId": "target"}
                }
            decision = {
                "window": window,
                "action": 1,
                "executedAction": 1,
                "driver": "teacher",
                "supervised": True,
            }
            (directory / f"episode-{index:05d}.jsonl").write_text(
                json.dumps(decision) + "\n" + json.dumps(decision) + "\n", encoding="utf-8"
            )
            rows.append(
                {
                    "index": index,
                    "complete": True,
                    "decisions": 2,
                    "unavailable": 0,
                    "teacherAgreements": 2,
                    "config": {
                        "seed": seed + index,
                        "decks": decks,
                        "deckPins": pins,
                        "learnerSeat": seat,
                        "teacher": True,
                        "maxDecisions": 4000,
                        "turnLimit": 60,
                        "engineSha256": "b" * 64,
                    },
                    "result": {
                        "type": "result",
                        "terminated": True,
                        "truncated": False,
                        "reason": "security",
                        "winnerSeat": seat,
                        "seed": seed + index,
                        "learnerSeat": seat,
                        "decisions": 2,
                        "errors": [],
                        "rejections": [],
                        "asyncRejections": [],
                    },
                }
            )
        self.put(directory / "results.json", rows)
        return directory

    def test_exact_original_commands_keep_teacher_and_current_cuda_separate(self):
        commands = self.ctx["commands"]
        self.assertNotIn("--checkpoint", commands["contexts"])
        self.assertNotIn("--device", commands["contexts"])
        self.assertEqual(
            commands["diagnostic"][commands["diagnostic"].index("--device") + 1], "cuda"
        )
        self.assertIn(self.bindings["challenger"]["path"], commands["diagnostic"])
        self.assertEqual(
            commands["imitation"][commands["imitation"].index("--dataset") + 1],
            self.request["futureRun"] + "/corpus",
        )
        self.assertEqual(len([k for k in commands if k.startswith("comparison-")]), 5)
        for key, command in commands.items():
            self.assertNotIn("--stream-evaluation", command)
            self.assertNotIn("--allow-runtime-change", command)
            if key.startswith("comparison") or key == "ppo":
                self.assertEqual(command[command.index("--max-failures") + 1], "0")
                self.assertEqual(command[command.index("--max-decisions") + 1], "4000")

    def test_fresh_blocks_reject_final_overlap_and_fold_changing_expansion(self):
        self.assertEqual(len(module.blocks(self.request)), 4)
        for mutation in ({"diagnostic": 6210000}, {"ppo": 6202500}):
            request = copy.deepcopy(self.request)
            request["seeds"].update(mutation)
            with self.assertRaises(ValueError):
                module.blocks(request)
        request = copy.deepcopy(self.request)
        request["contextExpansions"] = [{"seed": 6120000, "games": 439}]
        with self.assertRaises(ValueError):
            module.blocks(request)

    def test_unknown_runtime_pins_fail_before_sealed_import(self):
        request = copy.deepcopy(self.request)
        request["runtime"] = {"requestSha256": None}
        path = self.root / "request.json"
        self.put(path, request)
        with patch.object(module, "load") as loader, self.assertRaises(ValueError):
            module.context(path, module.digest(path), module.digest(OPERATOR))
        loader.assert_not_called()

    def test_wrong_frozen_source_rejects_before_runtime_closure(self):
        runtime_fields = {
            k: "d" * 64
            for k in (
                "requestSha256",
                "prepareIdentitySha256",
                "migrationIdentitySha256",
                "prepareCompletionSha256",
                "migrationCompletionSha256",
                "engineSha256",
            )
        }
        runtime_fields.update(
            operatorSha256=module.REVIEWED_RUNTIME_SHA,
            operator=str(module.RUNTIME_READER),
            request="/fixture/request.json",
        )
        request = {**self.request, "runtime": runtime_fields}
        path = self.root / "request.json"
        self.put(path, request)
        runtime = SimpleNamespace(
            context=Mock(
                return_value={
                    "request": {
                        "source": {
                            "commit": "0" * 40,
                            "archive": {"sha256": module.ARCHIVE_SHA},
                            "manifest": {"sha256": module.MANIFEST_SHA},
                        }
                    }
                }
            ),
            closed_prepare=Mock(),
        )
        with (
            patch.object(module, "load", return_value=runtime),
            self.assertRaisesRegex(ValueError, "Frozen"),
        ):
            module.context(path, module.digest(path), module.digest(OPERATOR))
        runtime.closed_prepare.assert_not_called()

    def test_scope_rejects_missing_recipe_and_identity(self):
        module.scope(self.metadata, self.curriculum, "b" * 64)
        bad = copy.deepcopy(self.metadata)
        bad["cardIds"][0] = "unknown"
        with self.assertRaises(ValueError):
            module.scope(bad, self.curriculum, "b" * 64)
        bad = copy.deepcopy(self.curriculum)
        bad["decks"].pop()
        with self.assertRaises(ValueError):
            module.scope(self.metadata, bad, "b" * 64)

    def test_actual_closed_runtime_and_four_checkpoint_bindings_are_required(self):
        runtime_fields = {
            k: "d" * 64
            for k in (
                "requestSha256",
                "prepareIdentitySha256",
                "migrationIdentitySha256",
                "prepareCompletionSha256",
                "migrationCompletionSha256",
            )
        }
        runtime_fields.update(
            engineSha256="b" * 64,
            operatorSha256=module.REVIEWED_RUNTIME_SHA,
            operator=str(module.RUNTIME_READER),
            request="/fixture/request.json",
        )
        request = {
            **self.request,
            "runtime": runtime_fields,
            "checkpointBindings": {label: self.bindings[label] for label in module.LABELS[:3]},
        }
        path = self.root / "request.json"
        prepared = {
            "completionSha256": "d" * 64,
            "sourceCommit": module.SOURCE,
            "engineSha256": "b" * 64,
            "cpuRuntimeQualified": True,
        }
        migrated = {
            "completionSha256": "d" * 64,
            "sourceCommit": module.SOURCE,
            "engineSha256": "b" * 64,
            "actualLearningUpdates": 0,
            "acceptedStrengthOrMastery": False,
            "checkpointBindings": self.bindings,
        }
        runtime = SimpleNamespace(
            context=Mock(
                return_value={
                    "request": {
                        "source": {
                            "commit": module.SOURCE,
                            "archive": {"sha256": module.ARCHIVE_SHA},
                            "manifest": {"sha256": module.MANIFEST_SHA},
                        }
                    }
                }
            ),
            closed_prepare=Mock(return_value=prepared),
            closed_migration=Mock(return_value=migrated),
        )
        self.put(path, request)
        with (
            patch.object(module, "load", return_value=runtime),
            self.assertRaisesRegex(ValueError, "four"),
        ):
            module.context(path, module.digest(path), module.digest(OPERATOR))
        request["checkpointBindings"] = self.bindings
        migrated["completionSha256"] = "e" * 64
        self.put(path, request)
        with (
            patch.object(module, "load", return_value=runtime),
            self.assertRaisesRegex(ValueError, "closure"),
        ):
            module.context(path, module.digest(path), module.digest(OPERATOR))

    def test_root_approval_requires_actual_closures_and_exact_phase(self):
        path = self.root / "go.json"
        self.ctx.update(
            prepared={"completionSha256": "a" * 64},
            migrated={"completionSha256": "b" * 64},
            requestSha256="c" * 64,
        )
        self.ctx["request"]["phaseBindings"] = {"diagnostic": {"resourceGo": str(path)}}
        self.ctx["runtimeContext"]["v50"] = SimpleNamespace(same=lambda a, b: a == b)
        approval = {
            "approved": True,
            "phase": "diagnostic",
            "operatorSha256": self.ctx["operatorSha256"],
            "requestSha256": "c" * 64,
            "prepareCompletionSha256": "a" * 64,
            "migrationCompletionSha256": "b" * 64,
            "predecessors": {},
        }
        self.put(path, approval)
        module.go(self.ctx, "diagnostic", module.digest(path), idle=False)
        for change in (
            {"approved": False},
            {"phase": "contexts"},
            {"migrationCompletionSha256": None},
        ):
            self.put(path, {**approval, **change})
            with self.assertRaises(ValueError):
                module.go(self.ctx, "diagnostic", module.digest(path), idle=False)

    def test_raw_coverage_is_both_seat_original_fold_and_rejects_forged_positive(self):
        directory = self.collect_fixture()
        report = module.collection(self.ctx, "contexts")
        self.assertTrue(report["coverage"]["allMechanismsBothSeatsBothFolds"])
        path = directory / "episode-00000.jsonl"
        row = json.loads(path.read_text(encoding="utf-8").splitlines()[0])
        row["window"]["teacher"]["action"] = None
        path.write_text(json.dumps(row) + "\n" + json.dumps(row) + "\n", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "fallback"):
            module.collection(self.ctx, "contexts")

    def test_teacher_driver_and_terminal_failures_are_not_coverage(self):
        directory = self.collect_fixture()
        config = module.read(directory / "config.json")
        config["learnerDriver"] = "greedy-checkpoint"
        self.put(directory / "config.json", config)
        with self.assertRaises(ValueError):
            module.collection(self.ctx, "contexts")
        terminal = {
            "type": "result",
            "terminated": True,
            "truncated": False,
            "reason": "security",
            "winnerSeat": 0,
            "decisions": 3,
            "errors": [],
            "rejections": [],
            "asyncRejections": [],
        }
        for change in (
            {"trainingForfeit": {}},
            {"decisions": 4000},
            {"truncated": True},
            {"errors": ["bad"]},
        ):
            with self.assertRaises(ValueError):
                module.natural({**terminal, **change})

    def test_real_shard_union_preserves_each_original_fold(self):
        self.collect_fixture()
        self.collect_fixture("contexts-1", 440, 6120000)
        report = module.corpus(self.ctx, ["contexts", "contexts-1"], create=True)
        self.assertTrue(report["allMechanismsBothSeatsBothFolds"])
        source = self.ctx["run"] / "contexts-1/episode-00000.jsonl"
        target = self.ctx["run"] / "corpus/episode-00440.jsonl"
        self.assertEqual(module.digest(source), module.digest(target))
        provenance = report["originalProducerEpisodeProvenance"][436]
        self.assertEqual(provenance["originalIndex"], 0)
        self.assertEqual(provenance["originalFold"], "validation")
        self.assertFalse(report["physicalExecutionOrStrengthEstablished"])

    def test_gaps_stop_before_model_import_or_corpus_mutation(self):
        self.collect_fixture()
        actual = module.collection(self.ctx, "contexts")
        actual["coverage"]["nontrivialSupervisedLabelsByFold"]["training"].pop("dnaDigivolve:seat1")
        with patch.object(module, "collection", return_value=actual), self.assertRaises(ValueError):
            module.corpus(self.ctx, ["contexts"], create=True)
        self.assertFalse((self.ctx["run"] / "corpus").exists())
        self.assertNotIn("torch", sys.modules)

    def test_optional_expansions_require_closed_prefix_and_no_validation_borrow(self):
        self.ctx["request"]["contextExpansions"] = [
            {"seed": 6120000, "games": 440},
            {"seed": 6121000, "games": 440},
        ]
        module.predecessors(self.ctx, "imitation", {"diagnostic", "contexts"})
        module.predecessors(self.ctx, "imitation", {"diagnostic", "contexts", "contexts-1"})
        with self.assertRaises(ValueError):
            module.predecessors(self.ctx, "imitation", {"diagnostic", "contexts", "contexts-2"})
        self.collect_fixture()
        actual = module.collection(self.ctx, "contexts")
        actual["visibleSupervisedSetCardsByFold"]["training"].pop()
        with (
            patch.object(module, "collection", return_value=actual),
            self.assertRaisesRegex(ValueError, "borrow"),
        ):
            module.corpus(self.ctx, ["contexts"], create=True)

    def test_live_or_failed_whole_cannot_read_completion_or_launch_successor(self):
        self.ctx["request"]["phaseBindings"] = {
            "ppo": {"identity": str(self.root / "identity.json")}
        }
        path = self.root / "identity.json"
        self.put(path, {})
        reject = Mock(side_effect=ValueError("Whole live/failed"))
        self.ctx["runtime"] = SimpleNamespace(
            V50_PATH=Path("/fixture"),
            V50_SHA="e" * 64,
            extract=Mock(return_value={"verify_whole": reject}),
        )
        self.ctx["runtimeContext"]["v50"] = SimpleNamespace()
        with (
            patch.object(module, "read", wraps=module.read) as reader,
            self.assertRaises(ValueError),
        ):
            module.closed_phase(self.ctx, "ppo", module.digest(path))
        self.assertEqual(reader.call_count, 1)  # Identity only; no active map/results.
        with (
            patch.object(module, "whole", side_effect=ValueError("No wrapper")),
            patch.object(module.subprocess, "run") as child,
            self.assertRaises(ValueError),
        ):
            module.run(self.ctx, "ppo", None, None)
        child.assert_not_called()

    def test_original_record_consumer_changes_only_declared_expected_selectors(self):
        self.assertTrue(
            GLOBAL.is_file() and HELPER.is_file(), "Pinned reference fixtures required on this host"
        )
        with patch.object(module, "GLOBAL", GLOBAL):
            evaluation = module.record_guard(self.ctx, "comparison-candidate")
            training = module.record_guard(self.ctx, "ppo")
        self.assertEqual(len(evaluation["declaredEdits"]), 5)
        self.assertEqual(len(training["declaredEdits"]), 10)
        self.assertIn("expected_payment_forfeit", training)
        helper = module.definitions(
            HELPER,
            module.HELPER_SHA,
            {"inventory_seeds"},
            {
                "Any": object,
                "Path": Path,
                "LAB": self.root,
                "RUN": self.ctx["run"],
                "SEED": 100,
                "GAMES": 88,
                "read": module.read,
                "digest": module.digest,
                "re": module.re,
            },
        )
        (self.root / "runs").mkdir()
        (self.root / "validations").mkdir()
        self.put(self.root / "runs/config.json", {"seed": 120, "games": 2})
        with self.assertRaises(AssertionError):
            helper["inventory_seeds"]()


if __name__ == "__main__":
    unittest.main()
