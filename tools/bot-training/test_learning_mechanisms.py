import copy
import hashlib
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

import numpy as np
import torch
from click.testing import CliRunner

from imitate import mechanism_epoch_order, main, policy_divergence
from learning_mechanisms import (
    MECHANISMS, coverage, inspect_dataset, label_mechanism, require_coverage, sample_context,
)
from test_policy import window
from test_migrate import checkpoint as source_checkpoint


def material_window(family: str, *, finish: bool = False, decline: bool = False) -> dict:
    result = window()
    result["kind"] = "selectCards"
    result["selected"] = ["A"] if finish else []
    intent = {
        "type": "respondDecision", "decisionId": "assembly" if family == "main" else "dec-1",
        "response": {"kind": "selectCards", "instanceIds": [] if finish or decline else ["B"]},
    }
    result["actions"] = [{"intent": intent, "label": "Intentionally arbitrary label"}]
    if family != "main":
        result["request"] = {
            "options": {"assemblyCardId" if family == "assembly" else "digiXrosCardId": "T"}
        }
    return result


class LearningMechanismsTests(unittest.TestCase):
    def test_authoritative_material_contracts_include_finish_but_exclude_decline(self) -> None:
        for family, expected in [
            ("main", "mainAssemblyMaterial"),
            ("assembly", "effectAssemblyMaterial"),
            ("xros", "effectDigiXrosMaterial"),
        ]:
            with self.subTest(family=family):
                self.assertEqual(label_mechanism(material_window(family), 0), expected)
                self.assertEqual(label_mechanism(material_window(family, finish=True), 0), expected)
                self.assertEqual(
                    label_mechanism(material_window(family, decline=True), 0), "respondDecision"
                )
        generic = material_window("main")
        generic["actions"][0]["intent"]["decisionId"] = "other"
        self.assertEqual(label_mechanism(generic, 0), "respondDecision")
        for field, expected in [("assembly", "mainAssembly"), ("digiXros", "mainDigiXros")]:
            direct = window()
            direct["actions"] = [{"intent": {"type": "playCard", field: {}}}]
            self.assertEqual(label_mechanism(direct, 0), expected)

    def test_balancing_keeps_all_samples_and_resamples_only_training_mechanisms(self) -> None:
        contexts = [{"mechanism": "attack", "seat": 0}] * 500
        for family in MECHANISMS:
            for seat in (0, 1):
                contexts.extend([{"mechanism": family, "seat": seat}] * (1 if seat else 10))
        order, anchored = mechanism_epoch_order(contexts, np.random.default_rng(37), 0.5)
        repeated, repeated_anchor = mechanism_epoch_order(contexts, np.random.default_rng(37), 0.5)
        np.testing.assert_array_equal(order, repeated)
        np.testing.assert_array_equal(anchored, repeated_anchor)
        self.assertEqual(set(order), set(range(len(contexts))))
        self.assertGreaterEqual(float((~anchored).sum()) / len(order), 0.5)
        for index in range(500):
            self.assertEqual(int((order == index).sum()), 1)
        counts = Counter(
            (contexts[index]["mechanism"], contexts[index]["seat"])
            for index in order if contexts[index]["mechanism"] in MECHANISMS
        )
        self.assertLessEqual(max(counts.values()) - min(counts.values()), 1)
        for index, anchor in zip(order, anchored, strict=True):
            self.assertEqual(anchor, contexts[index]["mechanism"] not in MECHANISMS)

    def test_gaps_and_malformed_labels_fail_instead_of_borrowing_validation(self) -> None:
        complete = [{"mechanism": family, "seat": seat} for family in MECHANISMS for seat in (0, 1)]
        require_coverage({"training": complete, "validation": complete})
        for fold in ("training", "validation"):
            contexts = {"training": complete.copy(), "validation": complete.copy()}
            contexts[fold].pop()
            self.assertFalse(coverage(contexts)["allMechanismsBothSeatsBothFolds"])
            with self.assertRaisesRegex(ValueError, "original episode folds"):
                require_coverage(contexts)
        with self.assertRaisesRegex(ValueError, "training-fold"):
            mechanism_epoch_order(complete[:-1], np.random.default_rng(0), 0.5)
        for share in (0, 1, float("nan"), float("inf")):
            with self.assertRaisesRegex(ValueError, "share"):
                mechanism_epoch_order(complete, np.random.default_rng(0), share)
        row = {"window": window(), "action": True}
        with self.assertRaisesRegex(ValueError, "action index"):
            sample_context(row)
        row["action"] = 0
        row["window"]["role"] = "opponent"
        with self.assertRaisesRegex(ValueError, "learner"):
            sample_context(row)

    def test_inspection_preserves_file_hashes_original_folds_and_exclusions(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "config.json").write_text("{}", encoding="utf-8")
            for index, seat in [(0, 1), (1, 0)]:
                decision = window()
                decision["observation"]["seat"] = seat
                decision["actions"][0]["intent"] = {"type": "dnaDigivolve"}
                rows = [
                    {"window": decision, "action": 0, "supervised": True},
                    {"window": decision, "action": 0, "supervised": False},
                ]
                single = copy.deepcopy(decision)
                single["actions"] = single["actions"][:1]
                rows.append({"window": single, "action": 0, "supervised": True})
                (root / f"episode-{index:05d}.jsonl").write_text(
                    "\n".join(json.dumps(row) for row in rows), encoding="utf-8"
                )
            (root / "episode-00002.partial").write_text("incomplete", encoding="utf-8")
            report = inspect_dataset(root)
            self.assertEqual(report["nontrivialSupervisedLabelsByFold"], {
                "training": {"dnaDigivolve:seat0": 1}, "validation": {"dnaDigivolve:seat1": 1},
            })
            self.assertEqual(report["originalIndexModuloFiveEpisodeFolds"], {
                "training": ["episode-00001.jsonl"], "validation": ["episode-00000.jsonl"],
            })
            self.assertNotIn("episode-00002.partial", report["sourceHashes"])
            for name, digest in report["sourceHashes"].items():
                self.assertEqual(hashlib.sha256((root / name).read_bytes()).hexdigest(), digest)
            self.assertFalse(report["physicalExecutionOrStrengthEstablished"])

    def test_material_targets_can_update_without_source_kl_opposing_them(self) -> None:
        contexts = [{"mechanism": family, "seat": seat} for family in MECHANISMS for seat in (0, 1)]
        contexts.append({"mechanism": "attack", "seat": 0})
        order, anchored = mechanism_epoch_order(contexts, np.random.default_rng(5), 0.2)
        logits = torch.zeros((len(order), 2), requires_grad=True)
        reference = torch.tensor([[2.0, -1.0]]).repeat(len(order), 1)
        mask = torch.ones_like(logits, dtype=torch.bool)
        policy_divergence(logits, reference, mask, torch.from_numpy(anchored)).backward()
        self.assertTrue(torch.equal(logits.grad[~anchored], torch.zeros_like(logits.grad[~anchored])))
        self.assertGreater(float(logits.grad[anchored].abs().sum()), 0)
        logits.grad.zero_()
        torch.nn.functional.cross_entropy(logits, torch.ones(len(order), dtype=torch.long)).backward()
        self.assertGreater(float(logits.grad[~anchored].abs().sum()), 0)

    def test_cli_rejects_missing_data_before_loading_model_or_creating_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "config.json").write_text('{"metadata": {}}', encoding="utf-8")
            checkpoint = root / "source.pt"
            checkpoint.write_bytes(b"should never be loaded")
            output = root / "out"
            with patch("imitate.training_setup") as setup:
                result = CliRunner().invoke(main, [
                    "--dataset", str(root), "--output", str(output), "--checkpoint", str(checkpoint),
                    "--mechanism-share", "0.2", "--policy-anchor", "0.25",
                ])
            self.assertNotEqual(result.exit_code, 0)
            self.assertIn("Missing mechanism/seat", result.output)
            setup.assert_not_called()
            self.assertFalse(output.exists())

    def test_full_cli_material_learning_changes_weights_and_retains_shape_and_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            dataset = root / "data"
            dataset.mkdir()
            saved = source_checkpoint()
            (dataset / "config.json").write_text(json.dumps({
                "featureVersion": saved["featureVersion"], "metadata": saved["metadata"],
            }), encoding="utf-8")
            rows = []
            for family in MECHANISMS:
                for seat in (0, 1):
                    if family.endswith("Material"):
                        kind = {
                            "mainAssemblyMaterial": "main", "effectAssemblyMaterial": "assembly",
                            "effectDigiXrosMaterial": "xros",
                        }[family]
                        decision = material_window(kind)
                        decision["actions"].append({"intent": {"type": "endPhase"}, "label": "Other"})
                    else:
                        decision = window()
                        intent = {"type": family}
                        if family in ("mainAssembly", "mainDigiXros"):
                            intent = {"type": "playCard", "assembly" if family == "mainAssembly" else "digiXros": {}}
                        decision["actions"][0]["intent"] = intent
                    decision["observation"]["seat"] = seat
                    rows.append({"window": decision, "action": 0, "supervised": True})
            for index in (0, 1):
                (dataset / f"episode-{index:05d}.jsonl").write_text(
                    "\n".join(json.dumps(row) for row in rows), encoding="utf-8"
                )
            source = root / "source.pt"
            torch.save(saved, source)
            source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            output = root / "out"
            result = CliRunner().invoke(main, [
                "--dataset", str(dataset), "--output", str(output), "--checkpoint", str(source),
                "--mechanism-share", "0.2", "--policy-anchor", "0.25", "--epochs", "1",
            ])
            self.assertEqual(result.exit_code, 0, result.output)
            trained = torch.load(output / "checkpoint-epoch-001.pt", weights_only=True)
            self.assertEqual(trained["metadata"], saved["metadata"])
            self.assertEqual(trained["featureVersion"], saved["featureVersion"])
            self.assertEqual(set(trained["model"]), set(saved["model"]))
            self.assertGreater(trained["imitationUpdates"], 0)
            self.assertTrue(any(
                not torch.equal(value, saved["model"][name])
                for name, value in trained["model"].items()
            ))
            for name, value in trained["model"].items():
                self.assertEqual(value.shape, saved["model"][name].shape)
                self.assertTrue(torch.isfinite(value).all())
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), source_hash)
            report = json.loads((output / "mechanism-coverage.json").read_text())
            self.assertTrue(report["allMechanismsBothSeatsBothFolds"])


if __name__ == "__main__":
    unittest.main()
