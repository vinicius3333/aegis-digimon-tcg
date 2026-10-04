import copy
import json
import tempfile
import unittest
from pathlib import Path

import torch
from click.testing import CliRunner

from adaptation import VocabularyAdaptation
from features import FEATURE_VERSION, FeatureEncoder
from imitate import batch_tensors, main
from migrate import migrate_checkpoint
from model import CandidatePolicy
from test_migrate import checkpoint, metadata
from test_policy import window


def expanded_checkpoint() -> dict:
    return migrate_checkpoint(checkpoint(), {**metadata(["A", "B", "C"]), "engineSha256": "target"})


def prepared_policy() -> tuple[dict, FeatureEncoder, CandidatePolicy, torch.optim.Adam]:
    saved = expanded_checkpoint()
    encoder = FeatureEncoder(saved["metadata"]["cardIds"], saved["metadata"]["keywords"])
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim, width=8)
    model.load_state_dict(saved["model"])
    optimizer = torch.optim.Adam(model.parameters())
    optimizer.load_state_dict(copy.deepcopy(saved["optimizer"]))
    return saved, encoder, model, optimizer


class AdaptationTests(unittest.TestCase):
    def test_real_adam_updates_change_only_new_columns_and_preserve_legacy_outputs(self) -> None:
        saved, encoder, model, optimizer = prepared_policy()
        guard = VocabularyAdaptation(model, optimizer, encoder, ["A", "C"])
        self.assertEqual(guard.added_card_ids, ["B"])
        self.assertEqual(guard.trainable_identity_parameters, 32 * 8)
        legacy = window()
        legacy["observation"]["players"][0]["hand"][1]["cardId"] = "C"
        states, actions = encoder.encode(legacy)
        control = batch_tensors([(states, actions, 0)], torch.device("cpu"))
        with torch.no_grad():
            before = model(*control[:3])
        novel = window()
        novel["actions"][0]["sourceId"] = "card-29"
        novel["actions"][0]["intent"]["instanceId"] = "card-29"
        states, actions = encoder.encode(novel)
        batch = batch_tensors([(states, actions, 0)], torch.device("cpu"))
        for _ in range(3):
            logits, _ = model(*batch[:3])
            loss = torch.nn.functional.cross_entropy(logits, batch[3])
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()
            guard.restore_existing_columns(optimizer)
            with torch.no_grad():
                after = model(*control[:3])
            for original, actual in zip(before, after, strict=True):
                self.assertTrue(torch.equal(original, actual))
        current = optimizer.state_dict()
        for index, (name, parameter) in enumerate(model.named_parameters()):
            if name in guard.masks:
                new = guard.masks[name]
                self.assertTrue(torch.equal(parameter[:, ~new], saved["model"][name][:, ~new]))
                self.assertGreater(
                    float((parameter[:, new] - saved["model"][name][:, new]).abs().sum()), 0
                )
                for field in ("exp_avg", "exp_avg_sq", "max_exp_avg_sq"):
                    self.assertTrue(
                        torch.equal(
                            current["state"][index][field][:, ~new],
                            saved["optimizer"]["state"][index][field][:, ~new],
                        )
                    )
                self.assertEqual(
                    float(current["state"][index]["step"]),
                    float(saved["optimizer"]["state"][index]["step"]) + 3,
                )
            else:
                self.assertTrue(torch.equal(parameter, saved["model"][name]))
                for field, original in saved["optimizer"]["state"][index].items():
                    self.assertTrue(torch.equal(current["state"][index][field], original))

    def test_restores_old_momentum_when_the_source_adam_state_is_uninitialized(self) -> None:
        saved, encoder, model, _ = prepared_policy()
        optimizer = torch.optim.Adam(model.parameters(), amsgrad=True)
        guard = VocabularyAdaptation(model, optimizer, encoder, ["A", "C"])
        state, actions = encoder.encode(window())
        batch = batch_tensors([(state, actions, 0)], torch.device("cpu"))
        logits, _ = model(*batch[:3])
        torch.nn.functional.cross_entropy(logits, batch[3]).backward()
        optimizer.step()
        guard.restore_existing_columns(optimizer)
        for name, parameter in model.named_parameters():
            if name in guard.masks:
                old = ~guard.masks[name]
                self.assertTrue(torch.equal(parameter[:, old], saved["model"][name][:, old]))
                for field in ("exp_avg", "exp_avg_sq", "max_exp_avg_sq"):
                    self.assertEqual(
                        torch.count_nonzero(optimizer.state[parameter][field][:, old]).item(), 0
                    )

    def test_rejects_unchanged_removed_and_duplicate_vocabulary(self) -> None:
        _, encoder, model, optimizer = prepared_policy()
        for original in (["A", "B", "C"], ["A", "D"], ["A", "A", "C"]):
            with self.subTest(original=original), self.assertRaises(ValueError):
                VocabularyAdaptation(model, optimizer, encoder, original)

    def test_cli_requires_migration_and_records_identity_only_learning(self) -> None:
        saved = expanded_checkpoint()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "dataset"
            dataset.mkdir()
            source = root / "source.pt"
            torch.save(saved, source)
            (dataset / "config.json").write_text(
                json.dumps({"metadata": saved["metadata"], "featureVersion": FEATURE_VERSION}),
                encoding="utf-8",
            )
            sample = window()
            sample["actions"][0]["sourceId"] = "card-29"
            sample["actions"][0]["intent"] = {"type": "appFusion", "instanceId": "card-29"}
            for index in (0, 1):
                (dataset / f"episode-{index:05d}.jsonl").write_text(
                    json.dumps({"window": sample, "action": 0, "supervised": True}) + "\n",
                    encoding="utf-8",
                )
            output = root / "output"
            arguments = [
                "--dataset",
                str(dataset),
                "--output",
                str(output),
                "--checkpoint",
                str(source),
                "--epochs",
                "1",
                "--new-card-columns-only",
            ]
            result = CliRunner().invoke(main, arguments)
            self.assertEqual(result.exit_code, 0, result.output)
            config = json.loads((output / "config.json").read_text(encoding="utf-8"))
            self.assertTrue(config["newCardColumnsOnly"])
            self.assertEqual(config["adaptedCardIds"], ["B"])
            self.assertEqual(config["trainableIdentityParameters"], 256)
            learned = torch.load(output / "checkpoint-epoch-001.pt", weights_only=True)
            self.assertEqual(learned["imitationUpdates"], 1)
            self.assertEqual(learned["vocabularyMigration"], saved["vocabularyMigration"])
            legacy = copy.deepcopy(saved)
            del legacy["vocabularyMigration"]
            torch.save(legacy, source)
            arguments[3] = str(root / "rejected")
            rejected = CliRunner().invoke(main, arguments)
            self.assertNotEqual(rejected.exit_code, 0)
            self.assertIn("requires a migrated checkpoint", rejected.output)
            self.assertFalse((root / "rejected").exists())


if __name__ == "__main__":
    unittest.main()
