import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch
from click.testing import CliRunner

from collect import main
from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from imitate import cache_demonstrations
from inference import CheckpointScorer
from model import CandidatePolicy
from test_policy import window


class CollectionDriverTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.worker = self.root / "worker.js"
        self.worker.write_text("// bridge fixture")
        self.output = self.root / "dataset"
        self.metadata = {
            "schemaVersion": 4,
            "cardIds": ["A", "B"],
            "keywords": [],
            "statusFields": list(STATUS_FIELDS),
            "engineSha256": "test-engine",
            "decks": [{"version": "pinned@1", "sha256": "a" * 64}],
        }
        self.checkpoint = self.root / "checkpoint.pt"
        encoder = FeatureEncoder(self.metadata["cardIds"], self.metadata["keywords"])
        model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
        with torch.no_grad():
            for parameter in model.parameters():
                parameter.zero_()
        torch.save(
            {
                "featureVersion": FEATURE_VERSION,
                "metadata": self.metadata,
                "model": model.state_dict(),
            },
            self.checkpoint,
        )
        self.terminal = {
            "type": "result",
            "terminated": True,
            "truncated": False,
            "winnerSeat": 0,
            "errors": [],
            "rejections": [],
            "asyncRejections": [],
        }
        self.label = 1
        self.sent: list[dict] = []
        self.exit_code = 0

    def bridge(self, node: str, worker: Path, config: dict, log: Path) -> MagicMock:
        message = {
            **window(),
            "type": "decision",
            "decisionId": "choice-1",
            "teacher": {"action": self.label},
        }
        ready = {
            "type": "ready",
            "engineSha256": self.metadata["engineSha256"],
            "decks": config["deckPins"],
        }
        bridge = MagicMock()
        bridge.__enter__.return_value = bridge
        bridge.receive.side_effect = [ready, message, copy.deepcopy(self.terminal)]
        bridge.send.side_effect = self.sent.append
        bridge.process.wait.return_value = self.exit_code
        return bridge

    def run_collection(self, *options: str):
        with (
            patch("collect.describe", return_value=self.metadata),
            patch("collect.Episode", side_effect=self.bridge),
        ):
            return CliRunner().invoke(
                main,
                [
                    "--worker",
                    str(self.worker),
                    "--output",
                    str(self.output),
                    "--games",
                    "1",
                    *options,
                ],
            )

    def row(self) -> dict:
        return json.loads((self.output / "episode-00000.jsonl").read_text().strip())

    def test_frozen_neural_actions_keep_separate_teacher_targets_and_source_bytes(self) -> None:
        original = self.checkpoint.read_bytes()
        scorer = CheckpointScorer(self.checkpoint, "cpu")
        self.assertEqual(scorer.choose(window()), 0)
        result = self.run_collection(
            "--checkpoint",
            str(self.checkpoint),
            "--device",
            "cpu",
            "--games",
            "2",
            "--workers",
            "2",
        )
        self.assertEqual(result.exit_code, 0, result.output)
        row = self.row()
        self.assertEqual(row["action"], 1)
        self.assertEqual(row["executedAction"], 0)
        self.assertTrue(row["supervised"])
        self.assertEqual(row["driver"], "greedy-checkpoint")
        self.assertEqual(self.sent, [{"decisionId": "choice-1", "action": 0}] * 2)
        manifest = json.loads((self.output / "config.json").read_text())
        self.assertEqual(
            manifest["sourceCheckpoint"],
            {
                "path": str(self.checkpoint),
                "sha256": hashlib.sha256(original).hexdigest(),
            },
        )
        self.assertEqual(manifest["device"], "cpu")
        self.assertEqual(
            json.loads((self.output / "results.json").read_text())[0]["teacherAgreements"], 0
        )
        self.assertEqual(self.checkpoint.read_bytes(), original)
        cache = self.root / "cache"
        cache.mkdir()
        training, validation, _, _ = cache_demonstrations(self.output, cache, scorer.encoder)
        self.assertEqual([sample[2] for sample in training], [1])
        self.assertEqual([sample[2] for sample in validation], [1])

    def test_default_still_executes_the_teacher_label(self) -> None:
        result = self.run_collection()
        self.assertEqual(result.exit_code, 0, result.output)
        self.assertEqual(self.row()["action"], self.row()["executedAction"])
        self.assertEqual(self.sent, [{"decisionId": "choice-1", "action": 1}])
        manifest = json.loads((self.output / "config.json").read_text())
        self.assertEqual(manifest["learnerDriver"], "teacher")
        self.assertIsNone(manifest["sourceCheckpoint"])

    def test_unavailable_labels_never_supervise_the_neural_action(self) -> None:
        self.label = None
        result = self.run_collection("--checkpoint", str(self.checkpoint))
        self.assertEqual(result.exit_code, 0, result.output)
        self.assertFalse(self.row()["supervised"])
        self.assertEqual(self.row()["executedAction"], 0)
        record = json.loads((self.output / "results.json").read_text())[0]
        self.assertEqual(record["unavailable"], 1)
        self.assertEqual(record["teacherAgreements"], 0)

    def test_mismatch_and_device_without_checkpoint_leave_no_artifacts(self) -> None:
        result = self.run_collection("--device", "cpu")
        self.assertNotEqual(result.exit_code, 0)
        self.assertFalse(self.output.exists())
        self.metadata = {**self.metadata, "engineSha256": "different-engine"}
        result = self.run_collection("--checkpoint", str(self.checkpoint))
        self.assertNotEqual(result.exit_code, 0)
        self.assertIn("differs from the worker", result.output)
        self.assertFalse(self.output.exists())

    def test_nonterminal_trajectories_stay_partial(self) -> None:
        original = self.terminal
        for index, terminal in enumerate(
            [
                {"type": "truncated", "terminated": False, "truncated": True},
                {**original, "terminated": False},
                {**original, "truncated": True},
            ]
        ):
            with self.subTest(terminal=terminal):
                self.output = self.root / f"partial-{index}"
                self.terminal = terminal
                result = self.run_collection("--checkpoint", str(self.checkpoint))
                self.assertEqual(result.exit_code, 0, result.output)
                self.assertFalse((self.output / "episode-00000.jsonl").exists())
                self.assertTrue((self.output / "episode-00000.partial").exists())
                self.assertFalse(
                    json.loads((self.output / "results.json").read_text())[0]["complete"]
                )

    def test_bad_terminal_or_worker_never_finalizes_a_complete_trajectory(self) -> None:
        original = self.terminal
        for index, (exit_code, terminal) in enumerate(
            [
                (2, original),
                (0, {**original, "errors": ["engine failure"]}),
                (0, {key: value for key, value in original.items() if key != "errors"}),
            ]
        ):
            with self.subTest(exit_code=exit_code, terminal=terminal):
                self.output = self.root / f"failure-{index}"
                self.exit_code = exit_code
                self.terminal = terminal
                result = self.run_collection("--checkpoint", str(self.checkpoint))
                self.assertNotEqual(result.exit_code, 0)
                self.assertFalse((self.output / "episode-00000.jsonl").exists())
                self.assertTrue((self.output / "episode-00000.partial").exists())


if __name__ == "__main__":
    unittest.main()
