import copy
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from bridge import Episode, episode_scope, scheduled_episode, verify_recipe_pins


class BridgeTests(unittest.TestCase):
    def test_handshake_rejects_changed_hash_or_swapped_seats_before_play(self) -> None:
        pins = [
            {"version": "catalog@1", "sha256": "a" * 64},
            {"version": "curriculum@1", "sha256": "b" * 64},
        ]
        config = {"deckPins": pins}
        verify_recipe_pins({"decks": pins}, config)
        for actual in (pins[::-1], [{**pins[0], "sha256": "c" * 64}, pins[1]], None):
            with self.subTest(actual=actual), self.assertRaises(RuntimeError):
                verify_recipe_pins({"decks": actual}, config)

    def test_curriculum_balances_all_learners_and_ordered_opponents_in_both_seats(self) -> None:
        for count in (42, 44):
            with self.subTest(recipes=count):
                versions = [str(index) for index in range(count)]
                first = [scheduled_episode(versions, index) for index in range(2 * count)]
                self.assertEqual(
                    {(pair[seat], seat) for pair, seat in first},
                    {(version, seat) for version in versions for seat in (0, 1)},
                )
                length = 2 * count * count
                cycle = [scheduled_episode(versions, index) for index in range(length)]
                self.assertEqual(
                    {(tuple(pair), seat) for pair, seat in cycle},
                    {
                        ((first, second), seat)
                        for first in versions
                        for second in versions
                        for seat in (0, 1)
                    },
                )
                self.assertEqual(
                    scheduled_episode(versions, length), scheduled_episode(versions, 0)
                )

    def test_curriculum_records_extra_pins_without_mutating_checkpoint_metadata(self) -> None:
        catalog = {"version": "catalog@1", "name": "Catalog", "sha256": "a" * 64}
        extra = {"version": "curriculum@1", "name": "Curriculum", "sha256": "b" * 64}
        metadata = {"engineSha256": "runtime", "decks": [catalog], "cardIds": ["BT26-002"]}
        original = copy.deepcopy(metadata)
        manifest = {"schemaVersion": 1, "engineSha256": "runtime", "decks": [catalog, extra]}
        with patch("bridge._describe", return_value=manifest) as worker:
            self.assertIs(episode_scope("node", Path("worker.js"), metadata, False), metadata)
            worker.assert_not_called()
            self.assertEqual(episode_scope("node", Path("worker.js"), metadata, True), manifest)
            worker.assert_called_once_with("node", Path("worker.js"), "--describe-curriculum")
        self.assertEqual(metadata, original)

    def test_curriculum_rejects_changed_runtime_catalog_duplicate_versions_and_bad_pins(
        self,
    ) -> None:
        catalog = {"version": "catalog@1", "name": "Catalog", "sha256": "a" * 64}
        extra = {"version": "curriculum@1", "name": "Curriculum", "sha256": "b" * 64}
        metadata = {"engineSha256": "runtime", "decks": [catalog]}
        base = {"schemaVersion": 1, "engineSha256": "runtime", "decks": [catalog, extra]}
        invalid = [
            {**base, "engineSha256": "other"},
            {**base, "decks": [extra, catalog]},
            {**base, "decks": [catalog, extra, extra]},
            {**base, "decks": [catalog, {**extra, "sha256": "not-a-hash"}]},
            {**base, "decks": [catalog]},
            {**base, "decks": [catalog, None]},
        ]
        for manifest in invalid:
            with (
                self.subTest(manifest=manifest),
                patch("bridge._describe", return_value=manifest),
                self.assertRaises(ValueError),
            ):
                episode_scope("node", Path("worker.js"), metadata, True)

    def test_schedule_balances_all_26_learners_in_both_seats_before_rotating_opponents(
        self,
    ) -> None:
        versions = [str(index) for index in range(26)]
        first = [scheduled_episode(versions, index) for index in range(52)]
        self.assertEqual(
            {(pair[seat], seat) for pair, seat in first},
            {(version, seat) for version in versions for seat in (0, 1)},
        )
        cycle = [scheduled_episode(versions, index) for index in range(1352)]
        self.assertEqual(len({(tuple(pair), seat) for pair, seat in cycle}), 1352)
        self.assertEqual(scheduled_episode(versions, 1352), scheduled_episode(versions, 0))

    def test_initial_send_failure_closes_process_and_streams(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            worker = root / "worker.py"
            worker.write_text("import time\ntime.sleep(60)\n")
            processes = []
            popen = subprocess.Popen

            def launch(*args, **kwargs):
                process = popen(*args, **kwargs)
                processes.append(process)
                return process

            with (
                patch("bridge.subprocess.Popen", side_effect=launch),
                patch.object(Episode, "send", side_effect=BrokenPipeError("early exit")),
                self.assertRaises(BrokenPipeError),
            ):
                Episode(sys.executable, worker, {}, root / "worker.log")
            self.assertEqual(len(processes), 1)
            process = processes[0]
            self.assertIsNotNone(process.poll())
            self.assertTrue(process.stdin.closed)
            self.assertTrue(process.stdout.closed)


if __name__ == "__main__":
    unittest.main()
