import copy
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import torch

from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from inference import CheckpointScorer, serve
from model import CandidatePolicy
from test_policy import window
from train import infer


class InferenceTests(unittest.TestCase):
    def setUp(self) -> None:
        torch.set_num_threads(2)
        torch.manual_seed(42)
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.checkpoint = Path(temporary.name) / "checkpoint.pt"
        self.metadata = {
            "schemaVersion": 4,
            "cardIds": ["A", "B"],
            "keywords": ["Alliance", "Barrier", "Blocker"],
            "statusFields": list(STATUS_FIELDS),
            "engineSha256": "test-engine",
            "decks": [],
        }
        self.encoder = FeatureEncoder(self.metadata["cardIds"], self.metadata["keywords"])
        self.model = CandidatePolicy(self.encoder.state_dim, self.encoder.action_dim)
        self.saved = {
            "featureVersion": FEATURE_VERSION,
            "metadata": self.metadata,
            "model": self.model.state_dict(),
        }
        torch.save(self.saved, self.checkpoint)

    def test_matches_training_greedy_choices_without_updating_parameters(self) -> None:
        scorer = CheckpointScorer(self.checkpoint, "cpu")
        before = {key: tensor.clone() for key, tensor in scorer.model.state_dict().items()}
        first = window()
        second = copy.deepcopy(first)
        second["actions"].reverse()
        third = copy.deepcopy(first)
        third["actions"] = third["actions"][:1]
        for message in [first, second, third]:
            expected = infer(self.model, self.encoder, message, torch.device("cpu"), True).selected
            self.assertEqual(scorer.choose(message), expected)
        for key, tensor in scorer.model.state_dict().items():
            torch.testing.assert_close(tensor, before[key], rtol=0, atol=0)

    def test_real_worker_handshake_and_multiple_requests(self) -> None:
        requests = [{"type": "choose", "requestId": index, "window": window()} for index in [1, 2]]
        result = subprocess.run(
            [
                sys.executable,
                str(Path(__file__).with_name("inference.py")),
                "--checkpoint",
                str(self.checkpoint),
            ],
            input="".join(json.dumps(request) + "\n" for request in requests),
            text=True,
            capture_output=True,
            timeout=15,
            check=True,
        )
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(messages[0]["metadata"], self.metadata)
        self.assertEqual(messages[0]["featureVersion"], FEATURE_VERSION)
        self.assertEqual(messages[0]["protocolVersion"], 1)
        self.assertEqual(len(messages[0]["checkpointSha256"]), 64)
        self.assertEqual([message["requestId"] for message in messages[1:]], [1, 2])
        expected = infer(self.model, self.encoder, window(), torch.device("cpu"), True).selected
        self.assertEqual([message["action"] for message in messages[1:]], [expected, expected])

    def test_rejects_incompatible_or_nonfinite_checkpoints(self) -> None:
        self.saved["featureVersion"] = -1
        torch.save(self.saved, self.checkpoint)
        with self.assertRaisesRegex(ValueError, "feature version"):
            CheckpointScorer(self.checkpoint, "cpu")
        self.saved["featureVersion"] = FEATURE_VERSION
        next(iter(self.saved["model"].values())).fill_(float("nan"))
        torch.save(self.saved, self.checkpoint)
        with self.assertRaisesRegex(ValueError, "nonfinite parameters"):
            CheckpointScorer(self.checkpoint, "cpu")

    def test_rejects_bad_protocol_and_empty_candidate_lists(self) -> None:
        scorer = CheckpointScorer(self.checkpoint, "cpu")
        message = window()
        message["actions"] = []
        with self.assertRaisesRegex(ValueError, "nonempty legal candidate"):
            scorer.choose(message)
        for request in [
            {"type": "choose", "requestId": True, "window": window()},
            {"type": "unknown"},
        ]:
            with self.assertRaisesRegex(ValueError, "Invalid inference request"):
                serve(scorer, io.BytesIO((json.dumps(request) + "\n").encode()), io.StringIO())
        with self.assertRaisesRegex(ValueError, "incomplete inference frame"):
            serve(scorer, io.BytesIO(b"{}"), io.StringIO())


if __name__ == "__main__":
    unittest.main()
