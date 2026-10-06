"""Continue reviewed learning with one full-rotation external teacher block.

The qualified archive, original checkpoints and eight closed collection namespaces
stay in place. Every prior closure is consumed by its unchanged actual owner: the
pinned gap adapter, which delegates through the effect adapter to the original
operator. Only unused contexts-7 is added: one 3960-game block, the next multiple of
the original 440-game period covering all 44 opponent offsets, with the same external
worker. Imitation/PPO/comparison keep the original commands, whole, resource,
corpus, tensor and source guards under new identity and resource bindings.
"""

import ast
import copy
import hashlib
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
GAP_OPERATOR = LAB / "transfers/material-teacher-gap-learning.py"
GAP_SHA = "1c8bfb932d3c3feb6092947ba4267e7a0d289219e9ed032c1db444d3904def70"
GAP_REQUEST = LAB / "transfers/material-teacher-gap-request.json"
GAP_REQUEST_SHA = "3073eac66ddfd1d8ef90ee0e9a2a1f7d77c68827db83d2a683143fd15f15b9b6"
ENTRY_SHA = "180cfa31cedd3c8025debc0b673a74c5ddecf22799d5857dac65f428ee14682f"
POLICY_SHA = "648d8a2623a09a5392e9fa4d289da62cdb4414cc0b3781e6d194395f47685266"
GAP_BLOCKS = {"contexts-5": (6003520, 880), "contexts-6": (6004400, 880)}
PRIOR_PHASES = frozenset({"diagnostic", "contexts", *(f"contexts-{i}" for i in range(1, 7))})
ROTATION_PHASE = "contexts-7"
ROTATION_BLOCK = {"seed": 6005280, "games": 3960}
LEARNING_PHASES = frozenset({"imitation", "ppo", "comparison"})
ROTATION_PHASES = frozenset({ROTATION_PHASE, *LEARNING_PHASES})
_GAP: ModuleType | None = None
_API: dict[str, Any] | None = None


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise ValueError(reason)


def sealed_source(path: Path, expected: str) -> bytes:
    require(
        path.is_file() and not any(p.is_symlink() for p in [path, *path.parents]),
        "Missing regular reviewed source or symlink ancestor",
    )
    source = path.read_bytes()
    require(hashlib.sha256(source).hexdigest() == expected, "Reviewed source byte pin changed")
    return source


def gap_module() -> ModuleType:
    """Execute the exact pinned gap adapter bytes as the prior collection owner."""
    global _GAP
    if _GAP is None:
        sys.dont_write_bytecode = True
        source = sealed_source(GAP_OPERATOR, GAP_SHA)
        spec = importlib.util.spec_from_file_location("gap_material_learning", GAP_OPERATOR)
        require(spec is not None and spec.loader is not None, "Missing gap loader")
        module = importlib.util.module_from_spec(spec)
        exec(compile(source, str(GAP_OPERATOR), "exec"), vars(module))  # noqa: S102 - exact reviewed gap adapter bytes hashed and compiled from one buffer.
        require(
            module.GAP_BLOCKS == GAP_BLOCKS
            and module.PRIOR_PHASES | set(module.GAP_BLOCKS) == PRIOR_PHASES
            and module.LEARNING_PHASES == LEARNING_PHASES
            and (module.ENTRY_SHA, module.POLICY_SHA) == (ENTRY_SHA, POLICY_SHA),
            "Gap adapter phase or expert seam changed",
        )
        _GAP = module
    sealed_source(GAP_OPERATOR, GAP_SHA)
    return _GAP


def bindings(phase: str) -> dict[str, str]:
    prefix = LAB / "transfers" / f"material-teacher-rotation-learning-{phase}"
    return {"identity": f"{prefix}-identity.json", "resourceGo": f"{prefix}-go.json"}


def envelope(effect: ModuleType, base: Any, path: Path, expected: str) -> dict[str, Any]:
    effect.pin(path, expected)
    value = base.read(path)
    require(
        isinstance(value, dict)
        and set(value) == {"formatVersion", "priorOwner", "priorRequest", "oldPhases", "rotation"}
        and type(value["formatVersion"]) is int
        and value["formatVersion"] == 1,
        "Exact rotation request required",
    )
    require(
        value["priorOwner"] == {"path": str(GAP_OPERATOR), "sha256": GAP_SHA}
        and value["priorRequest"] == {"path": str(GAP_REQUEST), "sha256": GAP_REQUEST_SHA},
        "Pinned prior gap owner and request required",
    )
    require(
        isinstance(value["oldPhases"], dict) and set(value["oldPhases"]) == PRIOR_PHASES,
        "Exact eight consumed prior closures required",
    )
    for binding in value["oldPhases"].values():
        require(
            isinstance(binding, dict)
            and set(binding) == {"identitySha256", "completionSha256"}
            and all(base.sha(v) for v in binding.values()),
            "Actual closed prior identity/completion pins required",
        )
    block = value["rotation"]
    require(
        isinstance(block, dict)
        and set(block) == set(ROTATION_BLOCK)
        and all(type(block[key]) is int for key in block)
        and block == ROTATION_BLOCK,
        "Only the declared full-rotation block is allowed",
    )
    return value


def namespace(
    gap: ModuleType, effect: ModuleType, base: Any, prior: dict[str, Any]
) -> dict[str, Any]:
    """Reuse complete SHA-bound original definitions; prior phases keep their owners."""
    tree = ast.parse(effect.sealed_source(effect.BASE_OPERATOR, effect.BASE_SHA))
    definitions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    require(
        {"main", "blocks", "closed_phase", "whole", "go", "run", "tensor_worker", "predecessors"}
        <= {node.name for node in definitions},
        "Original reviewed function seam changed",
    )
    scope = {**vars(base), "__file__": __file__, "__name__": "rotation_material_learning"}
    code = compile(ast.Module(body=definitions, type_ignores=[]), str(effect.BASE_OPERATOR), "exec")
    exec(code, scope)  # noqa: S102 - exact reviewed SHA-bound function definitions; no AST/source transformations.
    shared_closed = scope["closed_phase"]
    shared_whole = scope["whole"]
    shared_go = scope["go"]
    shared_predecessors = scope["predecessors"]

    def inputs(ctx: dict[str, Any]) -> None:
        effect.pin(Path(__file__), ctx["operatorSha256"])
        effect.pin(ctx["requestPath"], ctx["requestSha256"])
        effect.pin(GAP_OPERATOR, GAP_SHA)
        effect.pin(GAP_REQUEST, GAP_REQUEST_SHA)
        effect.pin(gap.EFFECT_OPERATOR, gap.EFFECT_SHA)
        effect.pin(gap.EFFECT_REQUEST, gap.EFFECT_REQUEST_SHA)
        effect.expert_inputs(ctx["gapContext"]["effectContext"])

    def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
        effect.pin(Path(__file__), operator_sha)
        request = envelope(effect, base, path, request_sha)
        before = prior["context"](GAP_REQUEST, GAP_REQUEST_SHA, GAP_SHA)
        require(
            before["gapPhases"] == {*GAP_BLOCKS, *LEARNING_PHASES},
            "Prior gap request must declare both closed gap blocks",
        )
        require(
            all(
                request["oldPhases"][p] == v for p, v in before["gapEnvelope"]["oldPhases"].items()
            ),
            "Prior closure pins differ from the gap request",
        )
        extended = copy.deepcopy(before["request"])
        extended["contextExpansions"].append(copy.deepcopy(request["rotation"]))
        names = [f"contexts-{i + 1}" for i in range(len(extended["contextExpansions"]))]
        require(names[-1] == ROTATION_PHASE, "Rotation block must directly follow contexts-6")
        extended["phaseBindings"].update({p: bindings(p) for p in ROTATION_PHASES})
        for phase in ROTATION_PHASES:
            for key in ("identity", "resourceGo"):
                scope["lane"](extended["phaseBindings"][phase][key], LAB / "transfers")
        scope["blocks"](extended)  # Original overlap, reserved-final and 440-period checks.
        commands = copy.deepcopy(before["commands"])
        template = commands["contexts-6"]
        entry = str(effect.LAB / "transfers/material-teacher-effect-entry.mjs")
        require(
            template.count("--worker") == 1 and template[template.index("--worker") + 1] == entry,
            "Prior external worker selector changed",
        )
        argv = template.copy()
        for option, option_value in (
            ("--seed", ROTATION_BLOCK["seed"]),
            ("--games", ROTATION_BLOCK["games"]),
            ("--output", before["run"] / ROTATION_PHASE),
        ):
            require(argv.count(option) == 1, "Original collection option changed")
            argv[argv.index(option) + 1] = str(option_value)
        commands[ROTATION_PHASE] = argv
        ctx = {
            **before,
            "request": extended,
            "requestPath": path,
            "requestSha256": request_sha,
            "operatorSha256": operator_sha,
            "rotationEnvelope": request,
            "rotationPhases": ROTATION_PHASES,
            "gapContext": before,
            "commands": commands,
        }
        inputs(ctx)
        for phase in GAP_BLOCKS:
            closed_phase(ctx, phase, request["oldPhases"][phase]["identitySha256"])
        return ctx

    def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
        inputs(ctx)
        if phase in PRIOR_PHASES:
            bound = ctx["rotationEnvelope"]["oldPhases"][phase]
            require(identity_sha == bound["identitySha256"], "Wrong prior predecessor identity")
            result = prior["closed_phase"](ctx["gapContext"], phase, identity_sha)
            require(
                result["completionSha256"] == bound["completionSha256"], "Prior closure changed"
            )
        else:
            require(phase in ctx["rotationPhases"], "Unknown rotation phase")
            result = shared_closed(ctx, phase, identity_sha)
        inputs(ctx)
        return result

    def whole(
        ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool
    ) -> dict[str, Any]:
        require(
            phase in ctx["rotationPhases"], "Rotation operator cannot launch or own prior phases"
        )
        inputs(ctx)
        return shared_whole(ctx, phase, identity_sha, closed=closed)

    def go(ctx: dict[str, Any], phase: str, approval_sha: str, *, idle: bool) -> dict[str, Any]:
        require(phase in ctx["rotationPhases"], "Unknown rotation resource phase")
        inputs(ctx)
        result = shared_go(ctx, phase, approval_sha, idle=idle)
        if phase == "imitation":
            require(
                ROTATION_PHASE in result["predecessors"],
                "Imitation must consume all closed data through contexts-7",
            )
        inputs(ctx)
        return result

    def predecessors(ctx: dict[str, Any], phase: str, selected: set[str]) -> None:
        if phase == ROTATION_PHASE:
            require(
                selected == {"diagnostic", "contexts-6"},
                "Missing/unknown predecessor closure",
            )
        else:
            shared_predecessors(ctx, phase, selected)

    scope.update(
        context=context, closed_phase=closed_phase, whole=whole, go=go, predecessors=predecessors
    )
    return scope


def api() -> dict[str, Any]:
    """Expose the original consumer interface to later physical/delivery lanes."""
    global _API
    gap = gap_module()
    if _API is None:
        effect = gap.effect_module()
        base = effect.original()
        prior = gap.namespace(effect, base, effect.namespace(base))
        _API = namespace(gap, effect, base, prior)
    sealed_source(GAP_OPERATOR, GAP_SHA)
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
