"""Bounded synthetic planner/statistics tests; no actual closure or model admission."""

import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import development_summary as summary
import prepare_learning as planner


def comparison():
    versions = (
        [f"bt26-fixture-{i}@1" for i in range(11)]
        + [f"ex13-fixture-{i}@1" for i in range(15)]
        + [f"curriculum-fixture-{i}@1" for i in range(18)]
    )
    episodes = []
    for index in range(3872):
        seat = (index // 44) % 2
        learner = index % 44
        opponent = (learner + index // 88) % 44
        decks = [versions[learner], versions[opponent]]
        if seat == 1:
            decks.reverse()
        episodes.append(
            {
                "type": "result",
                "seed": 6164000 + index,
                "learnerSeat": seat,
                "winnerSeat": seat,
                "decks": decks,
                "deckPins": [{"version": v, "sha256": "synthetic"} for v in decks],
                "usable": True,
                "terminated": True,
                "truncated": False,
                "errors": [],
                "rejections": [],
                "asyncRejections": [],
                "reason": "security",
                "decisions": 20,
                "actionCoverage": {"selectedProposals": {"dnaDigivolve": 1}},
            }
        )
    return {
        label: {
            "episodes": copy.deepcopy(episodes),
            "summary": {"actionCoverage": {"selectedProposals": {"dnaDigivolve": 3872}}},
        }
        for label in summary.LABELS
    }


class SummaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base = comparison()

    def test_paired_regression_not_hidden_by_aggregate_gains(self):
        value = copy.deepcopy(self.base)
        for index in range(44, 88):
            value["challenger"]["episodes"][index]["winnerSeat"] = 0
        for index in range(88, 188):
            value["v17-reference"]["episodes"][index]["winnerSeat"] = (
                1 - value["v17-reference"]["episodes"][index]["learnerSeat"]
            )
        result = summary.summarize(value)
        self.assertEqual(
            result["pairedComparisons"]["v17-reference"]["all"],
            {"games": 3872, "gainedWins": 100, "lostWins": 44, "netWins": 56},
        )
        self.assertEqual(
            result["pairedComparisons"]["fitted-reference"]["BT26:seat1"]["netWins"], -11
        )
        self.assertTrue(result["recipesWithoutStrictGain"])
        self.assertFalse(result["physicalMasteryEstablished"])

    def test_scope_and_terminal_rejections(self):
        mutations = [
            lambda v: v.pop("fitted-reference"),
            lambda v: v["challenger"]["episodes"].pop(),
            lambda v: v["source-challenger"]["episodes"][0].update(seed=6210000),
            lambda v: v["v17-reference"]["episodes"][0].update(learnerSeat=1),
            lambda v: v["fitted-reference"]["episodes"][0].update(usable=False),
            lambda v: v["challenger"]["episodes"][0].update(truncated=True),
            lambda v: v["challenger"]["episodes"][0].update(trainingForfeit=False),
            lambda v: v["challenger"]["episodes"][0].update(decisions=4000),
            lambda v: v["challenger"]["episodes"][0].update(reason="turn-limit"),
            lambda v: v["challenger"]["episodes"][0].update(errors=["fixture"]),
            lambda v: v["challenger"]["episodes"][0].update(winnerSeat=None),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                value = copy.deepcopy(self.base)
                mutate(value)
                with self.assertRaises(ValueError):
                    summary.summarize(value)

    def test_live_whole_does_not_read_parent_or_import_consumer(self):
        with (
            tempfile.TemporaryDirectory() as temporary,
            patch.object(summary, "RUN", Path(temporary) / "live"),
            patch.object(summary, "load_pinned") as loader,
        ):
            with self.assertRaisesRegex(ValueError, "still live"):
                summary.closed_inputs()
            loader.assert_not_called()

    def test_failed_exit_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            run = Path(temporary) / "failed"
            launch = Path(str(run) + "-launch")
            launch.mkdir()
            (launch / "exit-code.txt").write_text("1\n")
            with self.assertRaisesRegex(ValueError, "did not succeed"):
                summary.whole_closed(run, {"wholeWrapperPid": 2933, "startTicks": "518861"})

    def test_pinned_import_rejects_modified_consumer_before_execution(self):
        with tempfile.TemporaryDirectory() as temporary:
            path = Path(temporary) / "consumer.py"
            path.write_text("raise RuntimeError('must never execute')\n")
            with self.assertRaisesRegex(ValueError, "SHA mismatch"):
                summary.load_pinned(path, "0" * 64)


class PlannerTests(unittest.TestCase):
    def setUp(self):
        self.blocks = {
            "diagnostic": 6200000,
            "contexts": 6200088,
            "ppo": 6200524,
            "comparison": 6204396,
        }
        self.request = {
            "seeds": self.blocks,
            "futureRun": str(planner.LAB / "runs/synthetic-learning-followthrough-fixture"),
            "imitationSeed": 8261,
        }
        self.bindings = {
            label: {"path": f"/synthetic/never-executed/{label}.pt", "sha256": "synthetic"}
            for label in summary.LABELS
        }

    def test_exact_fold_minimum(self):
        self.assertEqual(planner.minimum_fold_prefix(), 436)
        for count, accepted in ((435, False), (436, True)):
            cells = {}
            for index in range(count):
                cells.setdefault((index % 44, (index // 44) % 2), set()).add(index % 5 == 0)
            self.assertEqual(all(len(v) == 2 for v in cells.values()), accepted)

    def test_commands_retain_all_pairings_cap_and_no_automatic_admission(self):
        result = planner.commands(
            Path("/synthetic/qualified-checkout"), self.bindings, self.request
        )
        self.assertEqual(result["seedBlocksHalfOpen"]["comparison"], [6204396, 6208268])
        self.assertFalse(result["launchesAnyJob"])
        self.assertFalse(result["automaticJobAdmission"])
        self.assertFalse(result["contextCoverageGuaranteed"])
        self.assertEqual(len(result["sequentialDevelopmentComparisonCommands"]), 5)
        for cmd in result["sequentialDevelopmentComparisonCommands"]:
            self.assertIn("--curriculum", cmd)
            self.assertEqual(cmd[cmd.index("--games") + 1], "3872")
            self.assertEqual(cmd[cmd.index("--max-decisions") + 1], "4000")
            self.assertEqual(cmd[cmd.index("--max-failures") + 1], "0")
            self.assertNotIn("--stream-evaluation", cmd)
        self.assertIn("--mechanism-share", result["imitationConditionalOnStrictCorpusCoverage"])

    def test_seed_rejections(self):
        for patch_value in (
            {"comparison": 6210000},
            {"comparison": 6200524},
            {"contexts": True},
            {"ppo": -1},
        ):
            with self.subTest(patch_value=patch_value), self.assertRaises(ValueError):
                planner.validate_blocks({**self.blocks, **patch_value})

    def test_original_inventory_function_reused_and_checks_manifests(self):
        original = Path("/tmp/aegis-v27-fresh-curriculum-comparison.py")
        if not original.is_file():
            self.skipTest("Original sealed helper not installed locally")
        self.assertEqual(summary.digest(original), planner.INVENTORY_SHA)
        with tempfile.TemporaryDirectory() as temporary:
            lab = Path(temporary)
            (lab / "runs").mkdir()
            (lab / "validations").mkdir()
            (lab / "runs/config.json").write_text(json.dumps({"seed": 6200000, "games": 88}))
            with patch.object(planner, "LAB", lab), patch.object(planner, "INVENTORY", original):
                with self.assertRaises(AssertionError):
                    planner.fresh_inventory(lab / "runs/new", 6200087, 88)
                inventory = planner.fresh_inventory(lab / "runs/new", 6200088, 436)
                self.assertEqual(inventory["observedOverlap"], [])
                self.assertTrue(inventory["observedScheduleFiles"])

    def test_existing_run_and_duplicate_checkpoint_rejected(self):
        bindings = copy.deepcopy(self.bindings)
        bindings["challenger"]["path"] = bindings["v17-reference"]["path"]
        with self.assertRaises(ValueError):
            planner.commands(Path("/synthetic"), bindings, self.request)
        with tempfile.TemporaryDirectory() as temporary:
            lab = Path(temporary)
            run = lab / "runs/existing-learning-followthrough"
            run.mkdir(parents=True)
            with patch.object(planner, "LAB", lab), self.assertRaises(ValueError):
                planner.commands(
                    Path("/synthetic"), self.bindings, {**self.request, "futureRun": str(run)}
                )


if __name__ == "__main__":
    unittest.main()
