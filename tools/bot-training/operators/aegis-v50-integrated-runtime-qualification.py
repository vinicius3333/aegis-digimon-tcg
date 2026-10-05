"""CPU-only fresh integrated runtime qualification; never copy or load primary models.

Actual admission uses the unchanged, sealed V49 full closure consumer. Synthetic
guard fixtures are separate tests and cannot supply admission to this CLI.
"""

import ast
import hashlib
import importlib.util
import json
import os
import platform
import re
import subprocess
import sys
import tarfile
import time
from pathlib import Path, PurePosixPath
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
STEM = "aegis-v50-integrated-runtime-qualification"
RUN = LAB / "runs/2026-10-05-bt26-ex13-v50-integrated-runtime-qualification"
CHECKOUT = LAB / "checkouts/bt26-ex13-2026-10-05-7d34b4c12-v50"
COMMIT = "7d34b4c1267e0bc266736e61b43cb28debf598ee"
ARCHIVE = LAB / "transfers/aegis-bt26-ex13-7d34b4c12-v50.tar.gz"
ARCHIVE_SHA = "a7dada720768672287b2af577f64b383f2b71e2eba73a5bb6ebc21dbccd0f021"
ARCHIVE_BYTES = 43707176
MANIFEST = LAB / "transfers/aegis-v50-integrated-source-manifest.json"
MANIFEST_SHA = "ba054c00047d7e2af6f55ccb09f0a32f4b8eed49eaf1c0204cc456451d538462"
V48_MANIFEST_SHA = "540dbcc68792f5d62e8a5661afe11b61bcb4b22be7739f6b0a9ad2433df24dcc"
V49 = LAB / "runs/2026-10-05-bt26-ex13-v49-latest-engine-migration"
V49_OPERATOR = LAB / "transfers/aegis-v49-latest-engine-migration.py"
V49_OPERATOR_SHA = "bd619ac7d92c8d95458945622541713fd344c13e5d2351a7dbe3eba2888570bf"
V49_WRAPPER_SHA = "e6dd27cb05e99a02656bfab5bf81c9c68de152db235191ac7476b79266b4c253"
V49_IDENTITY = LAB / "transfers/aegis-v49-latest-engine-migration-launch-identity.json"
V49_IDENTITY_SHA = "a9e62d915f08e55c998bfeca7874cdca5fdbf97238b08d1c32a655fd09c45f63"
V49_EXPECTED = {
    "wholeWrapperPid": 193939,
    "startTicks": "2949066",
    "run": V49.name,
    "operatorSha256": V49_OPERATOR_SHA,
    "wrapperSha256": V49_WRAPPER_SHA,
}
PYTHON = LAB / "venv/bin/python"
FOUNDATION_SHA = "bf4f210309bd53885d7f7f218a61b8c4e057e0d72c647762d4ce81d9086af315"
REVIEWED_CHANGED = {
    "docs/plans/2026-10-03-bt26-ex13-bot-design.md",
    "tools/bot-training/README.md",
    "tools/bot-training/train.py",
    "tools/bot-training/imitate.py",
}
REVIEWED_ADDED = {
    "internal-docs/ai/bot-workers/bot-final-closeout-review.md",
    "internal-docs/ai/bot-workers/bot-final-runtime.md",
    "internal-docs/ai/bot-workers/final-delivery.md",
    "internal-docs/ai/bot-workers/final-learning.md",
    "tools/bot-training/delivery.md",
    "tools/bot-training/delivery.mjs",
    "tools/bot-training/delivery.test.mjs",
    "tools/bot-training/learning_mechanisms.py",
    "tools/bot-training/operators/aegis-v49-latest-engine-migration-attach.sh",
    "tools/bot-training/operators/aegis-v49-latest-engine-migration-launch.sh",
    "tools/bot-training/operators/aegis-v49-latest-engine-migration.py",
    "tools/bot-training/operators/test_v49_guards.py",
    "tools/bot-training/test_learning_mechanisms.py",
    "tools/bot-training/test_stream_evaluation.py",
}
REQUIRED_PINS = {
    "tools/bot-training/train.py": "40213cae178ee56b082e2b322cd4dea67a8296cee9463c000f5d896f125527a7",
    "tools/bot-training/imitate.py": "8ccc98d14358f7d61ebc7e9ea9e1c7558d0943ce3bfb9c125dd770068e0b70d9",
    "tools/bot-training/learning_mechanisms.py": "ccb14e0fa6d0c4f60247a18bb762a802d071fc62e0096d1da2897807ffca2350",
    "tools/bot-training/delivery.mjs": "3d5015508d4b295e24b674f558341dfd83c2b72f51e5346b455053ec593d1d64",
}


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def digest(path: Path) -> str:
    require(path.is_file() and not path.is_symlink(), f"Missing regular file: {path}")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def invalid_constant(value: str) -> Any:
    raise ValueError(f"Nonfinite JSON constant: {value}")


def same(left: Any, right: Any) -> bool:
    """JSON equality keeps booleans distinct from numeric receipt fields."""
    return json.dumps(left, sort_keys=True, allow_nan=False) == json.dumps(
        right, sort_keys=True, allow_nan=False
    )


def read(path: Path) -> Any:
    return json.loads(
        path.read_text(encoding="utf-8"),
        object_pairs_hook=unique_object,
        parse_constant=invalid_constant,
    )


def write(path: Path, value: Any) -> None:
    with path.open("x", encoding="utf-8") as stream:
        stream.write(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + "\n")


def copy_new(source: Path, target: Path) -> None:
    with source.open("rb") as src, target.open("xb") as dest:
        while block := src.read(1024 * 1024):
            dest.write(block)


def safe_name(name: str) -> bool:
    path = PurePosixPath(name)
    return (
        bool(name)
        and bool(path.parts)
        and not path.is_absolute()
        and str(path) == name
        and all(part not in {".", ".."} for part in path.parts)
        and "\\" not in name
    )


def validate_manifest(manifest: dict[str, Any]) -> None:
    require(manifest["sourceCommit"] == COMMIT, "Wrong integrated commit")
    require(manifest["archiveSha256"] == ARCHIVE_SHA, "Wrong archive pin")
    require(
        type(manifest["archiveBytes"]) is int and manifest["archiveBytes"] == ARCHIVE_BYTES,
        "Archive size",
    )
    require(manifest["v48ManifestSha256"] == V48_MANIFEST_SHA, "Wrong predecessor manifest")
    require(manifest["unchangedV48EngineSourceFiles"] == 10621, "Protected source count")
    files, links = manifest["files"], manifest["symlinks"]
    require(len(files) == 12331 and len(links) == 1, "Manifest counts")
    require(set(files).isdisjoint(links), "File/link overlap")
    for name, sha in files.items():
        require(
            safe_name(name) and re.fullmatch("[0-9a-f]{64}", sha) is not None, "Unsafe file record"
        )
    require(
        links == {".claude/skills/fix-discord-bug": "../../.agents/skills/fix-discord-bug"},
        "Unexpected symlink",
    )
    for name in files:
        require(
            not any(parent.as_posix() in links for parent in PurePosixPath(name).parents),
            "File beneath symlink",
        )
    require(
        all(files[name] == sha for name, sha in REQUIRED_PINS.items()), "Reviewed module mismatch"
    )


def compare_sources(
    new: dict[str, Any], old: dict[str, Any], original: dict[str, Any]
) -> dict[str, Any]:
    """No source removal or undeclared edit; every protected source remains exact."""
    before, after = old["files"], new["files"]
    require(old["symlinks"] == new["symlinks"], "Symlink change")
    require(set(before) <= set(after), "Source removed")
    changed = {name for name in before if before[name] != after[name]}
    added = set(after) - set(before)
    require(changed == REVIEWED_CHANGED and added == REVIEWED_ADDED, "Undeclared source delta")
    protected = {
        name: sha
        for name, sha in before.items()
        if name.startswith(("apps/api/src/", "packages/shared/src/")) or name == "pnpm-lock.yaml"
    }
    require(len(protected) == 10621, "Protected engine/data/rules/lock count")
    require(
        all(after[name] == sha for name, sha in protected.items()), "Engine/data/rules/lock changed"
    )
    require(len(original["files"]) == 24, "Original Python source count")
    original_changed = set()
    for name, sha in original["files"].items():
        if after["tools/bot-training/" + name] != sha:
            original_changed.add(name)
    require(original_changed == {"train.py", "imitate.py", "README.md"}, "Original Python delta")
    require(
        all(after[name] == sha for name, sha in REQUIRED_PINS.items()),
        "Reviewed integrated source pins",
    )
    return {
        "protectedEngineDataRulesLockFilesExact": len(protected),
        "originalPythonFilesExact": 21,
        "reviewedChanged": {name: after[name] for name in sorted(changed)},
        "reviewedAdded": {name: after[name] for name in sorted(added)},
    }


def verify_archive(archive: Path, manifest: dict[str, Any]) -> None:
    """Inspect the entire sealed archive before any extraction or checkout creation."""
    seen, regular, links = set(), {}, {}
    with tarfile.open(archive, "r:gz") as bundle:
        for member in bundle:
            name = member.name
            require(safe_name(name) and name not in seen, "Unsafe or duplicate archive path")
            seen.add(name)
            require(
                not any(
                    parent.as_posix() in manifest["symlinks"]
                    for parent in PurePosixPath(name).parents
                ),
                "Archive beneath symlink",
            )
            if member.isfile():
                require(name in manifest["files"], "Unexpected archive file")
                stream = bundle.extractfile(member)
                require(stream is not None, "Unreadable archive file")
                with stream:
                    regular[name] = hashlib.file_digest(stream, "sha256").hexdigest()
            elif member.issym():
                links[name] = member.linkname
            else:
                require(member.isdir(), "Archive special file or hardlink")
                require(
                    any(
                        path.startswith(name + "/")
                        for path in manifest["files"] | manifest["symlinks"]
                    ),
                    "Unexpected archive directory",
                )
    require(
        regular == manifest["files"] and links == manifest["symlinks"], "Archive source mismatch"
    )


def source_guard(manifest: dict[str, Any]) -> None:
    for name, expected in manifest["files"].items():
        path = CHECKOUT / name
        require(
            not any(
                parent.is_symlink()
                for parent in path.parents
                if parent == CHECKOUT or parent.is_relative_to(CHECKOUT)
            ),
            "Source parent symlink",
        )
        require(digest(path) == expected, f"Source changed: {name}")
    for name, target in manifest["symlinks"].items():
        path = CHECKOUT / name
        require(path.is_symlink() and str(path.readlink()) == target, "Source symlink mismatch")
    expected_python = {
        name
        for name in manifest["files"]
        if name.startswith("tools/bot-training/") and name.endswith(".py")
    }
    actual_python = {
        str(path.relative_to(CHECKOUT)) for path in (CHECKOUT / "tools/bot-training").rglob("*.py")
    }
    require(actual_python == expected_python, "Unexpected Python module")
    for name in ("apps/api/src", "packages/shared/src"):
        root = CHECKOUT / name
        expected = {
            key: sha for key, sha in manifest["files"].items() if key.startswith(name + "/")
        }
        actual = {name + "/" + key: sha for key, sha in file_map(root).items()}
        require(actual == expected, "Unexpected engine/data/rules source")


def source_inputs() -> dict[str, Any]:
    require(digest(MANIFEST) == MANIFEST_SHA, "Manifest bytes changed")
    require(
        digest(ARCHIVE) == ARCHIVE_SHA and ARCHIVE.stat().st_size == ARCHIVE_BYTES,
        "Archive bytes changed",
    )
    manifest = read(MANIFEST)
    validate_manifest(manifest)
    return manifest


def predecessor_identity() -> None:
    require(
        digest(V49_IDENTITY) == V49_IDENTITY_SHA and read(V49_IDENTITY) == V49_EXPECTED,
        "V49 identity mismatch",
    )
    require(digest(V49_OPERATOR) == V49_OPERATOR_SHA, "V49 operator changed")


def process_live(identity: dict[str, Any]) -> bool:
    path = Path("/proc") / str(identity["wholeWrapperPid"]) / "stat"
    if not path.exists():
        return False
    try:
        text = path.read_text(encoding="utf-8")
    except (FileNotFoundError, ProcessLookupError):
        return False  # Raced kernel process boundary; exit receipt is still mandatory.
    fields = text[text.rindex(")") + 2 :].split()
    return fields[19] == identity["startTicks"] and fields[0] != "Z"


def wait_for_predecessor() -> None:
    predecessor_identity()
    deadline = time.monotonic() + 43200
    while process_live(V49_EXPECTED):
        require(time.monotonic() < deadline, "V49 wait expired; jobs untouched")
        time.sleep(1)
    exit_path = Path(str(V49) + "-launch") / "exit-code.txt"
    for _ in range(60):
        if exit_path.exists():
            break
        time.sleep(1)
    require(exit_path.read_text(encoding="utf-8").strip() == "0", "V49 whole failed or unclosed")
    predecessor_identity()


def predecessor() -> tuple[ModuleType, ModuleType, dict[str, Any], dict[str, Any]]:
    """Invoke all original full V49 closure, sources and runtime consumers unchanged."""
    require(__debug__ and "torch" not in sys.modules, "Unsafe admission interpreter")
    sys.dont_write_bytecode = True  # Imports must leave all sealed predecessors immutable.
    predecessor_identity()
    require(not process_live(V49_EXPECTED), "V49 whole still live")
    spec = importlib.util.spec_from_file_location("sealed_v50_predecessor", V49_OPERATOR)
    require(spec is not None and spec.loader is not None, "No predecessor loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    require(
        module.RUN == V49 and digest(V49 / "operator.py") == V49_OPERATOR_SHA,
        "Wrong predecessor run",
    )
    bindings = module.closed_migration(V49_IDENTITY_SHA)
    module.require_sources()
    preparation = module.prep_module()
    pins = module.verify_runtime(preparation)
    require(bindings["engineSha256"] == pins["engineSha256"], "Predecessor engine binding")
    require(digest(preparation.MANIFEST) == V48_MANIFEST_SHA, "V48 manifest changed")
    require("torch" not in sys.modules, "Primary model imported by admission")
    return module, preparation, bindings, pins


def build_helpers(preparation: ModuleType) -> dict[str, Any]:
    """Reuse exact V34 source/idle functions with the fresh checkout namespace."""
    path = preparation.PRIOR / "operator.py"
    require(digest(path) == FOUNDATION_SHA, "V34 helper source changed")
    names = {"verify_source", "require_idle"}
    nodes = [
        node
        for node in ast.parse(path.read_text(encoding="utf-8")).body
        if isinstance(node, ast.FunctionDef) and node.name in names
    ]
    require({node.name for node in nodes} == names, "Missing supported helpers")
    namespace = {"Path": Path, "CHECKOUT": CHECKOUT, "digest": digest}
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(path), "exec"), namespace)  # noqa: S102 - unchanged SHA-pinned V34 helpers only.
    return namespace


def require_idle() -> None:
    """Public stdlib admission for follow-on operators; never import primary models."""
    require(__debug__ and "torch" not in sys.modules, "Unsafe idle-check interpreter")
    sys.dont_write_bytecode = True
    predecessor_identity()
    spec = importlib.util.spec_from_file_location("sealed_v50_idle_predecessor", V49_OPERATOR)
    require(spec is not None and spec.loader is not None, "No predecessor loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    build_helpers(module.prep_module())["require_idle"]()


def commands() -> dict[str, list[str]]:
    return {
        "node-version": ["node", "--version"],
        "python-version": [str(PYTHON), "--version"],
        "install": ["pnpm", "install", "--frozen-lockfile", "--offline", "--ignore-scripts"],
        "shared-build": ["pnpm", "--filter", "@aegis/shared", "build"],
        "api-build": ["pnpm", "--filter", "@aegis/api", "build"],
        "api-typecheck": ["pnpm", "--filter", "@aegis/api", "typecheck"],
        "web-typecheck": ["pnpm", "--filter", "@aegis/web", "typecheck"],
        "image-tests": [
            "pnpm",
            "--filter",
            "@aegis/shared",
            "exec",
            "vitest",
            "run",
            "src/cards/images.test.ts",
            "--pool=forks",
            "--maxWorkers=1",
            "--no-file-parallelism",
        ],
        "mirror-tests": [
            "node",
            "--test",
            "--test-concurrency=1",
            "tools/deploy/card-images.test.mjs",
            "tools/deploy/deploy.test.mjs",
        ],
        "python-tests": [str(PYTHON), "-m", "unittest", "discover", "-v"],
        "delivery-tests": [
            "node",
            "--test",
            "--test-concurrency=1",
            "tools/bot-training/delivery.test.mjs",
        ],
        "metadata": ["node", "apps/api/dist/bot/training/cli.js", "--describe"],
        "curriculum": ["node", "apps/api/dist/bot/training/cli.js", "--describe-curriculum"],
    }


def phase_cwd(phase: str) -> Path:
    return CHECKOUT / "tools/bot-training" if phase == "python-tests" else CHECKOUT


def phase_start(phase: str, args: list[str]) -> dict[str, Any]:
    return {
        "phase": phase,
        "command": args,
        "cwd": str(phase_cwd(phase)),
        "completed": False,
        "cpuOnly": True,
        "primaryModelProof": False,
    }


def command(phase: str, args: list[str]) -> None:
    receipt = phase_start(phase, args)
    write(RUN / f"{phase}-started.json", receipt)
    env = dict(
        os.environ,
        CUDA_VISIBLE_DEVICES="-1",
        OMP_NUM_THREADS="1",
        MKL_NUM_THREADS="1",
        PYTHONDONTWRITEBYTECODE="1",
    )
    with (RUN / f"{phase}.log").open("xb") as output:
        try:
            subprocess.run(
                args,
                cwd=phase_cwd(phase),
                env=env,
                stdout=output,
                stderr=subprocess.STDOUT,
                check=True,
            )
        except subprocess.CalledProcessError as error:
            write(
                RUN / f"{phase}-receipt.json",
                dict(receipt, exitCode=error.returncode, logSha256=digest(RUN / f"{phase}.log")),
            )
            raise
    write(
        RUN / f"{phase}-receipt.json",
        dict(receipt, completed=True, exitCode=0, logSha256=digest(RUN / f"{phase}.log")),
    )


def verify_phases() -> dict[str, str]:
    require(
        (RUN / "node-version.log").read_text(encoding="utf-8").strip() == "v26.10.0",
        "Unsupported actual Node",
    )
    require(
        (RUN / "python-version.log").read_text(encoding="utf-8").strip() == "Python 3.12.14",
        "Unsupported actual Python",
    )
    logs = {}
    for phase, args in commands().items():
        start = phase_start(phase, args)
        require(read(RUN / f"{phase}-started.json") == start, "Phase start mismatch")
        log_sha = digest(RUN / f"{phase}.log")
        receipt = read(RUN / f"{phase}-receipt.json")
        require(type(receipt["exitCode"]) is int, "Boolean exit masquerades as zero")
        require(
            receipt == dict(start, completed=True, exitCode=0, logSha256=log_sha),
            "Phase contract failed",
        )
        logs[phase + ".log"] = log_sha
    require({path.name for path in RUN.glob("*.log")} == set(logs), "Unexpected phase log")
    pylog = (RUN / "python-tests.log").read_text(encoding="utf-8")
    require(
        re.search(r"\bRan 73 tests in [0-9.]+s\s+OK\s*\Z", pylog) is not None,
        "Full updated Python suite not green",
    )
    require(
        "skipped=" not in pylog and "expected failures=" not in pylog, "Incomplete Python suite"
    )
    tap = (RUN / "delivery-tests.log").read_text(encoding="utf-8")
    for label, count in (
        ("tests", 18),
        ("pass", 18),
        ("fail", 0),
        ("cancelled", 0),
        ("skipped", 0),
        ("todo", 0),
    ):
        require(
            re.search(rf"(?m)^# {label} {count}$", tap) is not None, "Full delivery suite not green"
        )
    return logs


def file_map(root: Path, *, exclude: set[Path] | None = None) -> dict[str, str]:
    require(root.is_dir() and not root.is_symlink(), "Missing actual file map root")
    result = {}
    for path in sorted(root.rglob("*")):
        require(not path.is_symlink(), "Symlink in runtime or receipts")
        if path.is_file() and path not in (exclude or set()):
            result[str(path.relative_to(root))] = digest(path)
    return result


def runtime_map() -> dict[str, str]:
    result = {}
    for name in ("apps/api/dist", "packages/shared/dist"):
        root = CHECKOUT / name
        result.update({name + "/" + key: sha for key, sha in file_map(root).items()})
    require(bool(result), "Empty compiled runtime")
    return result


def compare_runtime(
    new: dict[str, str], old: dict[str, str], old_checkout: Path, manifest: dict[str, Any]
) -> dict[str, Any]:
    """Exact runtime bytes with one narrowly validated incremental compiler cache.

    The shared build cache can retain optional signatures on unchanged JSON inputs
    and the last declaration emitted. Complete maps stay sealed separately; the
    original V49 consumer remains unchanged and revalidates its complete map.
    """
    require(set(new) == set(old), "Compiled runtime file inventory differs")
    differences = {name for name in new if new[name] != old[name]}
    cache = "packages/shared/dist/.tsbuildinfo"
    require(differences <= {cache}, "Executable/data/declaration/source-map runtime differs")
    evidence = []
    if cache in differences:
        require(
            digest(old_checkout / cache) == old[cache] and digest(CHECKOUT / cache) == new[cache],
            "Compiler cache bytes changed during comparison",
        )
        before, after = read(old_checkout / cache), read(CHECKOUT / cache)
        require(set(before) == set(after), "Compiler cache field inventory differs")
        history = {"fileInfos", "latestChangedDtsFile"}
        require(
            same(
                {key: value for key, value in before.items() if key not in history},
                {key: value for key, value in after.items() if key not in history},
            ),
            "Compiler cache source/version/options/diagnostics differ",
        )
        require(before["version"] == after["version"] == "7.0.2", "Unsupported compiler cache")
        names = before["fileNames"]
        require(
            len(names) == len(before["fileInfos"]) == len(after["fileInfos"]),
            "Compiler cache fileInfo count",
        )
        optional_signatures = []
        for index, (previous, current) in enumerate(
            zip(before["fileInfos"], after["fileInfos"], strict=True)
        ):
            if same(previous, current):
                continue
            require(
                isinstance(previous, dict) and isinstance(current, dict),
                "Compiler cache record type differs",
            )
            source = names[index]
            require(
                source.startswith("../src/") and source.endswith(".json") and safe_name(source[7:]),
                "Non-JSON compiler cache signature changed",
            )
            require(
                "packages/shared/src/" + source[7:] in manifest["files"],
                "Unpinned JSON compiler input",
            )
            require(
                same(
                    {key: value for key, value in previous.items() if key != "signature"},
                    {key: value for key, value in current.items() if key != "signature"},
                ),
                "Compiler cache source version/flags differ",
            )
            require(
                ("signature" in previous) != ("signature" in current),
                "Compiler cache signature value differs",
            )
            signature = previous.get("signature", current.get("signature"))
            require(
                isinstance(signature, str) and re.fullmatch("[0-9a-f]{32}", signature) is not None,
                "Invalid optional JSON compiler signature",
            )
            optional_signatures.append(source)
        latest = []
        for value in (before["latestChangedDtsFile"], after["latestChangedDtsFile"]):
            require(
                isinstance(value, str)
                and value.startswith("./")
                and safe_name(value[2:])
                and value.endswith(".d.ts"),
                "Unsafe compiler declaration history",
            )
            name = "packages/shared/dist/" + value[2:]
            require(
                name in new and new[name] == old[name], "Compiler history declaration not exact"
            )
            latest.append(value)
        evidence.append(
            {
                "path": cache,
                "v48Sha256": old[cache],
                "v50Sha256": new[cache],
                "optionalJsonSignatureHistory": optional_signatures,
                "latestChangedDtsFile": latest,
                "allOtherCompilerCacheFieldsExact": True,
            }
        )
    return {
        "completeRuntimeMapsByteExact": not differences,
        "allExecutableDataDeclarationsAndSourceMapsByteExact": True,
        "compilerCacheDifferences": evidence,
    }


def checkpoint_bindings(bindings: dict[str, Any]) -> dict[str, Any]:
    require(
        set(bindings["checkpointHashes"])
        == {"v17-reference", "source-challenger", "fitted-reference", "challenger"},
        "Missing actual V49 checkpoint",
    )
    result = {}
    for label, sha in bindings["checkpointHashes"].items():
        path = V49 / f"{label}.pt"
        require(
            re.fullmatch("[0-9a-f]{64}", sha) is not None and digest(path) == sha,
            "Actual V49 checkpoint changed",
        )
        result[label] = {"path": str(path), "sha256": sha}
    return result


def queued(operator_sha: str) -> dict[str, Any]:
    return {
        "operatorSha256": operator_sha,
        "sourceCommit": COMMIT,
        "archiveSha256": ARCHIVE_SHA,
        "manifestSha256": MANIFEST_SHA,
        "waitingForWholeMigration": V49_EXPECTED,
        "v49IdentitySha256": V49_IDENTITY_SHA,
        "runtimeBuildStarted": False,
        "cpuOnly": True,
        "primaryModelLoaded": False,
        "actualLearningUpdates": 0,
        "noStrengthPhysicalMasteryOrPromotionClaim": True,
    }


def started(operator_sha: str, bindings: dict[str, Any]) -> dict[str, Any]:
    return {
        "operatorSha256": operator_sha,
        "sourceCommit": COMMIT,
        "archiveSha256": ARCHIVE_SHA,
        "manifestSha256": MANIFEST_SHA,
        "wholeV49Bindings": bindings,
        "node": "v26.10.0",
        "python": "3.12.14",
        "cpuOnly": True,
        "primaryModelLoaded": False,
        "actualLearningUpdates": 0,
    }


def verify_qualification(operator_sha: str) -> dict[str, Any]:
    """Recompute every binding from actual files and unchanged full predecessor proof."""
    manifest = source_inputs()
    require(
        digest(Path(__file__)) == digest(RUN / "operator.py") == operator_sha,
        "Qualification operator changed",
    )
    require(digest(RUN / "source-manifest.json") == MANIFEST_SHA, "Run source manifest changed")
    module, preparation, bindings, pins = predecessor()
    require(same(read(RUN / "v49-bindings.json"), bindings), "Closed V49 bindings changed")
    require(same(read(RUN / "queued.json"), queued(operator_sha)), "Queue receipt changed")
    require(
        same(read(RUN / "started.json"), started(operator_sha, bindings)), "Start receipt changed"
    )
    old = read(preparation.MANIFEST)
    original = read(preparation.PRIOR / "prior-python-source.json")
    delta = compare_sources(manifest, old, original)
    source_guard(manifest)
    helpers = build_helpers(preparation)
    helpers["verify_source"](manifest)
    logs = verify_phases()
    metadata, curriculum = read(RUN / "metadata.log"), read(RUN / "curriculum.log")
    require(
        same(metadata, pins["metadata"]) and same(curriculum, pins["curriculum"]),
        "Metadata/curriculum/fingerprint differ; root must review",
    )
    require(
        same(read(RUN / "metadata.json"), metadata)
        and same(read(RUN / "curriculum.json"), curriculum),
        "Describe receipt mismatch",
    )
    require(len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479, "Vocabulary mismatch")
    require(
        {f"BT26-{i:03d}" for i in range(1, 105)} <= set(metadata["cardIds"]), "BT26 scope mismatch"
    )
    require(
        {f"EX13-{i:03d}" for i in range(1, 78)} <= set(metadata["cardIds"]), "EX13 scope mismatch"
    )
    require(
        len(metadata["decks"]) == 26 and len(curriculum["decks"]) == 44, "Recipe scope mismatch"
    )
    runtime = runtime_map()
    require(runtime == read(RUN / "runtime-files.json"), "V50 compiled runtime map changed")
    comparison = compare_runtime(
        runtime, read(preparation.RUN / "runtime-files.json"), preparation.CHECKOUT, manifest
    )
    python_map = {
        name: sha
        for name, sha in manifest["files"].items()
        if name.startswith("tools/bot-training/") and name.endswith((".py", "pyproject.toml"))
    }
    require(read(RUN / "python-files.json") == python_map, "Python module map mismatch")
    features = ast.parse((CHECKOUT / "tools/bot-training/features.py").read_text(encoding="utf-8"))
    versions = [
        ast.literal_eval(node.value)
        for node in features.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name) and target.id == "FEATURE_VERSION"
            for target in node.targets
        )
    ]
    require(versions == [7], "Feature schema changed")
    cp = checkpoint_bindings(bindings)
    require(read(RUN / "checkpoint-bindings.json") == cp, "Checkpoint binding changed")
    # The sealed full V49 verifier requires the real 13,783/819 V48 engine proof.
    engine = read(preparation.RUN / "completion.json")
    report = {
        "completedIntegratedRuntimeQualification": True,
        "operatorSha256": operator_sha,
        "sourceCommit": COMMIT,
        "checkout": str(CHECKOUT),
        "archiveSha256": ARCHIVE_SHA,
        "manifestSha256": MANIFEST_SHA,
        "allSourceFilesExact": len(manifest["files"]),
        "sourceDelta": delta,
        "wholeV49Bindings": bindings,
        "checkpointBindings": cp,
        "engineSha256": pins["engineSha256"],
        "reusedActualEngineEvidence": {
            "preparationCompletionSha256": pins["completionSha256"],
            "identitySha256": module.IDENTITY_SHA,
            "engineTests": engine["engineTests"],
            "engineTestFiles": engine["engineTestFiles"],
            "engineLogSha256": digest(preparation.RUN / "engine-tests.log"),
            "protectedSourceAndExecutableDataDeclarationsMapsExact": True,
            "runtimeComparison": comparison,
        },
        "runtimeMapSha256": digest(RUN / "runtime-files.json"),
        "pythonMapSha256": digest(RUN / "python-files.json"),
        "metadataSha256": digest(RUN / "metadata.json"),
        "curriculumSha256": digest(RUN / "curriculum.json"),
        "metadataAndCurriculumIncludingFingerprintExact": True,
        "node": "v26.10.0",
        "python": "3.12.14",
        "pythonTests": 73,
        "deliveryTests": 18,
        "featureVersion": 7,
        "bt26Identities": 104,
        "ex13Identities": 77,
        "catalogRecipes": 26,
        "supportRecipes": 18,
        "learnerSeats": [0, 1],
        "singleSharedPolicy": True,
        "logHashes": logs,
        "cpuOnly": True,
        "primaryModelLoaded": False,
        "unitFixturesAreRuntimeChecksOnly": True,
        "checkpointCopyOrMetadataMigrationPerformed": False,
        "actualLearningUpdates": 0,
        "actualPrimaryQueries": 0,
        "actualGames": 0,
        "cudaParityCompleted": False,
        "strengthPhysicalRoomCustodyAcceptance": False,
        "finalBlindNotPlayedByThisOperator": True,
        "noPromotionClaim": True,
    }
    require("torch" not in sys.modules, "Primary model import before root resource agreement")
    return report


def verify_whole(identity: dict[str, Any], operator_sha: str) -> None:
    require(
        set(identity)
        == {"wholeWrapperPid", "startTicks", "run", "operatorSha256", "wrapperSha256"},
        "Unexpected launch identity",
    )
    require(
        type(identity["wholeWrapperPid"]) is int and identity["wholeWrapperPid"] > 0,
        "Invalid whole PID",
    )
    require(
        isinstance(identity["startTicks"], str)
        and re.fullmatch("[0-9]+", identity["startTicks"]) is not None,
        "Invalid start ticks",
    )
    require(
        identity["run"] == RUN.name and identity["operatorSha256"] == operator_sha,
        "Whole identity binding",
    )
    require(
        re.fullmatch("[0-9a-f]{64}", identity["wrapperSha256"]) is not None, "Invalid wrapper pin"
    )
    require(not process_live(identity), "V50 whole still live")
    launch = Path(str(RUN) + "-launch")
    require(
        (launch / "exit-code.txt").read_text(encoding="utf-8").strip() == "0",
        "V50 whole unclosed or failed",
    )
    require(digest(launch / "launch.sh") == identity["wrapperSha256"], "V50 launch bytes changed")


def closed(identity_sha: str) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Unsafe closure interpreter")
    require(re.fullmatch("[0-9a-f]{64}", identity_sha) is not None, "Invalid actual identity SHA")
    identity_path = LAB / "transfers" / (STEM + "-launch-identity.json")
    require(digest(identity_path) == identity_sha, "V50 launch identity changed")
    identity = read(identity_path)
    operator_sha = digest(Path(__file__))
    verify_whole(identity, operator_sha)
    report = verify_qualification(operator_sha)
    require(same(read(RUN / "report.json"), report), "Qualification report changed")
    outputs = file_map(RUN, exclude={RUN / "completion.json"})
    expected = {
        "reportSha256": digest(RUN / "report.json"),
        "qualification": report,
        "outputs": outputs,
    }
    require(
        same(read(RUN / "completion.json"), expected), "Whole qualification completion mismatch"
    )
    require(
        digest(identity_path) == identity_sha and read(identity_path) == identity,
        "Identity changed during closure read",
    )
    verify_whole(identity, operator_sha)
    require("torch" not in sys.modules, "Closure imported primary model")
    return {
        "identitySha256": identity_sha,
        "completionSha256": digest(RUN / "completion.json"),
        "reportSha256": expected["reportSha256"],
        "sourceCommit": COMMIT,
        "engineSha256": report["engineSha256"],
        "checkpointBindings": report["checkpointBindings"],
        "runtimeMapSha256": report["runtimeMapSha256"],
        "pythonMapSha256": report["pythonMapSha256"],
        "cpuRuntimeQualified": True,
        "actualPrimaryModelOrCudaParityQualified": False,
        "strengthPhysicalRoomCustodyAcceptance": False,
        "finalBlindAccepted": False,
        "noPromotionClaim": True,
    }


def main(operator_sha: str) -> None:
    require(__debug__ and "torch" not in sys.modules, "Unsafe qualification interpreter")
    require(digest(Path(__file__)) == operator_sha, "Operator pin mismatch")
    require(
        not RUN.exists()
        and not RUN.is_symlink()
        and not CHECKOUT.exists()
        and not CHECKOUT.is_symlink(),
        "Exclusive new destinations required",
    )
    manifest = source_inputs()
    predecessor_identity()
    RUN.mkdir()
    copy_new(Path(__file__), RUN / "operator.py")
    copy_new(MANIFEST, RUN / "source-manifest.json")
    write(RUN / "queued.json", queued(operator_sha))
    print(json.dumps(read(RUN / "queued.json")), flush=True)
    wait_for_predecessor()
    _, preparation, bindings, _ = predecessor()
    helpers = build_helpers(preparation)
    helpers["require_idle"]()
    require(
        platform.python_version() == "3.12.14" and Path(sys.executable) == PYTHON,
        "Actual supported Python required",
    )
    require(
        subprocess.run(
            ["node", "--version"], capture_output=True, text=True, check=True
        ).stdout.strip()
        == "v26.10.0",
        "Actual supported Node required",
    )
    compare_sources(
        manifest, read(preparation.MANIFEST), read(preparation.PRIOR / "prior-python-source.json")
    )
    verify_archive(ARCHIVE, manifest)
    require(source_inputs() == manifest, "Source inputs changed before extraction")
    write(RUN / "v49-bindings.json", bindings)
    write(RUN / "started.json", started(operator_sha, bindings))
    # Only this new checkout is extracted; all members were fully inspected first.
    CHECKOUT.mkdir()
    with tarfile.open(ARCHIVE, "r:gz") as bundle:
        bundle.extractall(CHECKOUT, filter="data")
    source_guard(manifest)
    helpers["verify_source"](manifest)
    checkpoint_bindings(bindings)
    for phase, args in commands().items():
        command(phase, args)
    write(RUN / "metadata.json", read(RUN / "metadata.log"))
    write(RUN / "curriculum.json", read(RUN / "curriculum.log"))
    write(RUN / "runtime-files.json", runtime_map())
    write(
        RUN / "python-files.json",
        {
            name: sha
            for name, sha in manifest["files"].items()
            if name.startswith("tools/bot-training/") and name.endswith((".py", "pyproject.toml"))
        },
    )
    write(RUN / "checkpoint-bindings.json", checkpoint_bindings(bindings))
    report = verify_qualification(operator_sha)
    helpers["require_idle"]()
    write(RUN / "report.json", report)
    require(verify_qualification(operator_sha) == report, "Post-qualification guards changed")
    write(
        RUN / "completion.json",
        {
            "reportSha256": digest(RUN / "report.json"),
            "qualification": report,
            "outputs": file_map(RUN),
        },
    )
    print(json.dumps(read(RUN / "completion.json")), flush=True)


if __name__ == "__main__":
    if not __debug__:
        raise RuntimeError("Optimization disables the unchanged predecessor assertions")
    if len(sys.argv) == 3 and sys.argv[1] == "--closed":
        print(json.dumps(closed(sys.argv[2])), flush=True)
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        raise SystemExit("Usage: operator.py SELF_SHA | --closed ACTUAL_IDENTITY_SHA")
