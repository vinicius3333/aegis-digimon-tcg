"""Continue reviewed learning with fresh external teacher blocks for the last corpus gap.

The qualified archive, original checkpoints and six closed collection namespaces
stay in place. Every prior closure is consumed by its unchanged actual owner: the
pinned effect adapter, which itself delegates the four original phases to the
original operator. Only unused contexts-5 and optional contexts-6 are added, with
the same external worker; imitation/PPO/comparison keep the original commands,
whole, resource, corpus, tensor and source guards.
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
EFFECT_OPERATOR = LAB / "transfers/material-teacher-effect-learning.py"
EFFECT_SHA = "5b97a1b64bc8ff34c4da5e80e552a1d6b22349f9a7e626004eb28d6b8106a861"
EFFECT_REQUEST = LAB / "transfers/material-teacher-effect-request.json"
EFFECT_REQUEST_SHA = "a862ee2a90d302bb9febd973192e0182f253c7a4489e2f2395840aab17336945"
ENTRY_SHA = "180cfa31cedd3c8025debc0b673a74c5ddecf22799d5857dac65f428ee14682f"
POLICY_SHA = "648d8a2623a09a5392e9fa4d289da62cdb4414cc0b3781e6d194395f47685266"
PRIOR_PHASES = frozenset(
    {"diagnostic", "contexts", "contexts-1", "contexts-2", "contexts-3", "contexts-4"}
)
GAP_BLOCKS = {"contexts-5": (6003520, 880), "contexts-6": (6004400, 880)}
LEARNING_PHASES = frozenset({"imitation", "ppo", "comparison"})
_EFFECT: ModuleType | None = None
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


def effect_module() -> ModuleType:
    """Execute the exact pinned effect adapter bytes as the prior collection owner."""
    global _EFFECT
    if _EFFECT is None:
        sys.dont_write_bytecode = True
        source = sealed_source(EFFECT_OPERATOR, EFFECT_SHA)
        spec = importlib.util.spec_from_file_location("effect_material_learning", EFFECT_OPERATOR)
        require(spec is not None and spec.loader is not None, "Missing effect loader")
        module = importlib.util.module_from_spec(spec)
        exec(compile(source, str(EFFECT_OPERATOR), "exec"), vars(module))  # noqa: S102 - exact reviewed effect adapter bytes hashed and compiled from one buffer.
        require(
            module.OLD_PHASES | module.EXPERT_PHASES == PRIOR_PHASES,
            "Effect adapter phase seam changed",
        )
        _EFFECT = module
    module = _EFFECT
    module.pin(EFFECT_OPERATOR, EFFECT_SHA)
    return module


def bindings(phase: str) -> dict[str, str]:
    prefix = LAB / "transfers" / f"material-teacher-gap-learning-{phase}"
    return {"identity": f"{prefix}-identity.json", "resourceGo": f"{prefix}-go.json"}


def envelope(effect: ModuleType, base: Any, path: Path, expected: str) -> dict[str, Any]:
    effect.pin(path, expected)
    value = base.read(path)
    require(
        isinstance(value, dict)
        and set(value) == {"formatVersion", "effectOperator", "effectRequest", "oldPhases", "gap"}
        and type(value["formatVersion"]) is int
        and value["formatVersion"] == 1,
        "Exact gap request required",
    )
    require(
        value["effectOperator"] == {"path": str(EFFECT_OPERATOR), "sha256": EFFECT_SHA}
        and value["effectRequest"] == {"path": str(EFFECT_REQUEST), "sha256": EFFECT_REQUEST_SHA},
        "Pinned prior effect adapter and request required",
    )
    require(
        isinstance(value["oldPhases"], dict) and set(value["oldPhases"]) == PRIOR_PHASES,
        "Exact six consumed prior closures required",
    )
    for binding in value["oldPhases"].values():
        require(
            isinstance(binding, dict)
            and set(binding) == {"identitySha256", "completionSha256"}
            and all(base.sha(v) for v in binding.values()),
            "Actual closed prior identity/completion pins required",
        )
    declared = list(GAP_BLOCKS.items())
    require(
        isinstance(value["gap"], list)
        and 1 <= len(value["gap"]) <= len(declared)
        and all(
            isinstance(block, dict)
            and set(block) == {"seed", "games"}
            and all(type(block[key]) is int for key in block)
            and (block["seed"], block["games"]) == declared[i][1]
            for i, block in enumerate(value["gap"])
        ),
        "Only declared fresh gap blocks are allowed",
    )
    return value


def namespace(effect: ModuleType, base: Any, prior: dict[str, Any]) -> dict[str, Any]:
    """Reuse complete SHA-bound original definitions; prior phases keep their owners."""
    tree = ast.parse(effect.sealed_source(effect.BASE_OPERATOR, effect.BASE_SHA))
    definitions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    require(
        {"main", "blocks", "closed_phase", "whole", "go", "run", "tensor_worker"}
        <= {node.name for node in definitions},
        "Original reviewed function seam changed",
    )
    scope = {**vars(base), "__file__": __file__, "__name__": "gap_material_learning"}
    code = compile(ast.Module(body=definitions, type_ignores=[]), str(effect.BASE_OPERATOR), "exec")
    exec(code, scope)  # noqa: S102 - exact reviewed SHA-bound function definitions; no AST/source transformations.
    shared_closed = scope["closed_phase"]
    shared_whole = scope["whole"]
    shared_go = scope["go"]
    shared_predecessors = scope["predecessors"]

    def inputs(ctx: dict[str, Any]) -> None:
        effect.pin(Path(__file__), ctx["operatorSha256"])
        effect.pin(ctx["requestPath"], ctx["requestSha256"])
        effect.pin(EFFECT_OPERATOR, EFFECT_SHA)
        effect.pin(EFFECT_REQUEST, EFFECT_REQUEST_SHA)
        effect.expert_inputs(ctx["effectContext"])

    def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
        effect.pin(Path(__file__), operator_sha)
        request = envelope(effect, base, path, request_sha)
        before = prior["context"](EFFECT_REQUEST, EFFECT_REQUEST_SHA, EFFECT_SHA)
        expert = before["expertEnvelope"]
        entry = str(effect.LAB / "transfers/material-teacher-effect-entry.mjs")
        policy = str(effect.LAB / "transfers/material-teacher-effect-policy.mjs")
        require(
            expert["entry"] == entry
            and expert["expertModules"] == {entry: ENTRY_SHA, policy: POLICY_SHA},
            "Exact prior external entry and policy pins required",
        )
        require(
            all(request["oldPhases"][p] == v for p, v in expert["oldPhases"].items()),
            "Original closure pins differ from the effect request",
        )
        phases = list(GAP_BLOCKS)[: len(request["gap"])]
        extended = copy.deepcopy(before["request"])
        extended["contextExpansions"].extend(copy.deepcopy(request["gap"]))
        extended["phaseBindings"].update({p: bindings(p) for p in [*phases, *LEARNING_PHASES]})
        require(
            [f"contexts-{i + 1}" for i in range(len(extended["contextExpansions"]))][4:] == phases,
            "Gap blocks must directly follow the four prior expansions",
        )
        for phase in [*phases, *LEARNING_PHASES]:
            for key in ("identity", "resourceGo"):
                scope["lane"](extended["phaseBindings"][phase][key], LAB / "transfers")
        scope["blocks"](extended)  # Original overlap, reserved-final and period checks.
        commands = copy.deepcopy(before["commands"])
        template = commands["contexts-4"]
        require(
            template.count("--worker") == 1 and template[template.index("--worker") + 1] == entry,
            "Prior external worker selector changed",
        )
        for phase, block in zip(phases, request["gap"], strict=True):
            argv = template.copy()
            for option, option_value in (
                ("--seed", block["seed"]),
                ("--games", block["games"]),
                ("--output", before["run"] / phase),
            ):
                require(argv.count(option) == 1, "Original collection option changed")
                argv[argv.index(option) + 1] = str(option_value)
            commands[phase] = argv
        ctx = {
            **before,
            "request": extended,
            "requestPath": path,
            "requestSha256": request_sha,
            "operatorSha256": operator_sha,
            "gapEnvelope": request,
            "gapPhases": frozenset({*phases, *LEARNING_PHASES}),
            "effectContext": before,
            "commands": commands,
        }
        inputs(ctx)
        for phase in ("contexts-3", "contexts-4"):
            closed_phase(ctx, phase, request["oldPhases"][phase]["identitySha256"])
        return ctx

    def closed_phase(ctx: dict[str, Any], phase: str, identity_sha: str) -> dict[str, Any]:
        inputs(ctx)
        if phase in PRIOR_PHASES:
            bound = ctx["gapEnvelope"]["oldPhases"][phase]
            require(identity_sha == bound["identitySha256"], "Wrong prior predecessor identity")
            result = prior["closed_phase"](ctx["effectContext"], phase, identity_sha)
            require(
                result["completionSha256"] == bound["completionSha256"], "Prior closure changed"
            )
        else:
            require(phase in ctx["gapPhases"], "Unknown gap phase")
            result = shared_closed(ctx, phase, identity_sha)
        inputs(ctx)
        return result

    def whole(
        ctx: dict[str, Any], phase: str, identity_sha: str, *, closed: bool
    ) -> dict[str, Any]:
        require(phase in ctx["gapPhases"], "Gap operator cannot launch or own prior phases")
        inputs(ctx)
        return shared_whole(ctx, phase, identity_sha, closed=closed)

    def go(ctx: dict[str, Any], phase: str, approval_sha: str, *, idle: bool) -> dict[str, Any]:
        require(phase in ctx["gapPhases"], "Unknown gap resource phase")
        inputs(ctx)
        result = shared_go(ctx, phase, approval_sha, idle=idle)
        if phase == "imitation":
            require(
                "contexts-5" in result["predecessors"],
                "Imitation must consume the closed gap prefix",
            )
        inputs(ctx)
        return result

    def predecessors(ctx: dict[str, Any], phase: str, selected: set[str]) -> None:
        if phase == "contexts-6":
            require(
                selected == {"diagnostic", "contexts-5"},
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
    effect = effect_module()
    if _API is None:
        base = effect.original()
        _API = namespace(effect, base, effect.namespace(base))
    effect.pin(EFFECT_OPERATOR, EFFECT_SHA)
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
