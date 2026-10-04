import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

import torch
from click.testing import CliRunner

from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy
from test_policy import window
from train import main, update


class TrainingResumeTests(unittest.TestCase):
    def setUp(self) -> None:
        torch.set_num_threads(1)
        torch.manual_seed(71)
        self.metadata = {
            "schemaVersion": 4,
            "cardIds": ["A", "B"],
            "keywords": [],
            "statusFields": list(STATUS_FIELDS),
            "engineSha256": "test-engine",
            "decks": [{"version": "pinned@1", "sha256": "a" * 64}],
        }
        encoder = FeatureEncoder(self.metadata["cardIds"], [])
        model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
        optimizer = torch.optim.Adam(
            model.parameters(),
            lr=0.001,
            betas=(0.7, 0.8),
            eps=1e-7,
            weight_decay=0.03,
            amsgrad=True,
        )
        state, actions = encoder.encode(window())
        logits, value = model(
            torch.from_numpy(state[None]),
            torch.from_numpy(actions[None]),
            torch.ones((1, len(actions)), dtype=torch.bool),
        )
        (logits.sum() + value.sum()).backward()
        optimizer.step()
        self.saved = {
            "model": copy.deepcopy(model.state_dict()),
            "optimizer": copy.deepcopy(optimizer.state_dict()),
            "metadata": self.metadata,
            "featureVersion": FEATURE_VERSION,
        }

    def bridge(self) -> MagicMock:
        bridge = MagicMock()
        bridge.process.wait.return_value = 0
        sample = window()
        following = window()
        following["observation"]["memory"] = 1
        bridge.receive.side_effect = [
            {
                "type": "ready",
                "seed": 11,
                "engineSha256": "test-engine",
                "decks": [self.metadata["decks"][0]] * 2,
            },
            {**sample, "type": "decision", "decisionId": "11:1", "role": "learner"},
            {**following, "type": "decision", "decisionId": "11:2", "role": "learner"},
            {
                "type": "result",
                "seed": 11,
                "learnerSeat": 0,
                "winnerSeat": 0,
                "decisions": 2,
                "terminated": True,
                "truncated": False,
                "reason": "security",
                "errors": [],
                "rejections": [],
                "asyncRejections": [],
            },
        ]
        return bridge

    def test_cli_override_preserves_real_adam_history_and_changes_actual_update_size(self) -> None:
        changes = {}
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            worker, source = root / "worker.js", root / "source.pt"
            worker.write_text("// stub", encoding="utf-8")
            torch.save(self.saved, source)
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            for rate in (None, 0.00003):
                effective = 0.001 if rate is None else rate
                output = root / ("inherited" if rate is None else "overridden")
                observed = []

                def real_update(
                    model,
                    optimizer,
                    transitions,
                    device,
                    *,
                    expected_rate=effective,
                    update_calls=observed,
                ):
                    for name, value in model.state_dict().items():
                        self.assertTrue(torch.equal(value, self.saved["model"][name]))
                    expected = copy.deepcopy(self.saved["optimizer"])
                    expected["param_groups"][0]["lr"] = expected_rate
                    actual = optimizer.state_dict()
                    self.assertEqual(actual["param_groups"], expected["param_groups"])
                    for key, state in expected["state"].items():
                        for field, value in state.items():
                            self.assertTrue(torch.equal(actual["state"][key][field], value))
                    update_calls.append(True)
                    return update(model, optimizer, transitions, device)

                args = [
                    "--worker",
                    str(worker),
                    "--output",
                    str(output),
                    "--checkpoint",
                    str(source),
                    "--games",
                    "1",
                    "--batch-games",
                    "1",
                    "--seed",
                    "11",
                ]
                if rate is not None:
                    args += ["--learning-rate", str(rate)]
                with (
                    patch("train.describe", return_value=self.metadata),
                    patch("train.Episode") as factory,
                    patch("train.update", side_effect=real_update),
                ):
                    factory.return_value.__enter__.return_value = self.bridge()
                    result = CliRunner().invoke(main, args)
                self.assertEqual(result.exit_code, 0, result.output + str(result.exception))
                self.assertEqual(observed, [True])
                config = json.loads((output / "config.json").read_text(encoding="utf-8"))
                self.assertEqual(
                    config["sourceCheckpoint"], {"path": str(source), "sha256": source_hash}
                )
                self.assertEqual(config["initialLearningRate"], 0.001)
                self.assertEqual(config["learningRate"], effective)
                self.assertEqual(config["learningRateOverride"], rate)
                trained = torch.load(output / "checkpoint.pt", weights_only=True)
                self.assertEqual(
                    trained["trainingContinuation"]["sourceCheckpoint"], config["sourceCheckpoint"]
                )
                self.assertEqual(trained["trainingContinuation"]["learningRateOverride"], rate)
                expected_groups = copy.deepcopy(self.saved["optimizer"]["param_groups"])
                expected_groups[0]["lr"] = effective
                self.assertEqual(trained["optimizer"]["param_groups"], expected_groups)
                for key, state in self.saved["optimizer"]["state"].items():
                    self.assertEqual(
                        float(trained["optimizer"]["state"][key]["step"] - state["step"]), 4
                    )
                change = sum(
                    float((value - self.saved["model"][name]).square().sum())
                    for name, value in trained["model"].items()
                )
                self.assertGreater(change, 0)
                changes[effective] = change
                verification = json.loads(
                    (output / "verification.json").read_text(encoding="utf-8")
                )
                self.assertGreater(verification["maxParameterChange"], 0)
                self.assertEqual(verification["sourceCheckpointSha256"], source_hash)
                self.assertEqual(verification["learningRate"], effective)
                self.assertEqual(verification["learningRateOverride"], rate)
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), source_hash)
            self.assertLess(changes[0.00003], changes[0.001])

    def test_invalid_and_evaluation_overrides_leave_no_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            worker = root / "worker.js"
            worker.write_text("// stub", encoding="utf-8")
            for index, (rate, evaluate) in enumerate(
                [(x, False) for x in ["0", "-1", "nan", "inf", "-inf"]] + [("0.00003", True)]
            ):
                output = root / f"output-{index}"
                args = ["--worker", str(worker), "--output", str(output), "--learning-rate", rate]
                if evaluate:
                    args.append("--evaluate")
                with (
                    self.subTest(rate=rate, evaluate=evaluate),
                    patch("train.describe") as describe,
                ):
                    result = CliRunner().invoke(main, args)
                    self.assertNotEqual(result.exit_code, 0)
                    self.assertFalse(output.exists())
                    describe.assert_not_called()

    def test_evaluation_records_actual_checkpoint_bytes_without_updates(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            worker, source, output = root / "worker.js", root / "source.pt", root / "output"
            worker.write_text("// stub", encoding="utf-8")
            torch.save(self.saved, source)
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            args = [
                "--worker",
                str(worker),
                "--output",
                str(output),
                "--checkpoint",
                str(source),
                "--evaluate",
                "--games",
                "1",
                "--seed",
                "11",
            ]
            with (
                patch("train.describe", return_value=self.metadata),
                patch("train.Episode") as factory,
                patch("train.update") as update_mock,
            ):
                factory.return_value.__enter__.return_value = self.bridge()
                result = CliRunner().invoke(main, args)
            self.assertEqual(result.exit_code, 0, result.output + str(result.exception))
            update_mock.assert_not_called()
            config = json.loads((output / "config.json").read_text(encoding="utf-8"))
            self.assertEqual(
                config["sourceCheckpoint"], {"path": str(source), "sha256": source_hash}
            )
            self.assertIsNone(config["learningRate"])
            self.assertIsNone(config["learningRateOverride"])
            verification = json.loads((output / "verification.json").read_text(encoding="utf-8"))
            self.assertEqual(verification["sourceCheckpointSha256"], source_hash)
            self.assertEqual(verification["maxParameterChange"], 0)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), source_hash)
            self.assertFalse((output / "checkpoint.pt").exists())


if __name__ == "__main__":
    unittest.main()
