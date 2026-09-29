import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch

from features import FeatureEncoder
from model import CandidatePolicy
from test_policy import window
from train import episode, wins_by_opponent


class LeagueTests(unittest.TestCase):
    def setUp(self) -> None:
        torch.set_num_threads(2)
        self.encoder = FeatureEncoder(["A", "B"], [])
        self.model = CandidatePolicy(self.encoder.state_dim, self.encoder.action_dim)
        self.config = {
            "seed": 11,
            "decks": ["deck-a", "deck-b"],
            "learnerSeat": 0,
            "engineSha256": "test-engine",
            "opponent": "external",
            "opponentName": "league-1",
        }
        self.result = {
            "type": "result",
            "seed": 11,
            "learnerSeat": 0,
            "winnerSeat": 0,
            "decisions": 1,
            "terminated": True,
            "truncated": False,
            "reason": "security",
            "errors": [],
            "rejections": [],
            "asyncRejections": [],
        }

    def run_episode(self, messages: list[dict], opponent: CandidatePolicy | None):
        bridge = MagicMock()
        bridge.receive.side_effect = [
            {"type": "ready", "seed": 11, "engineSha256": "test-engine"},
            *messages,
        ]
        bridge.process.wait.return_value = 0
        with tempfile.TemporaryDirectory() as directory, patch("train.Episode") as episode_type:
            episode_type.return_value.__enter__.return_value = bridge
            outcome = episode(
                self.model,
                self.encoder,
                self.config,
                "node",
                Path("worker.js"),
                Path(directory),
                torch.device("cpu"),
                False,
                opponent,
            )
        return outcome, bridge

    def test_opponent_decisions_are_answered_but_not_trained(self) -> None:
        opponent = CandidatePolicy(self.encoder.state_dim, self.encoder.action_dim)
        messages = [
            {**window(), "type": "decision", "decisionId": "11:opponent:1", "role": "opponent"},
            {**window(), "type": "decision", "decisionId": "11:1", "role": "learner"},
            self.result,
        ]
        (transitions, result), bridge = self.run_episode(messages, opponent)
        self.assertEqual(len(transitions), 1)
        self.assertEqual(
            [call.args[0]["decisionId"] for call in bridge.send.call_args_list],
            ["11:opponent:1", "11:1"],
        )
        self.assertEqual(result["opponentName"], "league-1")
        self.assertEqual(result["reward"], 1.0)
        self.assertEqual(wins_by_opponent([result]), {"league-1": [1, 1]})

    def test_opponent_decision_without_a_league_model_fails(self) -> None:
        messages = [
            {**window(), "type": "decision", "decisionId": "11:opponent:1", "role": "opponent"}
        ]
        with self.assertRaisesRegex(RuntimeError, "without a league opponent"):
            self.run_episode(messages, None)


if __name__ == "__main__":
    unittest.main()
