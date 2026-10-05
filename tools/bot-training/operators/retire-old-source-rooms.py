"""Inspect, or ROOT-retire, exact old-source V43 rooms and waiting V44 custody.

Stdlib only. No wrapper/session signals, SIGKILL, model imports or producer writes.
"""

import argparse
import hashlib
import json
import os
import select
import signal
import sys
import time
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
CHECKOUT = LAB / "checkouts/bt26-ex13-2026-10-05-4a1192761-v34"
PREP = LAB / "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation"
OUTPUT = LAB / "runs/2026-10-05-bt26-ex13-old-source-rooms-retirement"
ROOM = "aegis-v43-corrective-room-verification"
CUSTODY = "aegis-v44-current-material-custody"
# Actual read-only inventory, 2026-10-05. Changing a process requires ROOT re-review.
TARGETS = {
    ROOM: {
        "identitySha256": "82aaf0ff1413617b3578286da21416cce4873b5682b8d29a691ca09f4e4d3170",
        "operatorSha256": "3d4d4c87a110c334d2360d0ead28d6fc80c84e77e762a8d4927a07c62b72060e",
        "wrapperSha256": "ec501cc986999769cf0cfb019e33915d223d7a4dd4001e37ac89ff1e58a4024e",
        "processes": [
            (13781, "690018"),
            (13787, "690019"),
            (243542, "3761891"),
            (243554, "3762129"),
        ],
        "files": {
            "operator.py",
            "physical-launch-identity.json",
            "queued.json",
            "started.json",
            "room-process.json",
            "rooms.log",
            "verification/config.json",
            "verification/results.json",
        },
        "dirs": ["verification"],
    },
    CUSTODY: {
        "identitySha256": "40f8a758b896a515106a4f4f882a53e52b69bcecbf8b20ad691f3fbef81610df",
        "operatorSha256": "da832d7cca2ab5d4d57dc9c93cc746451099beb6c68bd572f11a84451cfc52a4",
        "wrapperSha256": "43d9efab6a1fef92142d1c758cdf57deb6ca3cff63d17b0b4693f4b33c54fd8e",
        "processes": [(42607, "1003480"), (42613, "1003481")],
        "files": {"extractor.py", "operator.py", "queued.json", "room-launch-identity.json"},
        "dirs": [],
    },
}
CHECKPOINTS = {
    "2026-10-05-bt26-ex13-v35-fixed-engine-migration/v17-reference.pt": "045b5023bc5fc130d6e71d8eae60b2d3913dd5ed5ee107784a0712cbffb4d8d1",
    "2026-10-05-bt26-ex13-v35-fixed-engine-migration/source-challenger.pt": "3c694bdb2950a8995c07163143c432726e016ee02882c41e4be4199abe3788f0",
    "2026-10-05-bt26-ex13-v35-fixed-engine-migration/challenger.pt": "a66ec24c1e5a771e690d05fb2dae450dc3f8afe38ad2fd5ee38c6462c4e4fe06",
    "2026-10-05-bt26-ex13-v40-fixed-corrective-ppo/ppo/checkpoint.pt": "e55bcc120fde22352ad6e65aa5538a32b0130414df7f11cf120fb622630bbd4b",
}
CHALLENGER = LAB / "runs/2026-10-05-bt26-ex13-v40-fixed-corrective-ppo/ppo/checkpoint.pt"
PROTECTED = {
    "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/runtime-files.json": "e0e1b4213cd4b09cd38f7b656ba66dff2824b14968fcbc35ec4ccb349caf9964",
    "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/source-manifest.json": "84fe3eb0fbe89b1a340c629850e389b449893c33ccda258bb8ee056fb38a4538",
    "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/prior-python-source.json": "719f1bc58f4ed92c1a015469c392ca6f84a192715ad55e06f3a3b81d10f3b58c",
    "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/metadata.json": "ad47c04837e704e8764f3d8ab0ac2129c4acba4ebe476da87336f003fc6372ca",
    "runs/2026-10-05-bt26-ex13-v34-fixed-runtime-preparation/curriculum.json": "0a6bc54edbbea05ded51e57296ff0881e7efc312764b8f920873c3fddd1fe8cb",
    "checkouts/bt26-ex13-2026-10-05-4a1192761-v34/tools/bot-training/room-smoke.mjs": "970a4a6059ff65b648d229c1019f6ad257b30838d6266d7b959a33555f2a3117",
    "checkouts/bt26-ex13-2026-10-05-4a1192761-v34/tools/bot-training/inference.py": "6c2907b037954f7f421a46f080ad554ecfcfed6a4e6bda6db83eb6b81552acf7",
    "checkouts/bt26-ex13-2026-10-05-4a1192761-v34/tools/bot-training/features.py": "4a56127de79b1621728fdb79854c166e885576f24c988fbb2bc7c0fa7ea6fdc7",
    "checkouts/bt26-ex13-2026-10-05-4a1192761-v34/tools/bot-training/model.py": "c8f5dc9b6af9a80b095421a47bcfea5964f17116246e1ffd5c49dcf2f9911402",
}
DEPENDENCIES = {
    "aegis-v41-corrective-fresh-comparison": (
        "7f143fb777f5ace7a51eea5df76618fe3d580239bb5bb3489209dec26f689821",
        "be218d5bdfa6ce535b77aeff98d7a01d5195792875b2dd0d6866750e19051a9b",
        "fresh-report.json",
        "52faf4bb8086d10ecfde6e48a64fae163616c8800094fc672aa1edc987442c7d",
    ),
    "aegis-v42-corrective-physical-comparison": (
        "b004a7393fdd9e87280674bca139a8e302974abed5b232151bcded95f4b69a4b",
        "0d6f7eaf9a7368376f4c76414d1caa7c1f0a3161e6326fe59215203804085d49",
        "physical-report.json",
        "b8cef3a190c740b68b454b7de3c451c21090f94e4b4ec1b12a82d126caad081c",
    ),
}
EXTRACTOR_SHA = "ba2bd72bc3673834bb0c8410bbab3ca7b57c09ed007f9801685088c31d3bfb61"
DYNAMIC = {"rooms.log", "verification/results.json"}


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def safe(path: Path) -> None:
    require(path.is_absolute(), "Absolute path required")
    require(all(not p.is_symlink() for p in (path, *path.parents)), "Symlink provenance")


def digest(path: Path) -> str:
    safe(path)
    require(path.is_file(), f"Expected regular file: {path}")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def read(path: Path) -> Any:
    digest(path)
    return json.loads(path.read_text(encoding="utf-8"))


def process(pid: int, *, details: bool = True) -> dict | None:
    require(type(pid) is int and pid > 0, "Invalid PID")
    path = Path("/proc") / str(pid)
    if not path.exists():
        return None
    # /proc can disappear between inspection and read; never substitute another PID.
    try:
        raw = (path / "stat").read_text(encoding="utf-8")
        fields = raw[raw.rindex(")") + 2 :].split()
        if fields[0] == "Z" or not details:
            return {
                "pid": pid,
                "ppid": int(fields[1]),
                "startTicks": fields[19],
                "state": fields[0],
            }
        return {
            "pid": pid,
            "ppid": int(fields[1]),
            "state": fields[0],
            "startTicks": fields[19],
            "argv": [a.decode() for a in (path / "cmdline").read_bytes().split(b"\0") if a],
            "cwd": str((path / "cwd").resolve()),
            "cpuEnv": sorted(
                a.decode()
                for a in (path / "environ").read_bytes().split(b"\0")
                if a.startswith(
                    (b"CUDA_VISIBLE_DEVICES=", b"OMP_NUM_THREADS=", b"MKL_NUM_THREADS=")
                )
            ),
        }
    except (FileNotFoundError, ProcessLookupError):
        return None


def live(info: dict | None) -> bool:
    return info is not None and info["state"] != "Z"


def descendants(parent: int) -> set[int]:
    processes = {}
    for path in Path("/proc").iterdir():
        if path.name.isdecimal():
            info = process(int(path.name), details=False)
            if live(info):
                processes[info["pid"]] = info
    found = set()
    for pid, info in processes.items():
        ancestor, seen = info["ppid"], set()
        while ancestor in processes and ancestor != parent and ancestor not in seen:
            seen.add(ancestor)
            ancestor = processes[ancestor]["ppid"]
        if pid != parent and ancestor == parent:
            found.add(pid)
    return found


def run_path(stem: str) -> Path:
    require(stem in TARGETS or stem in DEPENDENCIES, "Unexpected operator")
    return LAB / "runs" / ("2026-10-05-bt26-ex13-" + stem.removeprefix("aegis-"))


def tree(run: Path) -> tuple[dict, list]:
    safe(run)
    require(run.is_dir(), "Missing run directory")
    files, directories = {}, []
    for path in sorted(run.rglob("*")):
        safe(path)
        name = str(path.relative_to(run))
        if path.is_dir():
            directories.append(name)
        else:
            files[name] = digest(path)
    return files, directories


def protected() -> None:
    for name, expected in PROTECTED.items():
        require(digest(LAB / name) == expected, f"Protected source/map changed: {name}")
    for name, expected in CHECKPOINTS.items():
        require(digest(LAB / "runs" / name) == expected, "Original checkpoint changed")
    for stem, (identity_sha, completion_sha, report, report_sha) in DEPENDENCIES.items():
        identity_file = LAB / "transfers" / (stem + "-launch-identity.json")
        require(digest(identity_file) == identity_sha, "Dependency identity changed")
        identity = read(identity_file)
        run = run_path(stem)
        require(identity["run"] == run.name, "Dependency run changed")
        info = process(identity["wholeWrapperPid"])
        require(
            not live(info) or info["startTicks"] != identity["startTicks"],
            "Dependency whole still live",
        )
        launch = Path(str(run) + "-launch")
        require(
            digest(launch / "exit-code.txt")
            and (launch / "exit-code.txt").read_text(encoding="utf-8").strip() == "0",
            "Dependency whole not zero",
        )
        require(
            digest(launch / "launch.sh") == identity["wrapperSha256"], "Dependency wrapper changed"
        )
        require(
            digest(run / "operator.py") == identity["operatorSha256"], "Dependency operator changed"
        )
        require(
            digest(run / "completion.json") == completion_sha
            and digest(run / report) == report_sha,
            "Actual dependency proof changed",
        )


def node_command() -> list[str]:
    return [
        "node",
        str(CHECKOUT / "tools/bot-training/room-smoke.mjs"),
        "--checkpoint",
        str(CHALLENGER),
        "--python",
        str(LAB / "venv/bin/python"),
        "--output",
        str(run_path(ROOM) / "verification"),
        "--games",
        "26",
        "--seed",
        "6170000",
        "--match-timeout-ms",
        "600000",
    ]


def commands(stem: str) -> list[list[str]]:
    transfer = LAB / "transfers"
    pin = TARGETS[stem]
    values = [
        ["bash", str(transfer / (stem + "-launch.sh"))],
        [str(LAB / "venv/bin/python"), "-u", str(transfer / (stem + ".py")), pin["operatorSha256"]],
    ]
    if stem == ROOM:
        values += [
            node_command(),
            [
                str(LAB / "venv/bin/python"),
                str(CHECKOUT / "tools/bot-training/inference.py"),
                "--checkpoint",
                str(CHALLENGER),
                "--device",
                "cpu",
            ],
        ]
    return values


def same_process(actual: dict | None, expected: dict, *, orphan: bool = False) -> None:
    require(live(actual), "Captured process no longer live")
    keys = ("pid", "startTicks", "argv", "cwd", "cpuEnv")
    require(
        all(actual[k] == expected[k] for k in keys), "PID reuse/command/module/environment changed"
    )
    if actual["ppid"] != expected["ppid"]:
        require(orphan and not live(process(expected["ppid"])), "Unexpected parent change")
    require(actual["state"] in {"S", "R", "D"}, "Unexpected process state")


def records(run: Path) -> list:
    result = read(run / "verification/results.json")
    require(type(result) is list and len(result) < 26, "Old rooms finished; not retirement scope")
    require(
        all(
            r.get("index") == i
            and r.get("seed") == 6170000 + i
            and r.get("gameOver", {}).get("kind") == "gameOver"
            for i, r in enumerate(result)
        ),
        "Unexpected natural room records",
    )
    return result


def validate(row: dict, *, running: bool | None) -> None:
    stem = row["stem"]
    require(stem in TARGETS, "Unexpected target")
    pin, run = TARGETS[stem], run_path(stem)
    identity_file = LAB / "transfers" / (stem + "-launch-identity.json")
    require(
        digest(identity_file) == pin["identitySha256"] == row["identitySha256"]
        and read(identity_file) == row["identity"],
        "Identity changed",
    )
    identity = row["identity"]
    expected_identity = {k: pin[k] for k in ("operatorSha256", "wrapperSha256")}
    expected_identity.update(
        run=run.name, wholeWrapperPid=pin["processes"][0][0], startTicks=pin["processes"][0][1]
    )
    require(identity == expected_identity, "Unexpected original identity")
    launch = Path(str(run) + "-launch")
    safe(launch)
    require(launch.is_dir(), "Missing launch")
    require(
        digest(run / "operator.py")
        == digest(LAB / "transfers" / (stem + ".py"))
        == pin["operatorSha256"],
        "Operator bytes changed",
    )
    require(
        digest(launch / "launch.sh")
        == digest(LAB / "transfers" / (stem + "-launch.sh"))
        == pin["wrapperSha256"],
        "Wrapper bytes changed",
    )
    require(
        {p.name for p in launch.iterdir()} <= {"launch.sh", "launch.log", "exit-code.txt"},
        "Unexpected launch artifacts",
    )
    for p in launch.iterdir():
        digest(p)
    files, directories = tree(run)
    require(
        set(files) == set(row["files"]) == pin["files"]
        and directories == row["dirs"] == pin["dirs"],
        "Started custody/new output/directory",
    )
    stable = set(files) - (DYNAMIC if stem == ROOM else set())
    require(all(files[n] == row["files"][n] for n in stable), "Immutable producer inputs changed")
    if stem == ROOM:
        result = records(run)
        require(
            result[: len(row["completedRecords"])] == row["completedRecords"],
            "Natural partial records changed/lost",
        )
        log = run / "rooms.log"
        require(log.stat().st_size >= row["logPrefix"]["bytes"], "Partial log truncated")
        with log.open("rb") as stream:
            require(
                hashlib.sha256(stream.read(row["logPrefix"]["bytes"])).hexdigest()
                == row["logPrefix"]["sha256"],
                "Partial log prefix changed",
            )
        start = read(run / "started.json")
        require(
            start["completed"] is False
            and start["actualLearningUpdates"] == 0
            and start["futureBlind6210000Untouched"] is True,
            "Not active read-only room verification",
        )
        require(
            start["command"] == node_command()
            and start["cwd"] == str(CHECKOUT)
            and start["checkpointSha256"] == CHECKPOINTS[str(CHALLENGER.relative_to(LAB / "runs"))],
            "Started checkpoint/command changed",
        )
        require(
            start["coordinatorPid"] == pin["processes"][1][0]
            and start["coordinatorStartTicks"] == pin["processes"][1][1],
            "Room operator binding",
        )
        require(
            read(run / "room-process.json")
            == {
                "pid": pin["processes"][2][0],
                "startTicks": pin["processes"][2][1],
                "command": node_command(),
            },
            "Room subprocess binding",
        )
    else:
        queued = read(run / "queued.json")
        require(
            queued.get("actualLearningUpdates") == 0
            and queued.get("analysisStarted") is False
            and queued.get("torchImported") is False
            and queued.get("futureBlind6210000Untouched") is True
            and queued.get("operatorSha256") == pin["operatorSha256"]
            and queued.get("waitingForWholeRooms")
            == read(LAB / "transfers" / (ROOM + "-launch-identity.json"))
            and queued.get("extractorSha256") == digest(run / "extractor.py") == EXTRACTOR_SHA,
            "Custody no longer waiting-only",
        )
    require(len(row["processes"]) == len(pin["processes"]), "Unexpected process count")
    for index, expected in enumerate(row["processes"]):
        require(
            (expected["pid"], expected["startTicks"]) == pin["processes"][index]
            and expected["argv"] == commands(stem)[index],
            "Request process/argv not approved",
        )
        if index:
            require(
                expected["ppid"] == row["processes"][index - 1]["pid"], "Request parentage changed"
            )
        if index >= 2:
            require(expected["cwd"] == str(CHECKOUT), "Scorer module path changed")
    if running is True:
        require(
            not (launch / "exit-code.txt").exists() and not (launch / "exit-code.txt").is_symlink(),
            "Target whole already exited",
        )
        for expected in row["processes"]:
            same_process(process(expected["pid"]), expected)
        require(
            descendants(pin["processes"][0][0]) == {p["pid"] for p in row["processes"][1:]},
            "Unapproved descendant/model/training",
        )
    elif running is False:
        require(
            digest(launch / "exit-code.txt")
            and (launch / "exit-code.txt").read_text(encoding="utf-8").strip() == "143",
            "Actual intentional whole 143 required",
        )
        for expected in row["processes"]:
            require(gone(expected), "Captured producer/wrapper still live")


def gone(expected: dict) -> bool:
    # Exiting processes can deny environ/cwd while still live: stat alone decides.
    actual = process(expected["pid"], details=False)
    require(actual is None or actual["startTicks"] == expected["startTicks"], "Captured PID reused")
    return not live(actual)


def inventory() -> dict:
    protected()
    rows = []
    for stem in (CUSTODY, ROOM):
        run = run_path(stem)
        files, directories = tree(run)
        row = {
            "stem": stem,
            "identitySha256": TARGETS[stem]["identitySha256"],
            "identity": read(LAB / "transfers" / (stem + "-launch-identity.json")),
            "processes": [process(pid) for pid, _ in TARGETS[stem]["processes"]],
            "files": files,
            "dirs": directories,
        }
        if stem == ROOM:
            row["completedRecords"] = records(run)
            log = run / "rooms.log"
            raw = log.read_bytes()
            row["logPrefix"] = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
        validate(row, running=True)
        rows.append(row)
    return {
        "formatVersion": 1,
        "scope": "retire-old-source-readonly-rooms-and-waiting-custody",
        "targets": rows,
    }


def write(path: Path, value: dict) -> None:
    safe(path)
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2, sort_keys=True)
        stream.write("\n")
        stream.flush()
        os.fsync(stream.fileno())


def bind(args: argparse.Namespace) -> dict:
    require(
        __debug__ and digest(Path(__file__).absolute()) == args.self_sha256,
        "Controller changed/optimized",
    )
    require(digest(args.request) == args.request_sha256, "ROOT-pinned request changed")
    request = read(args.request)
    require(
        request["formatVersion"] == 1
        and request["scope"] == "retire-old-source-readonly-rooms-and-waiting-custody"
        and [r["stem"] for r in request["targets"]] == [CUSTODY, ROOM],
        "Exact two targets/order required",
    )
    return request


def guard(args: argparse.Namespace, request: dict, retired: set[str]) -> None:
    require(bind(args) == request, "Request content changed")
    protected()
    for row in request["targets"]:
        validate(row, running=row["stem"] not in retired)


def wait_dead(expected: dict) -> None:
    deadline = time.monotonic() + 30
    while not gone(expected) and time.monotonic() < deadline:
        time.sleep(0.1)
    require(gone(expected), "SIGTERM did not stop captured process; no force/retry")


def closed(row: dict) -> None:
    for expected in row["processes"]:
        wait_dead(expected)
    exit_file = Path(str(run_path(row["stem"])) + "-launch") / "exit-code.txt"
    deadline = time.monotonic() + 30
    while not exit_file.exists() and time.monotonic() < deadline:
        time.sleep(0.1)
    validate(row, running=False)


def signal_bound(fd: int, expected: dict, *, parent_stopped: bool) -> bool:
    # poll the opened handle; ESRCH is allowed only after parent stop + actual death.
    poller = select.poll()
    poller.register(fd, select.POLLIN)
    dead_handle = bool(poller.poll(0))
    if gone(expected):
        require(parent_stopped and dead_handle, "Process died before approved parent stop")
        return False
    require(not dead_handle, "Opened handle exited while numeric PID stayed live")
    same_process(process(expected["pid"]), expected, orphan=parent_stopped)
    try:
        signal.pidfd_send_signal(fd, signal.SIGTERM)
    except ProcessLookupError:
        require(parent_stopped and gone(expected) and bool(poller.poll(0)), "Unexpected ESRCH")
        return False
    return True


def execute(args: argparse.Namespace, request: dict) -> None:
    require(
        args.execute_token == f"retire-old-source-rooms:{args.request_sha256}:{args.self_sha256}",
        "Explicit ROOT execute token required",
    )
    require(
        hasattr(os, "pidfd_open") and hasattr(signal, "pidfd_send_signal"), "Linux pidfd required"
    )
    safe(OUTPUT)
    require(
        OUTPUT.parent.is_dir() and not OUTPUT.exists(),
        "Exclusive retirement output; never blind retry",
    )
    handles = {}
    retired: set[str] = set()
    try:
        # Open ALL four captured child handles while every original ancestor lives.
        for row in request["targets"]:
            for child in row["processes"][1:]:
                handles[child["pid"]] = os.pidfd_open(child["pid"])
        guard(args, request, retired)
        OUTPUT.mkdir()
        (OUTPUT / "controller.py").write_bytes(Path(__file__).read_bytes())
        (OUTPUT / "request.json").write_bytes(args.request.read_bytes())
        write(
            OUTPUT / "requested.json",
            {
                "controllerSha256": args.self_sha256,
                "requestSha256": args.request_sha256,
                "signalPids": list(handles),
                "wholeWrappersNeverSignalled": True,
                "oldSourcePartialOnly": True,
            },
        )
        guard(args, request, retired)  # Revalidate AFTER external receipt, before ANY signal.
        for row in request["targets"]:
            stem = row["stem"]
            write(
                OUTPUT / (stem + "-requested.json"),
                {
                    "identity": row["identity"],
                    "capturedChildren": row["processes"][1:],
                    "filesBefore": tree(run_path(stem))[0],
                },
            )
            guard(args, request, retired)
            for index, child in enumerate(row["processes"][1:]):
                # Operator first so its original whole trap records intentional 143.
                if index:
                    require(bind(args) == request, "Binding changed after ancestor stop")
                    protected()
                    validate(row, running=None)
                    for parent in row["processes"][1 : index + 1]:
                        require(gone(parent), "Ancestor still live")
                    actual_desc = descendants(child["pid"]) if not gone(child) else set()
                    require(
                        actual_desc <= {p["pid"] for p in row["processes"][index + 2 :]},
                        "New descendant after ancestor stop",
                    )
                signal_sent = signal_bound(handles[child["pid"]], child, parent_stopped=index > 0)
                write(
                    OUTPUT / (str(child["pid"]) + "-signalled.json"),
                    {
                        "process": child,
                        "signal": "SIGTERM",
                        "signalSent": signal_sent,
                        "alreadyDeadAfterParentStop": not signal_sent,
                    },
                )
                wait_dead(child)
            closed(row)
            retired.add(stem)
            write(
                OUTPUT / (stem + "-completed.json"),
                {
                    "wholeExit": 143,
                    "intentionalRetirement": True,
                    "noQualificationClaim": True,
                    "producerFiles": tree(run_path(stem))[0],
                },
            )
        guard(args, request, retired)
        # Maps/raw hashes are FINAL only after all captured producers and wrappers stop.
        final = {row["stem"]: tree(run_path(row["stem"]))[0] for row in request["targets"]}
        time.sleep(0.2)
        guard(args, request, retired)
        require(
            final == {row["stem"]: tree(run_path(row["stem"]))[0] for row in request["targets"]},
            "Post-stop output map still changed",
        )
        write(
            OUTPUT / "completed.json",
            {
                "intentionalWholeExits": {CUSTODY: 143, ROOM: 143},
                "finalProducerMaps": final,
                "naturalCompletedRoomRecords": records(run_path(ROOM)),
                "sourceMapsAndFourCheckpointsUnchanged": True,
                "noSuccessfulQualificationOrMasteryClaim": True,
                "requiresNewTrainedCandidateValidation": True,
            },
        )
        sys.stdout.write(
            json.dumps(
                {"retired": [CUSTODY, ROOM], "receiptSha256": digest(OUTPUT / "completed.json")}
            )
            + "\n"
        )
    except Exception as exc:
        # CLI execution boundary: keep every partial receipt, never resume automatically.
        if OUTPUT.is_dir() and not OUTPUT.is_symlink() and not (OUTPUT / "failed.json").exists():
            write(
                OUTPUT / "failed.json",
                {
                    "error": str(exc),
                    "retiredBeforeFailure": sorted(retired),
                    "noBlindRetry": True,
                    "noSuccessClaim": True,
                },
            )
        raise
    finally:
        for fd in handles.values():
            os.close(fd)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-sha256", required=True)
    parser.add_argument(
        "--inventory", action="store_true", help="Read-only validated request inventory to stdout"
    )
    parser.add_argument("--request", type=Path)
    parser.add_argument("--request-sha256")
    parser.add_argument(
        "--execute-token", help="Absent by default: inspect only, no writes/signals"
    )
    args = parser.parse_args()
    require(
        digest(Path(__file__).absolute()) == args.self_sha256 and __debug__, "Unreviewed controller"
    )
    if args.inventory:
        require(
            args.request is None and args.request_sha256 is None and args.execute_token is None,
            "Inventory is read-only",
        )
        sys.stdout.write(json.dumps(inventory(), indent=2, sort_keys=True) + "\n")
        return
    require(
        args.request is not None and args.request_sha256 is not None,
        "Sealed request and exact SHA required",
    )
    request = bind(args)
    guard(args, request, set())
    if args.execute_token is None:
        sys.stdout.write(
            json.dumps(
                {
                    "inspectOnly": True,
                    "validatedTargets": [CUSTODY, ROOM],
                    "jobsSignalled": 0,
                    "writes": 0,
                }
            )
            + "\n"
        )
        return
    execute(args, request)


if __name__ == "__main__":
    main()
