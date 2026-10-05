"""Synthetic process/filesystem guards only; never signal actual jobs or load models."""

import argparse
import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import signal
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SOURCE = Path(__file__).with_name("retire-old-source-rooms.py")
spec = importlib.util.spec_from_file_location("retirement", SOURCE)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


class Fixture:
    def __enter__(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.lab = Path(self.tmp.name).resolve()
        (self.lab / "runs").mkdir()
        (self.lab / "transfers").mkdir()
        self.events = []
        self.processes = {}
        self.targets = copy.deepcopy(module.TARGETS)
        self.patches = contextlib.ExitStack()
        self.patches.enter_context(
            patch.multiple(
                module,
                LAB=self.lab,
                CHECKOUT=self.lab / "checkouts/source",
                PREP=self.lab / "runs/prep",
                OUTPUT=self.lab / "runs/retirement",
                CHALLENGER=self.lab / "runs/challenger.pt",
                TARGETS=self.targets,
                EXTRACTOR_SHA=sha(b"extractor"),
            )
        )
        self.protected_file = self.lab / "protected-source-map.json"
        self.protected_file.write_bytes(b"unchanged-map")
        self.checkpoint = self.lab / "runs/immutable.pt"
        self.checkpoint.write_bytes(b"unchanged-checkpoint")
        self.patches.enter_context(
            patch.multiple(
                module,
                PROTECTED={"protected-source-map.json": sha(b"unchanged-map")},
                CHECKPOINTS={
                    "immutable.pt": sha(b"unchanged-checkpoint"),
                    "challenger.pt": sha(b"challenger"),
                },
                DEPENDENCIES={},
            )
        )
        module.CHALLENGER.write_bytes(b"challenger")
        for stem, pin in self.targets.items():
            run = module.run_path(stem)
            run.mkdir()
            launch = Path(str(run) + "-launch")
            launch.mkdir()
            op, wrapper = stem.encode(), (stem + "-wrapper").encode()
            pin["operatorSha256"], pin["wrapperSha256"] = sha(op), sha(wrapper)
            (run / "operator.py").write_bytes(op)
            (self.lab / "transfers" / (stem + ".py")).write_bytes(op)
            (launch / "launch.sh").write_bytes(wrapper)
            (launch / "launch.log").write_bytes(b"actual-wrapper-log-fixture")
            (self.lab / "transfers" / (stem + "-launch.sh")).write_bytes(wrapper)
            identity = {k: pin[k] for k in ("operatorSha256", "wrapperSha256")}
            identity.update(
                run=run.name,
                wholeWrapperPid=pin["processes"][0][0],
                startTicks=pin["processes"][0][1],
            )
            ip = self.lab / "transfers" / (stem + "-launch-identity.json")
            ip.write_text(json.dumps(identity), encoding="utf-8")
            pin["identitySha256"] = module.digest(ip)
            for i, (pid, tick) in enumerate(pin["processes"]):
                self.processes[pid] = {
                    "pid": pid,
                    "startTicks": tick,
                    "ppid": pin["processes"][i - 1][0] if i else 99,
                    "argv": module.commands(stem)[i],
                    "state": "S",
                    "cwd": str(module.CHECKOUT) if i >= 2 else str(self.lab),
                    "cpuEnv": [] if not i else ["MKL_NUM_THREADS=1", "OMP_NUM_THREADS=1"],
                }
        room = module.run_path(module.ROOM)
        records = [
            {
                "index": 0,
                "seed": 6170000,
                "gameOver": {"kind": "gameOver", "result": {"outcome": "win"}},
            }
        ]
        (room / "verification").mkdir()
        (room / "rooms.log").write_bytes(b"natural-existing-room-log\n")
        self.dump(room / "verification/results.json", records)
        self.dump(
            room / "verification/config.json", {"games": 26, "checkpoint": str(module.CHALLENGER)}
        )
        self.dump(room / "physical-launch-identity.json", {})
        self.dump(room / "queued.json", {})
        self.dump(
            room / "started.json",
            {
                "completed": False,
                "actualLearningUpdates": 0,
                "futureBlind6210000Untouched": True,
                "command": module.node_command(),
                "cwd": str(module.CHECKOUT),
                "checkpointSha256": sha(b"challenger"),
                "coordinatorPid": 13787,
                "coordinatorStartTicks": "690019",
            },
        )
        self.dump(
            room / "room-process.json",
            {"pid": 243542, "startTicks": "3761891", "command": module.node_command()},
        )
        custody = module.run_path(module.CUSTODY)
        (custody / "extractor.py").write_bytes(b"extractor")
        self.dump(
            custody / "room-launch-identity.json",
            module.read(self.lab / "transfers" / (module.ROOM + "-launch-identity.json")),
        )
        self.dump(
            custody / "queued.json",
            {
                "actualLearningUpdates": 0,
                "analysisStarted": False,
                "torchImported": False,
                "futureBlind6210000Untouched": True,
                "operatorSha256": self.targets[module.CUSTODY]["operatorSha256"],
                "waitingForWholeRooms": module.read(
                    self.lab / "transfers" / (module.ROOM + "-launch-identity.json")
                ),
                "extractorSha256": sha(b"extractor"),
            },
        )
        self.patches.enter_context(
            patch.object(
                module,
                "process",
                side_effect=lambda pid, **kwargs: copy.deepcopy(self.processes.get(pid)),
            )
        )
        self.patches.enter_context(
            patch.object(module, "descendants", side_effect=self.descendants)
        )
        self.patches.enter_context(
            patch.object(module.os, "pidfd_open", create=True, side_effect=self.open_fd)
        )
        self.patches.enter_context(
            patch.object(
                module.os, "close", side_effect=lambda fd: self.events.append(("close", fd))
            )
        )
        self.patches.enter_context(
            patch.object(module.signal, "pidfd_send_signal", create=True, side_effect=self.send)
        )
        self.patches.enter_context(
            patch.object(module.select, "poll", create=True, side_effect=lambda: self.Poller(self))
        )
        self.patches.enter_context(patch.object(module.time, "sleep", return_value=None))
        self.request = module.inventory()
        self.request_file = self.lab / "request.json"
        self.dump(self.request_file, self.request)
        self.args = argparse.Namespace(
            self_sha256=module.digest(SOURCE.absolute()),
            request=self.request_file,
            request_sha256=module.digest(self.request_file),
            execute_token=None,
        )
        self.token()
        return self

    def __exit__(self, *args):
        self.patches.close()
        self.tmp.cleanup()

    def dump(self, path, value):
        path.write_text(json.dumps(value), encoding="utf-8")

    def token(self):
        self.args.execute_token = (
            f"retire-old-source-rooms:{self.args.request_sha256}:{self.args.self_sha256}"
        )

    def seal(self):
        self.dump(self.request_file, self.request)
        self.args.request_sha256 = module.digest(self.request_file)
        self.token()

    def descendants(self, parent):
        found = set()
        for pid, info in self.processes.items():
            if info["state"] == "Z":
                continue
            ppid, seen = info["ppid"], set()
            while ppid in self.processes and ppid != parent and ppid not in seen:
                seen.add(ppid)
                ppid = self.processes[ppid]["ppid"]
            if pid != parent and ppid == parent:
                found.add(pid)
        return found

    def open_fd(self, pid):
        self.events.append(("open", pid))
        return pid

    class Poller:
        def __init__(self, fixture):
            self.fixture = fixture

        def register(self, fd, _events):
            self.fd = fd

        def poll(self, _timeout):
            return [(self.fd, 1)] if self.fixture.processes[self.fd]["state"] == "Z" else []

    def send(self, fd, sig):
        assert sig == signal.SIGTERM
        assert {13787, 42613, 243542, 243554} <= {
            pid for kind, pid in self.events if kind == "open"
        }
        assert (module.OUTPUT / "requested.json").is_file()
        self.events.append(("signal", fd))
        self.processes[fd]["state"] = "Z"
        for info in self.processes.values():
            if info["ppid"] == fd:
                info["ppid"] = 1
        if fd in (13787, 42613):
            stem = module.ROOM if fd == 13787 else module.CUSTODY
            wrapper = self.targets[stem]["processes"][0][0]
            self.processes[wrapper]["state"] = "Z"
            (Path(str(module.run_path(stem)) + "-launch") / "exit-code.txt").write_text(
                "143\n", encoding="utf-8"
            )

    def execute(self):
        with contextlib.redirect_stdout(io.StringIO()):
            module.execute(self.args, self.request)


class Guards(unittest.TestCase):
    def test_inspect_default_writes_and_signals_nothing(self):
        with Fixture() as f:
            f.args.execute_token = None
            argv = [
                "controller",
                "--request",
                str(f.request_file),
                "--request-sha256",
                f.args.request_sha256,
                "--self-sha256",
                f.args.self_sha256,
            ]
            before = set(f.lab.rglob("*"))
            with (
                patch.object(module.sys, "argv", argv),
                contextlib.redirect_stdout(io.StringIO()) as out,
            ):
                module.main()
            self.assertTrue(json.loads(out.getvalue())["inspectOnly"])
            self.assertEqual(before, set(f.lab.rglob("*")))
            self.assertEqual([], f.events)

    def test_full_synthetic_retirement_opens_all_before_signals_and_preserves_records(self):
        with Fixture() as f:
            f.execute()
            self.assertEqual(
                [42613, 13787, 243542, 243554], [pid for kind, pid in f.events if kind == "signal"]
            )
            result = module.read(module.OUTPUT / "completed.json")
            self.assertEqual(
                {module.CUSTODY: 143, module.ROOM: 143}, result["intentionalWholeExits"]
            )
            self.assertEqual(
                f.request["targets"][1]["completedRecords"], result["naturalCompletedRoomRecords"]
            )
            self.assertTrue(result["noSuccessfulQualificationOrMasteryClaim"])
            self.assertEqual(b"unchanged-checkpoint", f.checkpoint.read_bytes())

    def test_bad_token_sha_and_existing_output_fail_without_signals(self):
        for field, value in [
            ("execute_token", "yes"),
            ("request_sha256", "0" * 64),
            ("self_sha256", "0" * 64),
        ]:
            with self.subTest(field=field), Fixture() as f:
                setattr(f.args, field, value)
                with self.assertRaises(ValueError):
                    module.guard(
                        f.args, f.request, set()
                    ) if field != "execute_token" else f.execute()
                self.assertFalse(module.OUTPUT.exists())
                self.assertFalse(any(k == "signal" for k, _ in f.events))
        with Fixture() as f:
            module.OUTPUT.mkdir()
            marker = module.OUTPUT / "requested.json"
            marker.write_text("prior-partial", encoding="utf-8")
            with self.assertRaises(ValueError):
                f.execute()
            self.assertEqual("prior-partial", marker.read_text())
            self.assertEqual([], f.events)

    def test_changed_identity_wrapper_started_custody_and_checkpoint_reject(self):
        changes = [
            lambda f: (module.run_path(module.CUSTODY) / "started.json").write_text("{}"),
            lambda f: (module.run_path(module.CUSTODY) / "extra").mkdir(),
            lambda f: (
                Path(str(module.run_path(module.ROOM)) + "-launch") / "launch.sh"
            ).write_bytes(b"changed"),
            lambda f: (f.lab / "transfers" / (module.ROOM + "-launch-identity.json")).write_text(
                "{}"
            ),
            lambda f: f.checkpoint.write_bytes(b"updated-model"),
            lambda f: f.protected_file.write_bytes(b"changed-map"),
        ]
        for change in changes:
            with self.subTest(change=change), Fixture() as f:
                change(f)
                with self.assertRaises(ValueError):
                    module.guard(f.args, f.request, set())
                self.assertEqual([], f.events)

    def test_readonly_cpu_commands_modulepaths_parentage_and_pidreuse(self):
        changes = [
            lambda f: f.processes[243554]["argv"].__setitem__(-1, "cuda"),
            lambda f: f.processes[243554].__setitem__("cwd", "/new/training"),
            lambda f: f.processes[243554].__setitem__("startTicks", "reused"),
            lambda f: f.processes[243554].__setitem__("ppid", 42613),
            lambda f: f.processes[13787].__setitem__("argv", ["python", "train.py"]),
            lambda f: f.processes.__setitem__(
                765432, {**f.processes[243554], "pid": 765432, "ppid": 243542}
            ),
        ]
        for change in changes:
            with self.subTest(change=change), Fixture() as f:
                change(f)
                with self.assertRaises(ValueError):
                    module.guard(f.args, f.request, set())
                self.assertEqual([], f.events)

    def test_directory_file_and_receipt_symlinks_reject(self):
        with Fixture() as f:
            run = module.run_path(module.CUSTODY)
            displaced = run.with_name("displaced")
            run.rename(displaced)
            run.symlink_to(displaced, target_is_directory=True)
            with self.assertRaises(ValueError):
                module.guard(f.args, f.request, set())
        with Fixture() as f:
            launch = Path(str(module.run_path(module.ROOM)) + "-launch")
            (launch / "exit-code.txt").symlink_to(f.request_file)
            with self.assertRaises(ValueError):
                module.guard(f.args, f.request, set())

    def test_after_requested_receipt_mutation_never_signals_and_retains_receipts(self):
        with Fixture() as f:
            original = module.write

            def changed(path, value):
                original(path, value)
                if path.name == "requested.json":
                    f.processes[243554]["startTicks"] = "after-receipt-reuse"

            with patch.object(module, "write", side_effect=changed), self.assertRaises(ValueError):
                f.execute()
            self.assertFalse(any(k == "signal" for k, _ in f.events))
            self.assertTrue((module.OUTPUT / "requested.json").is_file())
            self.assertTrue((module.OUTPUT / "failed.json").is_file())
            self.assertFalse((module.OUTPUT / "completed.json").exists())

    def test_pid_change_after_open_cannot_signal(self):
        with Fixture() as f:
            original = f.open_fd

            def moved(pid):
                fd = original(pid)
                if pid == 243554:
                    f.processes[pid]["startTicks"] = "new-start"
                return fd

            with (
                patch.object(module.os, "pidfd_open", side_effect=moved),
                self.assertRaises(ValueError),
            ):
                f.execute()
            self.assertFalse(any(k == "signal" for k, _ in f.events))

    def test_partial_receipt_retention_after_v44_without_blind_retry(self):
        with Fixture() as f:
            original = f.send

            def changed(fd, sig):
                original(fd, sig)
                if fd == 42613:
                    f.processes[243554]["argv"][-1] = "cuda"

            with (
                patch.object(module.signal, "pidfd_send_signal", side_effect=changed),
                self.assertRaises(ValueError),
            ):
                f.execute()
            self.assertEqual([42613], [pid for k, pid in f.events if k == "signal"])
            self.assertTrue((module.OUTPUT / (module.CUSTODY + "-completed.json")).is_file())
            self.assertTrue((module.OUTPUT / "failed.json").is_file())
            with self.assertRaises(ValueError):
                f.execute()

    def test_only_actual_whole_143_is_accepted(self):
        for code in ("0", "1", "-15"):
            with self.subTest(code=code), Fixture() as f:
                original = f.send

                def different(fd, sig, *, original=original, code=code):
                    original(fd, sig)
                    if fd == 42613:
                        (
                            Path(str(module.run_path(module.CUSTODY)) + "-launch") / "exit-code.txt"
                        ).write_text(code)

                with (
                    patch.object(module.signal, "pidfd_send_signal", side_effect=different),
                    self.assertRaises(ValueError),
                ):
                    f.execute()
                self.assertFalse((module.OUTPUT / "completed.json").exists())

    def test_records_may_append_naturally_but_cannot_disappear_or_complete_26(self):
        with Fixture() as f:
            path = module.run_path(module.ROOM) / "verification/results.json"
            old = module.read(path)
            f.dump(path, old + [{"index": 1, "seed": 6170001, "gameOver": {"kind": "gameOver"}}])
            module.guard(f.args, f.request, set())
            f.dump(path, [])
            with self.assertRaises(ValueError):
                module.guard(f.args, f.request, set())
            f.dump(
                path,
                [
                    {"index": i, "seed": 6170000 + i, "gameOver": {"kind": "gameOver"}}
                    for i in range(26)
                ],
            )
            with self.assertRaises(ValueError):
                module.guard(f.args, f.request, set())

    def test_descendant_already_dead_only_after_parent_stop(self):
        with Fixture() as f:
            expected = f.request["targets"][1]["processes"][3]
            f.processes[expected["pid"]]["state"] = "Z"
            with self.assertRaises(ValueError):
                module.signal_bound(expected["pid"], expected, parent_stopped=False)
            module.signal_bound(expected["pid"], expected, parent_stopped=True)
            self.assertEqual([], f.events)

    def test_unexpected_esrch_never_accepted_and_fd_is_required(self):
        with Fixture() as f:
            expected = f.request["targets"][0]["processes"][1]
            with (
                patch.object(module.signal, "pidfd_send_signal", side_effect=ProcessLookupError),
                self.assertRaises(ValueError),
            ):
                module.signal_bound(expected["pid"], expected, parent_stopped=False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
