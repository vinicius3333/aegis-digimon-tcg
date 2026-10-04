import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import click
import numpy as np
import torch
from click.testing import CliRunner

from features import FEATURE_VERSION, FeatureEncoder
from imitate import COMPOUND_ACTIONS, epoch_order, main, policy_divergence, training_setup
from test_migrate import checkpoint
from test_policy import window


class ImitationResumeTests(unittest.TestCase):
    def test_compound_order_keeps_all_originals_and_only_duplicates_training_compounds(
        self,
    ) -> None:
        kinds = ["attack"] * 100
        for index, kind in zip((7, 19, 83), ("linkCard", "appFusion", "dnaDigivolve"), strict=True):
            kinds[index] = kind
        order, anchored = epoch_order(kinds, np.random.default_rng(91), 0.1)
        repeated, repeated_anchor = epoch_order(kinds, np.random.default_rng(91), 0.1)
        np.testing.assert_array_equal(order, repeated)
        np.testing.assert_array_equal(anchored, repeated_anchor)
        self.assertEqual(set(order), set(range(100)))
        self.assertGreaterEqual(
            sum(kinds[index] in COMPOUND_ACTIONS for index in order) / len(order), 0.1
        )
        for index in range(100):
            if kinds[index] not in COMPOUND_ACTIONS:
                self.assertEqual(sum(order == index), 1)
        for index, active in zip(order, anchored, strict=True):
            self.assertEqual(active, kinds[index] not in COMPOUND_ACTIONS)
        default, default_anchor = epoch_order(kinds, np.random.default_rng(91), 0)
        np.testing.assert_array_equal(default, np.random.default_rng(91).permutation(100))
        self.assertTrue(default_anchor.all())
        with self.assertRaisesRegex(click.ClickException, "training-fold compound"):
            epoch_order(["attack", "playCard"], np.random.default_rng(91), 0.1)

    def test_compound_labels_can_learn_without_the_source_anchor_opposing_them(self) -> None:
        logits = torch.tensor([[1.0, 0, -torch.inf], [0, 1, 3]], requires_grad=True)
        reference = torch.tensor([[0.5, -1, -torch.inf], [1, 2, 3]])
        mask = torch.tensor([[True, True, False], [True, True, True]])
        active = torch.tensor([False, True])
        actual = policy_divergence(logits, reference, mask, active)
        expected = policy_divergence(logits[1:], reference[1:], mask[1:]) / 2
        torch.testing.assert_close(actual, expected)
        actual.backward()
        self.assertTrue(torch.equal(logits.grad[0], torch.zeros(3)))
        self.assertTrue(torch.isfinite(logits.grad).all())
        self.assertGreater(float(logits.grad[1].abs().sum()), 0)

    def test_restores_weights_and_adam_and_freezes_the_anchor_before_overriding_lr(self) -> None:
        saved = checkpoint()
        encoder = FeatureEncoder(saved["metadata"]["cardIds"], saved["metadata"]["keywords"])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.pt"
            torch.save(saved, path)
            original_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            for rate in (None, 1e-5):
                model, optimizer, anchor, source = training_setup(
                    encoder,
                    saved["metadata"],
                    torch.device("cpu"),
                    checkpoint=path,
                    learning_rate=rate,
                    policy_anchor=2,
                )
                self.assertEqual(source["sha256"], original_hash)
                for name, value in model.state_dict().items():
                    self.assertTrue(torch.equal(value, saved["model"][name]))
                    self.assertTrue(torch.equal(value, anchor.state_dict()[name]))
                self.assertFalse(any(parameter.requires_grad for parameter in anchor.parameters()))
                self.assertIsNot(next(model.parameters()), next(anchor.parameters()))
                actual = optimizer.state_dict()
                expected = copy.deepcopy(saved["optimizer"])
                if rate is not None:
                    expected["param_groups"][0]["lr"] = rate
                self.assertEqual(actual["param_groups"], expected["param_groups"])
                for key, state in expected["state"].items():
                    for field, value in state.items():
                        self.assertTrue(torch.equal(actual["state"][key][field], value))
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), original_hash)

    def test_rejects_schema_mismatch_missing_optimizer_and_anchor_without_source(self) -> None:
        saved = checkpoint()
        encoder = FeatureEncoder(saved["metadata"]["cardIds"], saved["metadata"]["keywords"])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.pt"
            for mutation in ("metadata", "featureVersion", "optimizer"):
                changed = copy.deepcopy(saved)
                if mutation == "metadata":
                    changed["metadata"]["engineSha256"] = "different"
                elif mutation == "featureVersion":
                    changed[mutation] = FEATURE_VERSION - 1
                else:
                    del changed[mutation]
                torch.save(changed, path)
                with self.subTest(mutation=mutation), self.assertRaises(click.ClickException):
                    training_setup(
                        encoder,
                        saved["metadata"],
                        torch.device("cpu"),
                        checkpoint=path,
                        learning_rate=None,
                        policy_anchor=1,
                    )
            with self.assertRaisesRegex(click.ClickException, "requires a source"):
                training_setup(
                    encoder,
                    saved["metadata"],
                    torch.device("cpu"),
                    checkpoint=None,
                    learning_rate=None,
                    policy_anchor=1,
                )

    def test_masked_anchor_matches_categorical_kl_and_has_finite_gradients(self) -> None:
        mask = torch.tensor([[True, True, False], [True, True, True]])
        reference = torch.tensor([[0.5, -1, -torch.inf], [1, 2, 3]])
        logits = torch.tensor([[1.0, 0, -torch.inf], [0, 1, 3]], requires_grad=True)
        expected = torch.distributions.kl_divergence(
            torch.distributions.Categorical(logits=reference),
            torch.distributions.Categorical(logits=logits),
        ).mean()
        actual = policy_divergence(logits, reference, mask)
        torch.testing.assert_close(actual, expected)
        actual.backward()
        self.assertTrue(torch.isfinite(logits.grad).all())
        self.assertEqual(float(logits.grad[0, 2]), 0)
        self.assertEqual(float(policy_divergence(reference, reference, mask)), 0)
        self.assertFalse(reference.requires_grad)

    def test_cli_retains_epoch_zero_and_records_real_learning_and_compound_folds(self) -> None:
        saved = checkpoint()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "dataset"
            output = root / "output"
            dataset.mkdir()
            path = root / "source.pt"
            torch.save(saved, path)
            original_hash = hashlib.sha256(path.read_bytes()).hexdigest()
            (dataset / "config.json").write_text(
                json.dumps({"metadata": saved["metadata"], "featureVersion": FEATURE_VERSION}),
                encoding="utf-8",
            )
            sample = window()
            sample["actions"][1]["intent"]["type"] = "appFusion"
            for index in (0, 1):
                row = {"window": sample, "action": 1, "supervised": True}
                (dataset / f"episode-{index:05d}.jsonl").write_text(
                    json.dumps(row) + "\n", encoding="utf-8"
                )
            result = CliRunner().invoke(
                main,
                [
                    "--dataset",
                    str(dataset),
                    "--output",
                    str(output),
                    "--checkpoint",
                    str(path),
                    "--epochs",
                    "1",
                    "--learning-rate",
                    "0.00001",
                    "--policy-anchor",
                    "2",
                ],
            )
            self.assertEqual(result.exit_code, 0, result.output)
            initial = torch.load(output / "checkpoint-epoch-000.pt", weights_only=True)
            learned = torch.load(output / "checkpoint-epoch-001.pt", weights_only=True)
            selected = torch.load(output / "checkpoint.pt", weights_only=True)
            history = json.loads((output / "results.json").read_text(encoding="utf-8"))
            for name, value in saved["model"].items():
                self.assertTrue(torch.equal(initial["model"][name], value))
            self.assertEqual(initial["imitationUpdates"], 0)
            self.assertEqual(learned["imitationUpdates"], 1)
            self.assertGreater(history[1]["parameterChangeNorm"], 0)
            self.assertEqual(history[0]["validation"]["byActionType"]["appFusion"]["decisions"], 1)
            self.assertEqual(history[1]["training"]["byActionType"]["appFusion"]["decisions"], 1)
            self.assertEqual(
                selected["imitationEpoch"],
                min(history, key=lambda r: r["validation"]["loss"])["epoch"],
            )
            self.assertEqual(learned["imitationSource"]["sha256"], original_hash)
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), original_hash)
            self.assertGreater(
                float(learned["optimizer"]["state"][0]["step"]),
                float(saved["optimizer"]["state"][0]["step"]),
            )

    def test_cli_compound_sampling_keeps_validation_unmodified(self) -> None:
        saved = checkpoint()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "dataset"
            output = root / "output"
            dataset.mkdir()
            path = root / "source.pt"
            torch.save(saved, path)
            (dataset / "config.json").write_text(
                json.dumps({"metadata": saved["metadata"], "featureVersion": FEATURE_VERSION}),
                encoding="utf-8",
            )
            sample = window()
            sample["actions"][1]["intent"]["type"] = "appFusion"
            validation = {"window": sample, "action": 1, "supervised": True}
            normal = {"window": sample, "action": 0, "supervised": True}
            (dataset / "episode-00000.jsonl").write_text(
                json.dumps(validation) + "\n", encoding="utf-8"
            )
            (dataset / "episode-00001.jsonl").write_text(
                json.dumps(validation) + "\n" + json.dumps(normal) + "\n", encoding="utf-8"
            )
            result = CliRunner().invoke(
                main,
                [
                    "--dataset",
                    str(dataset),
                    "--output",
                    str(output),
                    "--checkpoint",
                    str(path),
                    "--epochs",
                    "1",
                    "--learning-rate",
                    "0.00001",
                    "--policy-anchor",
                    "2",
                    "--compound-share",
                    "0.75",
                    "--compound-only",
                ],
            )
            self.assertEqual(result.exit_code, 0, result.output)
            history = json.loads((output / "results.json").read_text(encoding="utf-8"))
            self.assertEqual(history[1]["trainingSamples"], 4)
            self.assertEqual(history[1]["unanchoredSamples"], 3)
            self.assertEqual(history[1]["training"]["decisions"], 2)
            self.assertEqual(history[1]["validation"]["decisions"], 1)
            self.assertEqual(history[1]["validation"]["byActionType"]["appFusion"]["decisions"], 1)
            self.assertGreater(history[1]["parameterChangeNorm"], 0)


if __name__ == "__main__":
    unittest.main()
