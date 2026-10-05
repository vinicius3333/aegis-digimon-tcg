"""ROOT reconcile the exact preserved failed retirement, with ZERO process signals.

All six originally captured processes must already be absent/zombies and both
original whole traps must be 143. Any live/reused process rejects this contract.
"""

import argparse
import hashlib
import json
import sys
import time
import types
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
FAILED = LAB / "runs/2026-10-05-bt26-ex13-old-source-rooms-retirement"
OUTPUT = LAB / "runs/2026-10-05-bt26-ex13-old-source-rooms-retirement-reconciliation"
FILES = {
    "13787-signalled.json": "b0c63f5ef04cb56f514e3fcd4ba4aefdcfdc8e5036b39e29ba7518b0555a8860",
    "42613-signalled.json": "c2a717d2a76052845a48fdccd42e0aff173449bd2d065840f79984dcd8d922c3",
    "aegis-v43-corrective-room-verification-requested.json": "3d39143d78c1acb4b2edb896755282a4704d9488d674b46af98e1a5a22a2ec44",
    "aegis-v44-current-material-custody-completed.json": "01453a38314e6c21c367cb958e7a194f7517ae1e1c114708060e1c237e1361a3",
    "aegis-v44-current-material-custody-requested.json": "f05656e19e864217f0aeaeaffd9c708b635b65e3b7337aadb2b3290a16afdc19",
    "controller.py": "7965028edb4632ef20fec1748664d72b554af4693a822f3f7a5304d9626225f7",
    "failed.json": "e26397c4bffc5d6d21a8842e6f8e0cccb48d1d989374b6874a554edf6651ac49",
    "request.json": "1201649af1d39320bd03d92447382e0dac4f7691716aa753302872dd89ee5acb",
    "requested.json": "fbd5bb776df6f60753881ac6c79956b16fec6f75a9b8bd3ed277818d0f18ad42",
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load_original() -> Any:
    # All original helper imports are stdlib; module import never runs its CLI.
    source = FAILED / "controller.py"
    require(
        source.is_file() and all(not p.is_symlink() for p in (source, *source.parents)),
        "Original controller missing/link",
    )

    raw = source.read_bytes()
    require(
        hashlib.sha256(raw).hexdigest() == FILES["controller.py"], "Original controller changed"
    )
    # Direct execution of the checked bytes never writes a __pycache__ in FAILED.
    original = types.ModuleType("original_failed_retirement")
    original.__file__ = str(source)
    exec(compile(raw, str(source), "exec"), original.__dict__)  # noqa: S102 - exact sealed stdlib helper bytes.
    require(original.LAB == LAB and original.OUTPUT == FAILED, "Original path binding changed")
    return original


def already_dead(original: Any, expected: dict) -> None:
    # No environ/cwd reads on an exiting process; non-zombie remains LIVE/rejected.
    actual = original.process(expected["pid"], details=False)
    require(actual is None or actual["startTicks"] == expected["startTicks"], "Captured PID reused")
    require(
        not original.live(actual), "Captured process still live: no resume signal authorized here"
    )


def guard(original: Any, self_sha: str) -> tuple[dict, dict]:
    require(
        __debug__ and original.digest(Path(__file__).absolute()) == self_sha,
        "Reconciliation source changed/optimized",
    )
    files, dirs = original.tree(FAILED)
    require(files == FILES and dirs == [], "Preserved failed namespace changed")
    require(
        original.read(FAILED / "failed.json")["error"]
        == "[Errno 13] Permission denied: '/proc/13787/environ'",
        "Different failure requires review",
    )
    request = original.read(FAILED / "request.json")
    require(
        request["formatVersion"] == 1
        and [r["stem"] for r in request["targets"]] == [original.CUSTODY, original.ROOM],
        "Original target order changed",
    )
    original.protected()
    for row in request["targets"]:
        for expected in row["processes"]:
            already_dead(original, expected)
        # Original strict file/prefix/whole143 guards, never its execution function.
        original.validate(row, running=False)
    maps = {
        row["stem"]: original.tree(original.run_path(row["stem"]))[0] for row in request["targets"]
    }
    return request, maps


def reconcile(original: Any, args: argparse.Namespace) -> None:
    require(
        args.execute_token == f"reconcile-old-source-rooms:{args.self_sha256}",
        "Exact ROOT reconciliation token required",
    )
    original.safe(OUTPUT)
    require(
        OUTPUT.parent.is_dir() and not OUTPUT.exists(),
        "Exclusive reconciliation output; no blind retry",
    )
    guard(original, args.self_sha256)
    OUTPUT.mkdir()
    try:
        with (OUTPUT / "controller.py").open("xb") as stream:
            stream.write(Path(__file__).read_bytes())
        original.write(
            OUTPUT / "requested.json",
            {
                "controllerSha256": args.self_sha256,
                "originalNamespaceFiles": FILES,
                "processSignals": 0,
                "originalFailurePreserved": True,
            },
        )
        request, final_maps = guard(original, args.self_sha256)
        time.sleep(0.2)
        _, after = guard(original, args.self_sha256)
        require(final_maps == after, "Post-stop producer maps still changing")
        original.write(
            OUTPUT / "completed.json",
            {
                "controllerSha256": args.self_sha256,
                "originalNamespaceFiles": FILES,
                "intentionalWholeExits": {original.CUSTODY: 143, original.ROOM: 143},
                "processSignals": 0,
                "capturedProcessesAlreadyGoneOrZombie": [
                    p for row in request["targets"] for p in row["processes"]
                ],
                "finalProducerMaps": final_maps,
                "naturalCompletedRoomRecords": original.records(original.run_path(original.ROOM)),
                "sourceMapsAndFourCheckpointsUnchanged": True,
                "originalFailurePreserved": True,
                "noSuccessfulQualificationOrMasteryClaim": True,
                "requiresNewTrainedCandidateValidation": True,
            },
        )
        guard(original, args.self_sha256)
        sys.stdout.write(
            json.dumps(
                {
                    "reconciledIntentionalRetirement": True,
                    "processSignals": 0,
                    "receiptSha256": original.digest(OUTPUT / "completed.json"),
                }
            )
            + "\n"
        )
    except Exception as exc:
        if OUTPUT.is_dir() and not OUTPUT.is_symlink() and not (OUTPUT / "failed.json").exists():
            original.write(
                OUTPUT / "failed.json",
                {"error": str(exc), "noBlindRetry": True, "originalFailurePreserved": True},
            )
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-sha256", required=True)
    parser.add_argument("--execute-token", help="Absent by default: read-only inspection")
    args = parser.parse_args()
    original = load_original()
    guard(original, args.self_sha256)
    if args.execute_token is None:
        sys.stdout.write(
            json.dumps(
                {"inspectOnly": True, "bothActualWholeExits": 143, "processSignals": 0, "writes": 0}
            )
            + "\n"
        )
        return
    reconcile(original, args)


if __name__ == "__main__":
    main()
