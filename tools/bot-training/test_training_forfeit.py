import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch

from features import FeatureEncoder
from model import CandidatePolicy
from test_policy import window
from train import episode, expected_payment_forfeit


class TrainingForfeitTests(unittest.TestCase):
    def setUp(self) -> None:
        self.config = {
            "seed": 7,
            "learnerSeat": 0,
            "engineSha256": "test-engine",
            "forfeitOnCostRefusal": True,
        }
        self.result = {
            "type": "result",
            "seed": 7,
            "learnerSeat": 0,
            "winnerSeat": 1,
            "decisions": 1,
            "terminated": True,
            "truncated": False,
            "reason": "surrender",
            "errors": [],
            "rejections": [],
            "asyncRejections": [
                {"kind": "actionRejected", "intent": "playCard", "reason": "insufficient-memory"}
            ],
            "trainingForfeit": {
                "kind": "unaffordablePaymentRefusal",
                "sourceInstanceId": "own-card",
            },
        }

    def test_evaluation_and_other_errors_remain_strict(self) -> None:
        self.assertTrue(expected_payment_forfeit(self.config, self.result))
        self.assertFalse(
            expected_payment_forfeit({**self.config, "forfeitOnCostRefusal": False}, self.result)
        )
        changes = [
            {"terminated": False},
            {"truncated": True},
            {"winnerSeat": 0},
            {"reason": "stalled"},
            {"errors": ["engine error"]},
            {"rejections": ["failure"]},
            {"trainingForfeit": {}},
            {"asyncRejections": []},
            {"asyncRejections": self.result["asyncRejections"] * 2},
            {"asyncRejections": [
                {"kind": "actionRejected", "intent": "playCard", "reason": "illegal-target"}
            ]},
        ]
        for change in changes:
            with self.subTest(change=change):
                self.assertFalse(expected_payment_forfeit(self.config, {**self.result, **change}))

    def test_refusal_receives_a_terminal_loss_and_preserves_rejection_evidence(self) -> None:
        torch.set_num_threads(2)
        encoder = FeatureEncoder(["A", "B"], [])
        model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
        decision = {**window(), "type": "decision", "decisionId": "7:1"}
        bridge = MagicMock()
        bridge.receive.side_effect = [
            {"type": "ready", "seed": 7, "engineSha256": "test-engine"},
            decision,
            copy.deepcopy(self.result),
        ]
        bridge.process.wait.return_value = 0
        with tempfile.TemporaryDirectory() as directory:
            with patch("train.Episode") as episode_type:
                episode_type.return_value.__enter__.return_value = bridge
                transitions, result = episode(
                    model,
                    encoder,
                    self.config,
                    "node",
                    Path("worker.js"),
                    Path(directory),
                    torch.device("cpu"),
                    False,
                )
        self.assertEqual(len(transitions), 1)
        self.assertAlmostEqual(transitions[0].target, -1.0)
        self.assertTrue(result["usable"])
        self.assertEqual(result["reward"], -1.0)
        self.assertEqual(result["asyncRejections"], self.result["asyncRejections"])
        self.assertEqual(result["trainingForfeit"], self.result["trainingForfeit"])


if __name__ == "__main__":
    unittest.main()
