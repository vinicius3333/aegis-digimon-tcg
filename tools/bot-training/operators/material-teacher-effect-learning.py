"""Continue reviewed learning with an explicitly pinned external expert producer.

The qualified archive, original four checkpoints and closed producer namespaces
stay in place. Only the two unused predeclared context phases change their entry
point. Old closures are consumed by their unchanged original owner; new phases
retain the original whole, resource, corpus, tensor and source guards.
"""

import ast
import copy
import hashlib
import importlib.util
import os
import sys
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
BASE_OPERATOR = LAB / "transfers/material-teacher-learning.py"
BASE_SHA = "c460c665790233fcfcd90f7c6e350ecaa18c4ccfeb0b4a50d5293c83206b4613"
BASE_REQUEST = LAB / "transfers/material-teacher-learning-r2-request.json"
BASE_REQUEST_SHA = "d3ed04a42050fc14f4f56bfdaa2722e8dca9ee8ba64263259e595f44a890ee57"
OLD_PHASES = frozenset({"diagnostic", "contexts", "contexts-1", "contexts-2"})
EXPERT_PHASES = frozenset({"contexts-3", "contexts-4"})
OWN_PHASES = EXPERT_PHASES | {"imitation", "ppo", "comparison"}
_API: dict[str, Any] | None = None


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def pin(path: Path, expected: str) -> None:
    require(
        path.is_file() and not any(p.is_symlink() for p in [path, *path.parents]),
        "Missing regular expert input or symlink ancestor",
    )
    with path.open("rb") as stream:
        actual = hashlib.file_digest(stream, "sha256").hexdigest()
    require(isinstance(expected, str) and actual == expected, "Expert input pin changed")


def sealed_source(path: Path, expected: str) -> bytes:
    require(
        path.is_file() and not any(p.is_symlink() for p in [path, *path.parents]),
        "Missing regular reviewed source or symlink ancestor",
    )
    source = path.read_bytes()
    require(hashlib.sha256(source).hexdigest() == expected, "Reviewed source byte pin changed")
    return source


def original() -> Any:
    sys.dont_write_bytecode = True
    require(__debug__ and "torch" not in sys.modules, "Use stdlib admission without -O")
    source = sealed_source(BASE_OPERATOR, BASE_SHA)
    spec = importlib.util.spec_from_file_location("original_material_learning", BASE_OPERATOR)
    require(spec is not None and spec.loader is not None, "Missing original loader")
    module = importlib.util.module_from_spec(spec)
    # Execute the pinned source bytes, never a pre-existing .pyc cache.
    exec(compile(source, str(BASE_OPERATOR), "exec"), vars(module))  # noqa: S102 - exact original reviewed source bytes hashed and compiled from one buffer.
    pin(BASE_OPERATOR, BASE_SHA)
    return module


def expert_inputs(ctx: dict[str, Any]) -> None:
    require("AEGIS_QUALIFIED_ROOT" not in os.environ, "Local test runtime override is forbidden")
    pin(Path(__file__), ctx["operatorSha256"])
    pin(ctx["requestPath"], ctx["requestSha256"])
    pin(BASE_OPERATOR, BASE_SHA)
    pin(BASE_REQUEST, BASE_REQUEST_SHA)
    for filename, expected in ctx["expertEnvelope"]["expertModules"].items():
        pin(Path(filename), expected)


def envelope(base: Any, path: Path, expected: str) -> dict[str, Any]:
    pin(path, expected)
    value = base.read(path)
    require(
        isinstance(value, dict)
        and set(value) == {"formatVersion", "baseRequest", "entry", "expertModules", "oldPhases"}
        and type(value["formatVersion"]) is int
        and value["formatVersion"] == 1,
        "Exact expert request required",
    )
    require(
        value["baseRequest"] == {"path": str(BASE_REQUEST), "sha256": BASE_REQUEST_SHA},
        "Original sealed request required",
    )
    entry = str(LAB / "transfers/material-teacher-effect-entry.mjs")
    policy = str(LAB / "transfers/material-teacher-effect-policy.mjs")
    require(
        value["entry"] == entry
        and isinstance(value["expertModules"], dict)
        and set(value["expertModules"]) == {entry, policy},
        "Exact external entry and policy pins required",
    )
    for filename, checksum in value["expertModules"].items():
        require(isinstance(filename, str), "Expert module path must be a string")
        source = Path(filename)
        require(
            source.is_absolute()
            and source.parent == LAB / "transfers"
            and source.name.startswith("material-teacher-effect-")
            and source.suffix == ".mjs"
            and ".." not in source.parts
            and base.sha(checksum),
            "Unknown expert module path or pin",
        )
        pin(source, checksum)
    require(
        isinstance(value["oldPhases"], dict) and set(value["oldPhases"]) == OLD_PHASES,
        "Exact consumed original prefix required",
    )
    for binding in value["oldPhases"].values():
        require(
            isinstance(binding, dict)
            and set(binding) == {"identitySha256", "completionSha256"}
            and all(base.sha(v) for v in binding.values()),
            "Actual closed original identity/completion pins required",
        )
    return value


def namespace(base: Any) -> dict[str, Any]:
    """Reuse complete SHA-bound function definitions without editing original bytes."""
    tree = ast.parse(sealed_source(BASE_OPERATOR, BASE_SHA))
    definitions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    names = {node.name for node in definitions}
    require(
        {"main", "context", "closed_phase", "whole", "go", "run", "tensor_worker"} <= names,
        "Original reviewed function seam changed",
    )
    scope = {**vars(base), "__file__": __file__, "__name__": "expert_material_learning"}
    exec(compile(ast.Module(body=definitions, type_ignores=[]), str(BASE_OPERATOR), "exec"), scope)  # noqa: S102 - exact reviewed SHA-bound function definitions; no AST/source transformations.
    shared_closed = scope["closed_phase"]
    shared_whole = scope["whole"]
    shared_go = scope["go"]

    def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
        pin(Path(__file__), operator_sha)
        request = envelope(base, path, request_sha)
        before = base.context(BASE_REQUEST, BASE_REQUEST_SHA, BASE_SHA)
        ctx = {
            **before,
            "requestPath": path,
            "requestSha256": request_sha,
            "operatorSha256": operator_sha,
            "expertEnvelope": request,
            "originalContext": before,
            "commands": copy.deepcopy(before["commands"]),
        }
        for phase in EXPERT_PHASES:
            command = ctx["commands"][phase]
            require(command.count("--worker") == 1, "Original worker selector changed")
            command[command.index("--worker") + 1] = request["entry"]
        expert_inputs(ctx)
        for phase, bound in request["oldPhases"].items():
            result = base.closed_phase(before, phase, bound["identitySha256"])
            require(
                result["completionSha256"] == bound["completionSha256"],
                "Original closed producer changed",
            )
        expert_inputs(ctx)
        return ctx

    def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
        expert_inputs(ctx)
        if phase in OLD_PHASES:
            bound = ctx["expertEnvelope"]["oldPhases"][phase]
            require(identity_sha == bound["identitySha256"], "Wrong original predecessor identity")
            result = base.closed_phase(ctx["originalContext"], phase, identity_sha)
            require(result["completionSha256"] == bound["completionSha256"], "Old closure changed")
        else:
            require(phase in OWN_PHASES, "Unknown expert phase")
            result = shared_closed(ctx, phase, identity_sha)
        expert_inputs(ctx)
        return result

    def whole(
        ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool
    ) -> dict[str, Any]:
        require(phase in OWN_PHASES, "Expert operator cannot launch or own original phases")
        expert_inputs(ctx)
        return shared_whole(ctx, phase, identity_sha, closed=closed)

    def go(ctx: dict[str, Any], phase: str, approval_sha: str, *, idle: bool) -> dict[str, Any]:
        require(phase in OWN_PHASES, "Unknown expert resource phase")
        expert_inputs(ctx)
        result = shared_go(ctx, phase, approval_sha, idle=idle)
        expert_inputs(ctx)
        return result

    scope.update(context=context, closed_phase=closed_phase, whole=whole, go=go)
    return scope


def api() -> dict[str, Any]:
    """Expose the original consumer interface to later physical/delivery lanes."""
    global _API
    pin(BASE_OPERATOR, BASE_SHA)
    if _API is None:
        _API = namespace(original())
    return _API


def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    return api()["context"](path, request_sha, operator_sha)


def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
    return api()["closed_phase"](ctx, phase, identity_sha)


def scope(metadata: dict[str, Any], curriculum: dict[str, Any], engine: str) -> None:
    api()["scope"](metadata, curriculum, engine)


def natural(row: dict[str, Any]) -> None:
    api()["natural"](row)


def phase_path(ctx: dict[str, Any], phase: str) -> Path:
    return api()["phase_path"](ctx, phase)


def data_outputs(ctx: dict[str, Any], phase: str) -> dict[str, str]:
    return api()["data_outputs"](ctx, phase)


def main() -> None:
    api()["main"]()


if __name__ == "__main__":
    main()
