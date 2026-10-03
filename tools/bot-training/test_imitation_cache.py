import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

import click
import numpy as np
import torch

from features import FeatureEncoder
from imitate import batch_tensors, cache_demonstrations, metrics
from model import CandidatePolicy
from test_policy import window


class ImitationCacheTests(unittest.TestCase):
    def test_disk_features_preserve_values_labels_folds_and_metrics(self) -> None:
        encoder = FeatureEncoder(["A", "B"], [])
        first = window()
        second = copy.deepcopy(first)
        second["actions"].reverse()
        second["observation"]["memory"] = 1
        excluded = {"window": first, "action": 0, "supervised": False}
        single = copy.deepcopy(first)
        single["actions"] = single["actions"][:1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "dataset"
            output = root / "output"
            dataset.mkdir()
            output.mkdir()
            (dataset / "config.json").write_text("{}")
            contents = {
                "episode-00000.jsonl": [{"window": first, "action": 1, "supervised": True}],
                "episode-00001.jsonl": [
                    excluded,
                    {"window": single, "action": 0, "supervised": True},
                    {"window": second, "action": 0, "supervised": True},
                ],
            }
            for name, rows in contents.items():
                (dataset / name).write_text("\n".join(json.dumps(row) for row in rows) + "\n")
            (dataset / "episode-00002.partial").write_text("not a completed episode")
            training, validation, hashes, split = cache_demonstrations(dataset, output, encoder)
            self.assertEqual(split, {"training": ["episode-00001.jsonl"], "validation": ["episode-00000.jsonl"]})
            self.assertEqual(len(training), 1)
            self.assertEqual(len(validation), 1)
            self.assertEqual(training[0][2], 0)
            self.assertEqual(validation[0][2], 1)
            expected = [(*encoder.encode(second), 0), (*encoder.encode(first), 1)]
            cached = training + validation
            for actual, original in zip(cached, expected, strict=True):
                self.assertIsInstance(actual[0], np.memmap)
                self.assertIsInstance(actual[1], np.memmap)
                self.assertFalse(actual[0].flags.writeable)
                np.testing.assert_array_equal(actual[0], original[0])
                np.testing.assert_array_equal(actual[1], original[1])
            self.assertEqual(
                (output / "encoded-samples.f32").stat().st_size,
                sum(state.nbytes + actions.nbytes for state, actions, _ in expected),
            )
            self.assertEqual(
                hashes["episode-00001.jsonl"],
                hashlib.sha256((dataset / "episode-00001.jsonl").read_bytes()).hexdigest(),
            )
            cpu = torch.device("cpu")
            for actual, original in zip(batch_tensors(cached, cpu), batch_tensors(expected, cpu), strict=True):
                self.assertTrue(torch.equal(actual, original))
            model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
            self.assertEqual(metrics(model, cached, cpu), metrics(model, expected, cpu))

    def test_missing_validation_fold_fails_before_mapping_an_empty_cache(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "config.json").write_text("{}")
            with self.assertRaisesRegex(click.ClickException, "both training and validation"):
                cache_demonstrations(root, root, FeatureEncoder(["A", "B"], []))


if __name__ == "__main__":
    unittest.main()
