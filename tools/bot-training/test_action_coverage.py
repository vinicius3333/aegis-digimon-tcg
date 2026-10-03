import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import torch

from features import FeatureEncoder
from model import CandidatePolicy
from test_policy import window
from train import action_coverage, episode


class ActionCoverageTests(unittest.TestCase):
    def test_learner_coverage_counts_windows_and_excludes_opponent_choices(self) -> None:
        torch.set_num_threads(2)
        encoder = FeatureEncoder(["A", "B"], [])
        model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
        with torch.no_grad():
            for parameter in model.parameters():
                parameter.zero_()
        config = {
            "seed": 7,
            "decks": ["deck-a", "deck-b"],
            "learnerSeat": 0,
            "engineSha256": "test-engine",
        }
        dna = {
            **window(),
            "type": "decision",
            "decisionId": "7:1",
            "actions": [
                {"intent": {"type": "dnaDigivolve"}},
                {"intent": {"type": "dnaDigivolve"}},
                {"intent": {"type": "linkCard"}},
            ],
        }
        opponent = {
            **window(),
            "type": "decision",
            "decisionId": "7:opponent:1",
            "role": "opponent",
            "actions": [{"intent": {"type": "appFusion"}}],
        }
        counter = {
            **window(),
            "type": "decision",
            "decisionId": "7:2",
            "actions": [
                {
                    "intent": {
                        "type": "respondCounter",
                        "sourceInstanceId": "card-17",
                        "effectKey": "blast-dna-digivolve:route",
                    }
                },
                {
                    "intent": {
                        "type": "respondCounter",
                        "sourceInstanceId": "card-17",
                        "effectKey": "blast-digivolve:host",
                    }
                },
                {
                    "intent": {
                        "type": "respondCounter",
                        "sourceInstanceId": "card-17",
                        "effectKey": "printed-effect",
                    }
                },
                {"intent": {"type": "respondCounter"}},
                {"intent": {"type": "playCard", "digiXros": {"materialInstanceIds": ["card-29"]}}},
            ],
        }
        for decision in (dna, opponent, counter):
            for action in decision["actions"]:
                action["label"] = "Test candidate"
        result = {
            "type": "result",
            "seed": 7,
            "learnerSeat": 0,
            "winnerSeat": 0,
            "decisions": 2,
            "terminated": True,
            "truncated": False,
            "errors": [],
            "rejections": [],
            "asyncRejections": [],
        }
        bridge = MagicMock()
        bridge.receive.side_effect = [
            {"type": "ready", "seed": 7, "engineSha256": "test-engine"},
            dna,
            opponent,
            counter,
            result,
        ]
        bridge.process.wait.return_value = 0
        with tempfile.TemporaryDirectory() as directory, patch("train.Episode") as episode_type:
            episode_type.return_value.__enter__.return_value = bridge
            transitions, record = episode(
                model,
                encoder,
                config,
                "node",
                Path("worker.js"),
                Path(directory),
                torch.device("cpu"),
                True,
                model,
            )
        self.assertEqual(len(transitions), 2)
        self.assertEqual(
            record["actionCoverage"],
            {
                "offeredWindows": {
                    "dnaDigivolve": 1,
                    "linkCard": 1,
                    "blastDnaCounter": 1,
                    "blastCounter": 1,
                    "printedCounter": 1,
                    "counterDecline": 1,
                    "mainDigiXros": 1,
                },
                "selectedProposals": {"dnaDigivolve": 1, "blastDnaCounter": 1},
            },
        )
        self.assertEqual(
            bridge.send.call_args_list,
            [
                call({"decisionId": "7:1", "action": 0}),
                call({"decisionId": "7:opponent:1", "action": 0}),
                call({"decisionId": "7:2", "action": 0}),
            ],
        )
        self.assertEqual(action_coverage([record]), record["actionCoverage"])
        incomplete = {**copy.deepcopy(record), "usable": False}
        failed = {**copy.deepcopy(record), "failed": True}
        self.assertEqual(
            action_coverage([record, incomplete, failed, {"usable": True}]),
            record["actionCoverage"],
        )


if __name__ == "__main__":
    unittest.main()
