import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch
from click.testing import CliRunner

from features import FeatureEncoder
from model import CandidatePolicy
from test_policy import window
from train import episode, greedy_action, infer, main, tolerated_episode


class StreamEvaluationTests(unittest.TestCase):
    def setUp(self) -> None:
        torch.set_num_threads(1)
        torch.manual_seed(74)
        self.encoder = FeatureEncoder(["A", "B"], [])
        self.model = CandidatePolicy(self.encoder.state_dim, self.encoder.action_dim)
        self.config = {"seed": 11, "learnerSeat": 0, "engineSha256": "engine"}
        self.decision = {**window(), "type": "decision", "decisionId": "11:1"}
        self.result = {
            "type": "result", "seed": 11, "learnerSeat": 0, "winnerSeat": 0,
            "decisions": 1, "terminated": True, "truncated": False,
            "errors": [], "rejections": [], "asyncRejections": [],
        }

    def execute(self, result: dict, stream: bool, exit_code: int = 0, tolerate: bool = False):
        bridge = MagicMock()
        bridge.receive.side_effect = [
            {"type": "ready", "seed": 11, "engineSha256": "engine"},
            copy.deepcopy(self.decision), copy.deepcopy(result),
        ]
        bridge.process.wait.return_value = exit_code
        with tempfile.TemporaryDirectory() as directory, patch("train.Episode") as worker:
            worker.return_value.__enter__.return_value = bridge
            run = tolerated_episode if tolerate else episode
            outcome = run(
                self.model, self.encoder, self.config, "node", Path("worker.js"),
                Path(directory), torch.device("cpu"), True, stream_evaluation=stream,
            )
        return outcome, bridge

    def test_streaming_retains_identical_choices_and_terminal_coverage_without_buffers(self) -> None:
        frozen = {name: value.clone() for name, value in self.model.state_dict().items()}
        (old_transitions, old_record), old_bridge = self.execute(self.result, False)
        (transitions, record), bridge = self.execute(self.result, True)
        self.assertEqual(len(old_transitions), 1)
        self.assertEqual(transitions, [])
        self.assertEqual(record, old_record)
        self.assertEqual(bridge.send.call_args_list, old_bridge.send.call_args_list)
        for name, value in self.model.state_dict().items():
            self.assertTrue(torch.equal(value, frozen[name]))

    def test_greedy_argmax_parity_for_variable_candidates_and_ties(self) -> None:
        for tied in (False, True):
            if tied:
                with torch.no_grad():
                    for parameter in self.model.parameters():
                        parameter.zero_()
            for count in (1, 2, 19):
                decision = copy.deepcopy(self.decision)
                decision["actions"] = (decision["actions"] * 10)[:count]
                old = infer(self.model, self.encoder, decision, torch.device("cpu"), True)
                self.assertEqual(
                    greedy_action(self.model, self.encoder, decision, torch.device("cpu")),
                    old.selected,
                )

    def test_errors_truncations_forfeits_and_unsuccessful_exits_are_not_accepted(self) -> None:
        for change in (
            {"errors": ["bad"]}, {"rejections": ["bad"]},
            {"asyncRejections": ["bad"]}, {"trainingForfeit": {}},
        ):
            with self.subTest(change=change), self.assertRaises(RuntimeError):
                self.execute({**self.result, **change}, True)
        (transitions, record), _ = self.execute({"type": "truncated", "decisions": 1}, True)
        self.assertEqual(transitions, [])
        self.assertFalse(record["usable"])
        self.assertIn("actionCoverage", record)
        with self.assertRaisesRegex(RuntimeError, "exited with code"):
            self.execute(self.result, True, exit_code=1)

    def test_nonfinite_logits_remain_fatal(self) -> None:
        for invalid in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(invalid=invalid):
                with torch.no_grad():
                    self.model.score[1].bias.fill_(invalid)
                with self.assertRaises(ValueError):
                    infer(self.model, self.encoder, self.decision, torch.device("cpu"), True)
                with self.assertRaisesRegex(ValueError, "Nonfinite"):
                    greedy_action(self.model, self.encoder, self.decision, torch.device("cpu"))
                (transitions, record), bridge = self.execute(self.result, True, tolerate=True)
                self.assertEqual(transitions, [])
                self.assertTrue(record["failed"])
                self.assertFalse(record["usable"])
                bridge.send.assert_not_called()

    def test_cli_cannot_stream_training_before_creating_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            worker = root / "worker.js"
            worker.write_text("stub", encoding="utf-8")
            output = root / "out"
            result = CliRunner().invoke(main, [
                "--worker", str(worker), "--output", str(output), "--stream-evaluation",
            ])
            self.assertNotEqual(result.exit_code, 0)
            self.assertIn("requires --evaluate", result.output)
            self.assertFalse(output.exists())


if __name__ == "__main__":
    unittest.main()
