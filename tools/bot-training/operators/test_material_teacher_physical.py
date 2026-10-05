"""Synthetic source guards only: no actual models, games, GPU or qualification."""

import copy
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


def module_at(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


DIRECTORY = Path(__file__).parent
operator = module_at("physical_under_test", DIRECTORY / "material-teacher-physical.py")
learning = module_at("learning_under_test", DIRECTORY / "material-teacher-learning.py")
v50 = module_at("v50_under_test", DIRECTORY / "aegis-v50-integrated-runtime-qualification.py")
ARTIFACTS = Path("/Users/viniciusluiz/aegis-bot-chronomon/artifacts/bot-training")
INPUTS = {
    "capture": "2026-10-04-bt26-ex13-v19b-cold-comparison/operator.py",
    "reader": "2026-10-04-bt26-ex13-v20-neural-winner-dataset/source-reader.py",
    "schedule": "2026-10-04-bt26-ex13-v28-physical-independent-review/aegis-v27-fresh-physical-schedule.py",
    "physical": "2026-10-05-bt26-ex13-v42-preparation/aegis-v42-corrective-physical-comparison.py",
    "custody": "2026-10-05-bt26-ex13-v44-current-material-custody-independent-review/aegis-v44-current-material-custody.py",
    "extractor": "2026-10-05-bt26-ex13-v44-current-material-custody-independent-review/aegis-v44-material-witness-extractor.py",
}
HASH = "a" * 64


class PhysicalGuards(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name).resolve()
        self.lab = self.root / "lab"
        (self.lab / "runs").mkdir(parents=True)
        (self.lab / "transfers").mkdir()
        self.addCleanup(patch.stopall)
        patch.object(operator, "LAB", self.lab).start()
        self.run = self.lab / "runs/material-teacher-physical-synthetic"
        self.identity = self.lab / "transfers/material-teacher-physical-identity.json"
        self.approval = self.lab / "transfers/material-teacher-physical-go.json"
        self.request = {
            "formatVersion": 1,
            "candidateMode": "trained-ppo",
            "runtimeReaderSha256": operator.RUNTIME_SHA,
            "learning": {
                "operator": str(self.lab / "transfers/learning.py"),
                "request": str(self.lab / "transfers/request.json"),
                "operatorSha256": HASH,
                "requestSha256": HASH,
                "identitySha256": HASH,
                "completionSha256": HASH,
                "reportSha256": HASH,
                "checkpointPath": str(self.lab / "runs/learning/ppo/checkpoint.pt"),
                "checkpointSha256": HASH,
            },
            "engineSha256": HASH,
            "prepareCompletionSha256": HASH,
            "migrationCompletionSha256": HASH,
            "run": str(self.run),
            "identity": str(self.identity),
            "resourceGo": str(self.approval),
            "blocks": [
                {
                    "seed": 10000,
                    "games": 440,
                    "inventory": str(self.lab / "transfers/inventory.json"),
                    "inventorySha256": HASH,
                }
            ],
        }
        self.ctx = {
            "request": self.request,
            "operatorSha256": HASH,
            "requestSha256": HASH,
            "run": self.run,
            "learned": {"completionSha256": HASH},
            "candidate": {"sha256": HASH},
            "learningContext": {
                "runtimeContext": {"v50": SimpleNamespace(same=v50.same)},
            },
        }

    def put(self, path: Path, value) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value), encoding="utf-8")
        return operator.digest(path)

    def originals(self):
        originals = dict(operator.ORIGINALS)
        for name, relative in INPUTS.items():
            path = ARTIFACTS / relative
            operator.pin(path, originals[name][1])
            originals[name] = (path, originals[name][1])
        return patch.object(operator, "ORIGINALS", originals)

    def approval_record(self):
        return {
            "approved": True,
            "phase": "physical",
            "operatorSha256": HASH,
            "requestSha256": HASH,
            "identitySha256": HASH,
            "ppoCompletionSha256": HASH,
            "checkpointSha256": HASH,
            "engineSha256": HASH,
            "prepareCompletionSha256": HASH,
            "migrationCompletionSha256": HASH,
            "blocks": self.request["blocks"],
        }

    def test_missing_future_pins_final_reused_and_overlapping_blocks_reject(self) -> None:
        operator.request_fields(self.request)
        variants = []
        for key in ("operatorSha256", "identitySha256", "completionSha256", "checkpointSha256"):
            d = copy.deepcopy(self.request)
            d["learning"][key] = None
            variants.append(d)
        for seed in (6210000, 6153000):
            d = copy.deepcopy(self.request)
            d["blocks"][0]["seed"] = seed
            variants.append(d)
        d = copy.deepcopy(self.request)
        d["blocks"].append(copy.deepcopy(d["blocks"][0]))
        variants.append(d)
        for d in variants:
            with self.subTest(request=d), self.assertRaises(ValueError):
                operator.request_fields(d)

    def test_unknown_request_refuses_before_loading_learning_or_models(self) -> None:
        d = copy.deepcopy(self.request)
        d["learning"]["completionSha256"] = None
        with (
            patch.object(operator, "pin"),
            patch.object(operator, "read", return_value=d),
            patch.object(operator, "load") as loader,
        ):
            with self.assertRaises(ValueError):
                operator.context(self.root / "request.json", HASH, HASH)
            loader.assert_not_called()
        self.assertNotIn("torch", sys.modules)

    def test_root_go_rejects_wrong_binding_and_integer_approval(self) -> None:
        expected = self.approval_record()
        digest = self.put(self.approval, expected)
        operator.go(self.ctx, HASH, digest, idle=False)
        for field, value in (
            ("approved", 1),
            ("checkpointSha256", "b" * 64),
            ("identitySha256", "b" * 64),
            ("phase", "rooms"),
        ):
            d = copy.deepcopy(expected)
            d[field] = value
            digest = self.put(self.approval, d)
            with self.subTest(field=field), self.assertRaises(ValueError):
                operator.go(self.ctx, HASH, digest, idle=False)

    def test_failed_or_live_whole_cannot_start_child_or_read_completed_outputs(self) -> None:
        with (
            patch.object(operator, "whole", side_effect=ValueError("Whole is not closed")),
            patch.object(operator.subprocess, "run") as child,
            patch.object(operator, "read") as reader,
        ):
            with self.assertRaises(ValueError):
                operator.run(self.ctx, HASH, HASH)
            with self.assertRaises(ValueError):
                operator.closed(self.ctx, HASH)
            child.assert_not_called()
            reader.assert_not_called()
        self.assertFalse(self.run.exists())

    def test_changed_model_finite_update_and_checkpoint_bindings_reject(self) -> None:
        path = Path(self.request["learning"]["checkpointPath"])
        path.parent.mkdir(parents=True)
        path.write_bytes(b"Synthetic plain text; never a model")
        checkpoint_sha = operator.digest(path)
        self.request["learning"]["checkpointSha256"] = checkpoint_sha
        prepared = {"sourceCommit": operator.SOURCE, "engineSha256": HASH, "completionSha256": HASH}
        migrated = copy.deepcopy(prepared)
        lc = {"prepared": prepared, "migrated": migrated, "run": path.parent.parent}
        ctx = {"request": self.request, "learningContext": lc}
        learned = {
            "identitySha256": HASH,
            "completionSha256": HASH,
            "reportSha256": HASH,
            "sourceCommit": operator.SOURCE,
            "engineSha256": HASH,
            "preparedBindings": prepared,
            "migrationBindings": migrated,
            "finiteChangedActualLearningVerified": True,
            "actualLearningUpdates": 10,
            "selectedLearningUpdates": 10,
            "acceptedStrengthOrMastery": False,
            "checkpointPath": str(path),
            "checkpointSha256": checkpoint_sha,
        }
        self.assertEqual(operator.candidate_binding(ctx, learned)["sha256"], checkpoint_sha)
        for field, value in (
            ("finiteChangedActualLearningVerified", 1),
            ("actualLearningUpdates", 0),
            ("actualLearningUpdates", True),
            ("selectedLearningUpdates", 9),
            ("engineSha256", "b" * 64),
            ("checkpointSha256", "b" * 64),
        ):
            bad = copy.deepcopy(learned)
            bad[field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                operator.candidate_binding(ctx, bad)
        path.write_bytes(b"Changed synthetic fixture bytes")
        with self.assertRaises(ValueError):
            operator.candidate_binding(ctx, learned)

    def test_original_schedule_is_all44_both_seats_plus_both_fusion_recipes(self) -> None:
        versions = [f"recipe-{i}" for i in range(42)] + [
            "curriculum-appmon-charismon@1",
            "curriculum-appmon-mienumon@1",
        ]
        curriculum = {
            "engineSha256": HASH,
            "decks": [{"version": name, "sha256": HASH} for name in versions],
        }
        with self.originals():
            rows = operator.schedule(curriculum, HASH, 10000)
        self.assertEqual(len(rows), 440)
        self.assertEqual(len({r["config"]["seed"] for r in rows}), 440)
        self.assertEqual({r["config"]["learnerSeat"] for r in rows}, {0, 1})
        self.assertTrue(
            all(r["teacherSeenSeed"] is False and r["config"]["teacher"] is False for r in rows)
        )

    def test_visibility_and_uncertified_materials_cannot_fill_physical_gaps(self) -> None:
        physical = {
            "visibleRegisteredSetIdentities": sorted(operator.REGISTERED),
            "missingBothSeatPhysicalWitnesses": ["dnaDigivolve:seat0:fullMaterials"],
        }
        custody = {
            "bySeat": {
                seat: {family + ":certifiedCustody": 1 for family in operator.FAMILIES}
                for seat in ("0", "1")
            }
        }
        result = operator.acceptance(physical, custody)
        self.assertFalse(result["requiredObservedPhysicalAndCustodyScopeComplete"])
        self.assertFalse(result["strengthOrPromotionAccepted"])
        physical["missingBothSeatPhysicalWitnesses"] = []
        custody["bySeat"]["1"]["effectDigiXros:certifiedCustody"] = 0
        result = operator.acceptance(physical, custody)
        self.assertIn("effectDigiXros:seat1:certifiedCustody", result["missingBothSeatWitnesses"])

    def test_original_synthetic_capture_reader_contract_for_each_seat(self) -> None:
        ctx = {"request": self.request, "checkout": self.root}
        for seat in (0, 1):
            sample = {
                "kind": "synthetic-only",
                "teacherSeenSeed": False,
                "config": {
                    "seed": 100 + seat,
                    "learnerSeat": seat,
                    "decks": ["a", "b"],
                    "deckPins": [
                        {"version": "a", "sha256": HASH},
                        {"version": "b", "sha256": HASH},
                    ],
                    "engineSha256": HASH,
                    "teacher": False,
                    "forfeitOnCostRefusal": False,
                    "maxDecisions": 4000,
                    "turnLimit": 60,
                },
            }
            ready = {
                "type": "ready",
                "seed": 100 + seat,
                "learnerSeat": seat,
                "engineSha256": HASH,
                "decks": sample["config"]["deckPins"],
            }
            window = {
                "type": "decision",
                "role": "learner",
                "kind": "main",
                "decisionId": "synthetic",
                "observation": {
                    "seat": seat,
                    "players": [{"seat": seat, "board": []}],
                    "cardId": "BT26-001",
                },
                "actions": [{"intent": {"type": "endTurn"}}],
            }
            terminal = {
                "type": "result",
                "seed": 100 + seat,
                "learnerSeat": seat,
                "decisions": 1,
                "terminated": True,
                "truncated": False,
                "reason": "security",
                "winnerSeat": seat,
                "errors": [],
                "rejections": [],
                "asyncRejections": [],
                "recoveredPlayRejections": 0,
                "opponentRecoveredPlayRejections": 0,
            }

            class SyntheticEpisode:
                fixture_messages = (ready, window, terminal)

                def __init__(self, node, worker, config, log):
                    self.messages = iter(self.fixture_messages)
                    self.process = SimpleNamespace(wait=lambda timeout: 0)
                    log.write_text("Synthetic fixture only", encoding="utf-8")

                def __enter__(self):
                    return self

                def __exit__(self, *args):
                    return None

                def receive(self):
                    return next(self.messages)

                def send(self, value):
                    self.sent = value

            with self.originals():
                helpers = operator.consumers(
                    ctx,
                    {"Episode": SyntheticEpisode, "verify_recipe_pins": lambda ready, config: None},
                )
                row = helpers["capture"]["capture_game"](
                    SimpleNamespace(choose=lambda window: 0), self.root, sample
                )
                path = self.root / f"episode-{100 + seat}.jsonl"
                windows = helpers["reader"]["load_trace"](path, row, row["rawTraceSha256"])
                helpers["reader"]["checked_compound_events"](windows, row, helpers["capture"])
            operator.row_guard({"learning": learning}, row, sample)
            self.assertEqual(row["choices"], 1)
            self.assertEqual(row["compoundEvents"], [])
            for field, value in (
                ("recoveredPlayRejections", 1),
                ("errors", ["synthetic-error"]),
                ("terminated", False),
            ):
                bad = copy.deepcopy(row)
                bad["result"][field] = value
                with self.subTest(seat=seat, field=field), self.assertRaises(ValueError):
                    operator.row_guard({"learning": learning}, bad, sample)
        self.assertNotIn("torch", sys.modules)


if __name__ == "__main__":
    unittest.main()
