import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from bridge import Episode, scheduled_episode


class BridgeTests(unittest.TestCase):
    def test_schedule_balances_all_26_learners_in_both_seats_before_rotating_opponents(self) -> None:
        versions = [str(index) for index in range(26)]
        first = [scheduled_episode(versions, index) for index in range(52)]
        self.assertEqual({(pair[seat], seat) for pair, seat in first},
                         {(version, seat) for version in versions for seat in (0, 1)})
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

            with patch("bridge.subprocess.Popen", side_effect=launch):
                with patch.object(Episode, "send", side_effect=BrokenPipeError("early exit")):
                    with self.assertRaises(BrokenPipeError):
                        Episode(sys.executable, worker, {}, root / "worker.log")
            self.assertEqual(len(processes), 1)
            process = processes[0]
            self.assertIsNotNone(process.poll())
            self.assertTrue(process.stdin.closed)
            self.assertTrue(process.stdout.closed)


if __name__ == "__main__":
    unittest.main()
