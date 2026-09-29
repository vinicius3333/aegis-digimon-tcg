import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import train


class EpisodeFailureTests(unittest.TestCase):
    def test_failed_episode_is_recorded_and_excluded_from_deck_wins(self) -> None:
        config = {"seed": 9, "decks": ["deck-a", "deck-b"], "learnerSeat": 1}
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            with patch("train.episode", side_effect=RuntimeError("Episode 9 failed: stalled")):
                transitions, result = train.tolerated_episode(
                    None, None, config, "node", output / "worker.js", output, None, False
                )
            self.assertEqual(transitions, [])
            self.assertTrue(result["failed"])
            self.assertFalse(result["usable"])
            saved = json.loads((output / "failure-9.json").read_text())
            self.assertEqual(saved["config"], config)
        won = {"decks": ["deck-a", "deck-b"], "learnerSeat": 0, "reward": 1}
        truncated = {"decks": ["deck-a", "deck-b"], "learnerSeat": 0, "usable": False}
        self.assertEqual(train.wins_by_learner_deck([won, result, truncated]), {"deck-a": [1, 2]})


if __name__ == "__main__":
    unittest.main()
