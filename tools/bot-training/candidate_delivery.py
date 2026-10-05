"""Explicit ROOT-gated V50/V49 candidate packaging and original managed-room replay.

This stdlib adapter never schedules itself and never admits a model for production.
The SHA-pinned original readers establish actual whole closure, not mocked flags.
"""

import argparse
import ast
import hashlib
import importlib.metadata
import importlib.util
import json
import math
import os
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
V49 = LAB / "runs/2026-10-05-bt26-ex13-v49-latest-engine-migration"
V50 = LAB / "runs/2026-10-05-bt26-ex13-v50-integrated-runtime-qualification"
CHECKOUT = LAB / "checkouts/bt26-ex13-2026-10-05-7d34b4c12-v50"
SOURCE = "7d34b4c1267e0bc266736e61b43cb28debf598ee"
ARCHIVE_SHA = "a7dada720768672287b2af577f64b383f2b71e2eba73a5bb6ebc21dbccd0f021"
DELIVERY_SHA = "3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64"
V49_SHA = "bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf"
V50_SHA = "4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c"
V49_ID = "a9e62d915f08e55c998bfeca7874cdca5fdbf97238b08d1c32a655fd09c45f63"
ORIGIN_SHA = "e55bcc120fde22352ad6e65aa5538a32b0130414df7f11cf120fb622630bbd4b"
V40_RECEIPT = LAB / "runs/2026-10-05-bt26-ex13-v40-fixed-corrective-ppo/receipt.json"
V40_RECEIPT_SHA = "47d2b2cc2961395a7a3491a17c4f7149deb1c87ee3ba00621b1830dbde70ab55"
QUERY_SHA = "f4f3a13f7efcd80935955d5bc7ed714fa1e1991cf7cb6f63e1da85c4ddefc0c5"
LABELS = {"v17-reference", "source-challenger", "fitted-reference", "challenger"}
ROOM_HELPERS = {
    LAB
    / "transfers/aegis-v43-corrective-room-verification.py": "3d4d4c87a110c334d2360d0ead28d6fc80c84e77e762a8d4927a07c62b72060e",
    LAB
    / "runs/2026-10-05-bt26-ex13-v37-fixed-room-verification/operator.py": "02a34e12fb2be3b59d56edd50d4d1c35eea7018649302b17ccd41e61e01a570f",
    LAB
    / "transfers/aegis-v25-room-verification.py": "576d698cd361e4ca8a3dae44137cd4257cc1fa6f842163a9ca97c748c6f56f7c",
    LAB
    / "runs/2026-10-04-bt26-ex13-v19b-room-verification/operator.py": "6cdb2241f06a4ec6d16fa6ae94e58f0141c199abd2efaff15140fab5d48f6f11",
}
ROOM_SHA = "970a4a6059ff65b648d229c1019f6ad257b30838d6266d7b959a33555f2a3117"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def valid_hash(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch("[a-f0-9]{64}", value) is not None


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        require(key not in result, "Duplicate JSON key")
        result[key] = value
    return result


def invalid_constant(value: str) -> Any:
    raise ValueError(f"Nonfinite JSON: {value}")


def read(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=invalid_constant,
    )


def write(path: Path, value: Any) -> None:
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n")


def checked_path(value: Any, expected: Path | None = None) -> Path:
    require(isinstance(value, str), "Null or invalid path")
    path = Path(value)
    require(
        path.is_absolute() and path.exists() and not path.is_symlink(),
        "Missing/relative/symlink path",
    )
    require(expected is None or path == expected, "Unexpected actual path")
    return path


def pinned(path: Path, sha: Any) -> None:
    require(valid_hash(sha) and path.is_file() and digest(path) == sha, "Null/mismatched file pin")


def load_reader(item: dict[str, Any], expected: Path) -> ModuleType:
    path = checked_path(item["path"], expected)
    pinned(path, item["sha256"])
    spec = importlib.util.spec_from_file_location(expected.stem.replace("-", "_"), path)
    require(spec is not None and spec.loader is not None, "Missing closure module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def host_check(node: str) -> dict[str, Any]:
    require(platform.python_version() == "3.12.14", "Use actual supported Python 3.12.14")
    require(
        Path(sys.executable).absolute() == LAB / "venv/bin/python",
        "Use the preserved lab venv entry",
    )
    node_path = shutil.which(node)
    require(node_path is not None, "Missing Node executable")
    version = subprocess.run(
        [node_path, "--version"], check=True, capture_output=True, text=True, timeout=30
    ).stdout.strip()
    require(version == "v26.10.0", "Use supported Node 26.10.0")
    packages = {name: importlib.metadata.version(name) for name in ("torch", "numpy", "click")}
    require(
        packages == {"torch": "2.7.1+cu128", "numpy": "2.2.6", "click": "8.1.8"},
        "Lab package identities differ",
    )
    require(
        "torch" not in sys.modules and __debug__,
        "Unsafe model import or optimized closure interpreter",
    )
    return {
        "node": node_path,
        "nodeVersion": version,
        "python": sys.executable,
        "packages": packages,
    }


def preflight(request_path: Path, request_sha: str) -> dict[str, Any]:
    """Read-only; all future/null pins fail before copying or scorer imports."""
    sys.dont_write_bytecode = True
    adapter_sha = digest(Path(__file__))
    pinned(request_path, request_sha)
    request = read(request_path)
    require(request["formatVersion"] == 1, "Request interface version")
    for label in ("v49", "v50"):
        item = request[label]
        for key in ("identitySha256", "completionSha256", "reportSha256"):
            require(valid_hash(item[key]), "Actual closed pins required; no future placeholders")
        require(valid_hash(item["operator"]["sha256"]), "Actual sealed reader SHA required")
    require(
        request["v49"]["operator"]["sha256"] == V49_SHA
        and request["v49"]["identitySha256"] == V49_ID,
        "Original V49 identity changed",
    )
    require(request["v50"]["operator"]["sha256"] == V50_SHA, "Sealed reviewed V50 operator changed")
    host = host_check(request["node"])
    v50 = load_reader(
        request["v50"]["operator"], LAB / "transfers/aegis-v50-integrated-runtime-qualification.py"
    )
    v49 = load_reader(
        request["v49"]["operator"], LAB / "transfers/aegis-v49-latest-engine-migration.py"
    )
    require(
        v50.RUN == V50
        and v50.CHECKOUT == CHECKOUT
        and v50.COMMIT == SOURCE
        and v50.ARCHIVE_SHA == ARCHIVE_SHA,
        "Latest source identity mismatch",
    )
    current = v50.closed(request["v50"]["identitySha256"])
    prior = v49.closed_migration(request["v49"]["identitySha256"])
    for label, actual in (("v50", current), ("v49", prior)):
        for key in ("identitySha256", "completionSha256", "reportSha256"):
            require(actual[key] == request[label][key], "Actual closure differs from ROOT pin")
    pinned(V49 / "report.json", prior["reportSha256"])
    pinned(V50 / "report.json", current["reportSha256"])
    require(
        current["sourceCommit"] == SOURCE and current["cpuRuntimeQualified"] is True,
        "Latest runtime is not closed/qualified",
    )
    require(
        current["actualPrimaryModelOrCudaParityQualified"] is False
        and current["strengthPhysicalRoomCustodyAcceptance"] is False
        and current["finalBlindAccepted"] is False
        and current["noPromotionClaim"] is True,
        "Do not reinterpret runtime closure as model acceptance",
    )
    require(current["engineSha256"] == prior["engineSha256"], "Migration/runtime engine mismatch")
    bindings = current["checkpointBindings"]
    require(
        set(bindings) == set(prior["checkpointHashes"]) == LABELS,
        "Missing preserved checkpoint binding",
    )
    for label, record in bindings.items():
        path = checked_path(record["path"], V49 / f"{label}.pt")
        pinned(path, record["sha256"])
        require(
            record["sha256"] == prior["checkpointHashes"][label],
            "V50/V49 checkpoint binding mismatch",
        )
    record = read(V49 / "report.json")["checkpoints"]["challenger"]
    require(
        record["path"] == bindings["challenger"]["path"]
        and record["checkpointSha256"] == bindings["challenger"]["sha256"]
        and record["sourceCheckpointSha256"] == ORIGIN_SHA,
        "Primary must come only from actual e55 migration",
    )
    require(
        record["modelAndAdamByteExact"] is True and record["actualLearningUpdates"] == 0,
        "Migration did not preserve model/Adam",
    )
    pinned(V40_RECEIPT, V40_RECEIPT_SHA)
    origin = read(V40_RECEIPT)
    require(
        origin["checkpointSha256"] == ORIGIN_SHA
        and origin["actualLearningUpdates"] == 7072
        and len(origin["optimizerStepDeltas"]) == 12
        and all(
            type(step) is int and step == 7072 for step in origin["optimizerStepDeltas"].values()
        ),
        "Actual V40 Adam provenance mismatch",
    )
    pinned(V49 / "queries.jsonl", QUERY_SHA)
    windows = [
        row["window"]
        for line in (V49 / "queries.jsonl").read_text(encoding="utf-8").splitlines()
        if (row := json.loads(line))["kind"] == "query"
    ]
    require(
        len(windows) == len(record["identicalInputGreedyChoices"]) == 28,
        "Original query set changed",
    )
    metadata, curriculum = read(V50 / "metadata.json"), read(V50 / "curriculum.json")
    report = read(V50 / "report.json")
    pinned(V50 / "metadata.json", report["metadataSha256"])
    pinned(V50 / "curriculum.json", report["curriculumSha256"])
    require(
        metadata["engineSha256"] == curriculum["engineSha256"] == current["engineSha256"]
        and metadata["schemaVersion"] == 4,
        "Runtime metadata mismatch",
    )
    require(
        len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479
        and len(metadata["decks"]) == 26
        and len(curriculum["decks"]) == 44
        and curriculum["decks"][:26] == metadata["decks"],
        "Do not shrink candidate scope",
    )
    require(
        {f"BT26-{i:03d}" for i in range(1, 105)} | {f"EX13-{i:03d}" for i in range(1, 78)}
        <= set(metadata["cardIds"]),
        "Missing scoped identity",
    )
    delivery = CHECKOUT / "tools/bot-training/delivery.mjs"
    pinned(delivery, DELIVERY_SHA)
    require(
        callable(getattr(v50, "require_idle", None)),
        "Qualification reader must expose approved stdlib require_idle",
    )
    v50.require_idle()
    require("torch" not in sys.modules, "Preflight imported a model")
    return {
        "request": request,
        "requestSha256": request_sha,
        "adapterSha256": adapter_sha,
        "host": host,
        "v50": current,
        "v49": prior,
        "primary": bindings["challenger"],
        "metadata": metadata,
        "windows": windows,
        "expectedChoices": record["identicalInputGreedyChoices"],
        "reader": v50,
        "delivery": delivery,
    }


def resource_go(pins: dict[str, Any], phase: str, approval_sha: str | None) -> None:
    require(valid_hash(approval_sha), "Explicit ROOT resourceGo SHA required")
    approval = checked_path(pins["request"]["resourceGo"][phase])
    pinned(approval, approval_sha)
    value = read(approval)
    require(value.get("approved") is True, "ROOT resourceGo approval must be explicit boolean true")
    expected = {
        "phase": phase,
        "adapterSha256": pins["adapterSha256"],
        "requestSha256": pins["requestSha256"],
        "v50CompletionSha256": pins["v50"]["completionSha256"],
        "v49CompletionSha256": pins["v49"]["completionSha256"],
        "checkpointSha256": pins["primary"]["sha256"],
        "approved": True,
    }
    if phase == "rooms":
        root = Path(pins["request"]["output"])
        manifest = root / "package/manifest.json"
        completion = root / "package-probe/completion.json"
        pinned(manifest, value.get("packageManifestSha256"))
        pinned(completion, value.get("packageProbeCompletionSha256"))
        proof = read(completion)
        require(
            proof["completed"] is True
            and proof["acceptance"] is False
            and proof["checkpointSha256"] == pins["primary"]["sha256"]
            and proof["manifestSha256"] == digest(manifest),
            "Rooms require the actual ROOT-pinned candidate probe",
        )
        expected.update(
            packageManifestSha256=digest(manifest), packageProbeCompletionSha256=digest(completion)
        )
    require(
        value == expected,
        "ROOT resourceGo does not bind this actual phase/model/source",
    )
    pins["reader"].require_idle()


def trace_check(path: Path, pins: dict[str, Any], phase: str) -> dict[str, Any]:
    proof = read(path)
    require(
        proof["phase"] == phase
        and proof["acceptance"] is False
        and proof["exitCode"] == 0
        and proof["checkpointSha256"] == pins["primary"]["sha256"],
        "Trace phase/model/error mismatch",
    )
    require(
        len(proof["ready"]) == 1
        and proof["ready"][0]["checkpointSha256"] == pins["primary"]["sha256"],
        "Actual ready model identity missing",
    )
    for sample in [proof["ready"][0]["readyMs"], *[row["latencyMs"] for row in proof["queries"]]]:
        require(
            type(sample) in (int, float) and math.isfinite(sample) and sample >= 0,
            "Invalid actual timing",
        )
    require(
        proof["queries"]
        and all(
            row["error"] is False
            and type(row["action"]) is int
            and 0 <= row["action"] < row["candidates"]
            for row in proof["queries"]
        ),
        "Probe or room model query failed",
    )
    require(
        proof["policyTimeoutMs"] == 1000 and proof["transportTimeoutMs"] == 2000,
        "Do not conflate policy and transport deadlines",
    )
    return proof


def room_guard(run: Path, checkpoint: Path, pins: dict[str, Any]) -> dict[str, Any]:
    for path, sha in ROOM_HELPERS.items():
        pinned(path, sha)
    v43, v37, template, old = ROOM_HELPERS
    functions = []
    for path in (v43, v37):
        nodes = [
            node
            for node in ast.parse(path.read_text(encoding="utf-8")).body
            if isinstance(node, ast.FunctionDef) and node.name == "validate_rooms"
        ]
        require(len(nodes) == 1, "Original room validator missing")
        functions.append(nodes[0])
    require(
        ast.dump(functions[0]) == ast.dump(functions[1]), "V37/V43 original room mechanism differs"
    )
    namespace = {
        "Any": Any,
        "ast": ast,
        "digest": digest,
        "read_json": read,
        "math": math,
        "OLD_ROOM": old,
        "OLD_ROOM_SHA": ROOM_HELPERS[old],
        "TEMPLATE": template,
        "TEMPLATE_SHA": ROOM_HELPERS[template],
        "RUN": run,
        "PREP": V50,
        "CHECKPOINT": checkpoint,
    }
    exec(compile(ast.Module(body=[functions[0]], type_ignores=[]), str(v43), "exec"), namespace)  # noqa: S102 - unchanged SHA-bound V43/V37 room validator, no producer main.
    return namespace["validate_rooms"](
        {
            "checkpointSha256": pins["primary"]["sha256"],
            "runtime": {"engineSha256": pins["v50"]["engineSha256"]},
        }
    )


def run_command(args: list[str], log: Path, *, cwd: Path, environment: dict[str, str]) -> str:
    # Preserve the failing command's evidence too; never restart or hide its failure.
    with log.open("x", encoding="utf-8") as stream:
        process = subprocess.Popen(
            args,
            cwd=cwd,
            env=environment,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        output, errors = process.communicate()
        stream.write(output + errors)
    if process.returncode != 0:
        raise subprocess.CalledProcessError(process.returncode, args, output=output, stderr=errors)
    return output


def child_environment() -> dict[str, str]:
    return {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}


def execution_bytes(pins: dict[str, Any]) -> Path:
    pinned(Path(__file__), pins["adapterSha256"])
    trace = checked_path(pins["request"]["trace"]["path"])
    pinned(trace, pins["request"]["trace"]["sha256"])
    return trace


def execute_phase(pins: dict[str, Any], phase: str, approval_sha: str | None) -> dict[str, Any]:
    resource_go(pins, phase, approval_sha)
    trace = execution_bytes(pins)
    root = Path(pins["request"]["output"])
    require(
        root.is_absolute()
        and root.parent.exists()
        and not root.is_symlink()
        and ".." not in root.parts
        and root.is_relative_to(LAB / "deliveries/bot-final-delivery-v50"),
        "Use a new external lane destination",
    )
    node = pins["host"]["node"]
    package = root / "package"
    if phase == "package-probe":
        root.mkdir()
        evidence = [
            {"role": label, "path": str(path), "sha256": digest(path)}
            for label, path in (
                ("V40 actual Adam provenance", V40_RECEIPT),
                ("V49 full closure", V49 / "completion.json"),
                ("V50 actual runtime closure", V50 / "completion.json"),
            )
        ]
        write(
            root / "provenance.json",
            {
                "sourceCommit": SOURCE,
                "sourceArchiveSha256": ARCHIVE_SHA,
                "originalCheckpointSha256": ORIGIN_SHA,
                "actualOriginalAdamSteps": 7072,
                "evidence": evidence,
            },
        )
        write(
            root / "request.json",
            {
                "runtime": str(CHECKOUT),
                "checkpoint": pins["primary"]["path"],
                "checkpointSha256": pins["primary"]["sha256"],
                "provenance": str(root / "provenance.json"),
                "output": str(package),
                "version": "bt26-ex13-v50-e55-origin-candidate",
                "python": pins["host"]["python"],
            },
        )
        packed = json.loads(
            run_command(
                [node, str(pins["delivery"]), "pack", "--request", str(root / "request.json")],
                root / "pack.log",
                cwd=CHECKOUT,
                environment=child_environment(),
            )
        )
        require(
            Path(packed["package"]) == package and packed["status"] == "candidate",
            "Package output contract changed",
        )
        write(root / "package-pin.json", packed)
    else:
        require(phase == "rooms" and root.is_dir(), "Run separate package-probe phase first")
        packed = read(root / "package-pin.json")
    manifest_sha = packed["manifestSha256"]
    pinned(package / "manifest.json", manifest_sha)
    manifest = read(package / "manifest.json")
    pinned(package / "scorer.mjs", DELIVERY_SHA)
    require(
        manifest["checkpointSha256"] == pins["primary"]["sha256"]
        and manifest["metadata"] == pins["metadata"],
        "Package differs from actual selected runtime/model",
    )
    run = root / phase
    run.mkdir()
    environment = child_environment()
    config = run / "trace-config.json"
    write(
        config,
        {
            "phase": phase,
            "runtime": str(CHECKOUT),
            "metadata": pins["metadata"],
            "checkpointSha256": pins["primary"]["sha256"],
            "output": str(run / "transport-proof.json"),
        },
    )
    environment.update(
        {
            "NODE_ENV": "test",
            "PATH": str(Path(node).parent) + ":" + environment.get("PATH", ""),
            "AEGIS_DELIVERY_TRACE_CONFIG": str(config),
            "AEGIS_BOT_DELIVERY_PACKAGE": str(package),
            "AEGIS_BOT_DELIVERY_MANIFEST_SHA256": manifest_sha,
        }
    )
    run_command(
        [
            node,
            str(pins["delivery"]),
            "validate",
            "--package",
            str(package),
            "--manifest-sha256",
            manifest_sha,
        ],
        run / "validate.log",
        cwd=CHECKOUT,
        environment=environment,
    )
    resource_go(pins, phase, approval_sha)
    if phase == "package-probe":
        write(run / "windows.json", pins["windows"])
        args = [
            node,
            "--import",
            str(trace),
            str(pins["delivery"]),
            "probe",
            "--package",
            str(package),
            "--manifest-sha256",
            manifest_sha,
            "--allow-candidate",
            "--queries",
            str(run / "windows.json"),
            "--output",
            str(run / "probe"),
        ]
    else:
        for path, sha in ROOM_HELPERS.items():
            pinned(path, sha)
        script = CHECKOUT / "tools/bot-training/room-smoke.mjs"
        pinned(script, ROOM_SHA)
        args = [
            node,
            "--import",
            str(trace),
            str(script),
            "--checkpoint",
            str(package / "checkpoint.pt"),
            "--python",
            str(package / "scorer.mjs"),
            "--output",
            str(run / "verification"),
            "--games",
            "26",
            "--seed",
            "6170000",
            "--match-timeout-ms",
            "600000",
        ]
    write(
        run / "started.json",
        {
            "phase": phase,
            "command": args,
            "v50": pins["v50"],
            "v49": pins["v49"],
            "resourceGoSha256": approval_sha,
            "acceptance": False,
            "policyTimeoutMs": 1000,
            "transportTimeoutMs": 2000,
        },
    )
    run_command(args, run / "phase.log", cwd=CHECKOUT, environment=environment)
    proof = trace_check(run / "transport-proof.json", pins, phase)
    if phase == "package-probe":
        require(
            read(run / "probe/queries.json")["choices"]
            == pins["expectedChoices"]
            == [row["action"] for row in proof["queries"]],
            "Original V49 query reload choices changed",
        )
        stats = {"queries": 28}
    else:
        stats = room_guard(run, package / "checkpoint.pt", pins)
        require(
            stats["modelQueries"] == len(proof["queries"]),
            "Native room queries do not match guarded loaded policy",
        )
    require(
        preflight(Path(pins["request"]["requestPath"]), pins["requestSha256"])["primary"]
        == pins["primary"],
        "Post-phase actual closure changed",
    )
    execution_bytes(pins)
    result = {
        "phase": phase,
        "completed": True,
        "checkpointSha256": pins["primary"]["sha256"],
        "manifestSha256": manifest_sha,
        "adapterSha256": pins["adapterSha256"],
        "traceSha256": pins["request"]["trace"]["sha256"],
        "stats": stats,
        "ready": proof["ready"],
        "maxQueryLatencyMs": max(row["latencyMs"] for row in proof["queries"]),
        "acceptance": False,
        "noStrengthOrPromotionClaim": True,
        "actualLearningUpdates": 0,
    }
    write(run / "completion.json", result)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase", choices=("inspect", "package-probe", "rooms"))
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--resource-go")
    args = parser.parse_args()
    pins = preflight(args.request, args.request_sha256)
    require(
        pins["request"]["requestPath"] == str(args.request), "ROOT-pinned request path mismatch"
    )
    result = (
        {"primary": pins["primary"], "v50": pins["v50"], "v49": pins["v49"], "acceptance": False}
        if args.phase == "inspect"
        else execute_phase(pins, args.phase, args.resource_go)
    )
    sys.stdout.write(json.dumps(result, allow_nan=False) + "\n")


if __name__ == "__main__":
    main()
