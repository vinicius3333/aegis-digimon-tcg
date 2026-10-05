"""Synthetic zero-signal reconciliation and actual-exit-race regression guards."""

import argparse
import contextlib
import importlib.util
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch

DIRECTORY = Path(__file__).parent
spec = importlib.util.spec_from_file_location(
    "retirement_fixtures", DIRECTORY / "test_retire_old_source_rooms.py"
)
fixtures = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fixtures)
spec = importlib.util.spec_from_file_location(
    "reconciliation", DIRECTORY / "reconcile-old-source-rooms.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
original = fixtures.module


class ReconciliationFixture(fixtures.Fixture):
    def __enter__(self):
        super().__enter__()
        for row in self.request["targets"]:
            for expected in row["processes"]:
                self.processes[expected["pid"]]["state"] = "Z"
            (Path(str(original.run_path(row["stem"])) + "-launch") / "exit-code.txt").write_text(
                "143\n", encoding="utf-8"
            )
        original.OUTPUT.mkdir()
        (original.OUTPUT / "controller.py").write_bytes(Path(original.__file__).read_bytes())
        self.dump(original.OUTPUT / "request.json", self.request)
        self.dump(
            original.OUTPUT / "failed.json",
            {
                "error": "[Errno 13] Permission denied: '/proc/13787/environ'",
                "retiredBeforeFailure": [original.CUSTODY],
            },
        )
        files, _ = original.tree(original.OUTPUT)
        self.patches.enter_context(
            patch.multiple(
                module,
                LAB=self.lab,
                FAILED=original.OUTPUT,
                OUTPUT=self.lab / "runs/reconciliation",
                FILES=files,
            )
        )
        self.source_sha = original.digest(Path(module.__file__).absolute())
        self.recon_args = argparse.Namespace(
            self_sha256=self.source_sha,
            execute_token=f"reconcile-old-source-rooms:{self.source_sha}",
        )
        return self

    def reconcile(self):
        with contextlib.redirect_stdout(io.StringIO()):
            module.reconcile(original, self.recon_args)


class Guards(unittest.TestCase):
    def test_inspect_no_signal_or_writes_then_zero_signal_closure_keeps_failure(self):
        with ReconciliationFixture() as f:
            before = set(f.lab.rglob("*"))
            with (
                patch.object(module, "load_original", return_value=original),
                patch.object(module.sys, "argv", ["reconcile", "--self-sha256", f.source_sha]),
                contextlib.redirect_stdout(io.StringIO()) as out,
            ):
                module.main()
            self.assertEqual(0, json.loads(out.getvalue())["writes"])
            self.assertEqual(before, set(f.lab.rglob("*")))
            failure = (module.FAILED / "failed.json").read_bytes()
            f.reconcile()
            result = original.read(module.OUTPUT / "completed.json")
            self.assertEqual(0, result["processSignals"])
            self.assertEqual(
                {original.CUSTODY: 143, original.ROOM: 143}, result["intentionalWholeExits"]
            )
            self.assertEqual(failure, (module.FAILED / "failed.json").read_bytes())
            self.assertEqual([], f.events)

    def test_original_loader_never_caches_bytes_in_failed_namespace(self):
        with ReconciliationFixture() as f:
            source = module.FAILED / "controller.py"
            raw = f"from pathlib import Path\nLAB=Path({str(f.lab)!r})\nOUTPUT=Path({str(module.FAILED)!r})\nmarker='sealed'\n".encode()
            source.write_bytes(raw)
            pins = {**module.FILES, "controller.py": fixtures.sha(raw)}
            before = set(module.FAILED.rglob("*"))
            with (
                patch.object(module, "FILES", pins),
                patch.object(module.sys, "dont_write_bytecode", False),
            ):
                loaded = module.load_original()
            self.assertEqual("sealed", loaded.marker)
            self.assertEqual(before, set(module.FAILED.rglob("*")))
            self.assertFalse((module.FAILED / "__pycache__").exists())

    def test_live_node_cpu_or_reused_pid_reject_without_signal(self):
        for pid, state, ticks in [
            (243542, "S", "3761891"),
            (243554, "R", "3762129"),
            (243554, "Z", "reused"),
        ]:
            with self.subTest(pid=pid, state=state), ReconciliationFixture() as f:
                f.processes[pid].update(state=state, startTicks=ticks)
                with self.assertRaises(ValueError):
                    f.reconcile()
                self.assertFalse(module.OUTPUT.exists())
                self.assertEqual([], f.events)

    def test_preserved_failed_namespace_and_actual143_are_mandatory(self):
        for action in (
            lambda: (module.FAILED / "failed.json").write_text("{}"),
            lambda: (module.FAILED / "extra.json").write_text("{}"),
            lambda: (
                Path(str(original.run_path(original.ROOM)) + "-launch") / "exit-code.txt"
            ).write_text("0"),
        ):
            with self.subTest(action=action), ReconciliationFixture() as f:
                action()
                with self.assertRaises(ValueError):
                    f.reconcile()
                self.assertFalse(module.OUTPUT.exists())
                self.assertEqual([], f.events)

    def test_after_requested_mutation_keeps_original_and_new_partial_receipts(self):
        with ReconciliationFixture() as f:
            write = original.write

            def mutate(path, value):
                write(path, value)
                if path == module.OUTPUT / "requested.json":
                    f.processes[243554]["state"] = "R"

            with patch.object(original, "write", side_effect=mutate), self.assertRaises(ValueError):
                f.reconcile()
            self.assertTrue((module.OUTPUT / "requested.json").is_file())
            self.assertTrue((module.OUTPUT / "failed.json").is_file())
            self.assertTrue((module.FAILED / "failed.json").is_file())
            self.assertFalse((module.OUTPUT / "completed.json").exists())
            self.assertEqual([], f.events)

    def test_permission_on_environ_cannot_make_running_stat_dead(self):
        expected = {"pid": 13787, "startTicks": "690019"}

        def exiting(pid, *, details=True):
            if details:
                raise PermissionError("exiting environ")
            return {"pid": pid, "state": "R", "startTicks": "690019"}

        with patch.object(original, "process", side_effect=exiting), self.assertRaises(ValueError):
            module.already_dead(original, expected)


if __name__ == "__main__":
    unittest.main(verbosity=2)
