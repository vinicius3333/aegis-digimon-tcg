import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from bridge import Episode


class BridgeTests(unittest.TestCase):
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
