"""External f14 runtime adapter: actual closed V41 source basis, no V44 admission.

The sealed f14 build/migration/whole/Go functions stay unchanged. Only explicit
context selectors and the historical report label change. No scheduling or model
imports here; original metadata-only model work remains ROOT-gated in its child.
"""

import ast
import hashlib
import json
import re
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
SEALED = LAB / "transfers/material-teacher-runtime-reviewed.py"
SEALED_SHA = "f14ced506df5352fde9061835c8af6fb5dea820bbaaf303128c5883811e217c5"
BASIS_CONSUMER = LAB / "transfers/aegis-v42-corrective-physical-comparison.py"
BASIS_CONSUMER_SHA = "a85478961a835158c8a38088ea23fc4b650e8ae25fd5a7d6b95e40595b5c4ccf"
BASIS_RUN = LAB / "runs/2026-10-05-bt26-ex13-v41-corrective-fresh-comparison"
BASIS_ID = "7f143fb777f5ace7a51eea5df76618fe3d580239bb5bb3489209dec26f689821"
BASIS_OPERATOR = "703b642f43f09b588d7618014f8b74af0b3b2122516f3b8089d5792494985f32"
BASIS_WRAPPER = "b4ad21545c7d121445b150c800f55a529d2b4ac0e9f1df479b2107d684e2b218"
BASIS_COMPLETION_SHA = "be218d5bdfa6ce535b77aeff98d7a01d5195792875b2dd0d6866750e19051a9b"
BASIS_REPORT_SHA = "52faf4bb8086d10ecfde6e48a64fae163616c8800094fc672aa1edc987442c7d"
SOURCE = "1cec011c0fd0c6481e7297506ed4c825a4dfcdc7"
ARCHIVE = "7eb27ab7c35d749c6ed6447a7db40522352df2e97ee2ae79ad765f76b6bec080"
MANIFEST = "0c1b5546ca96ef9e225f07fe68c8beb3293c1d5b0292849e611bf882630afe68"
V50_PATH = LAB / "transfers/aegis-v50-integrated-runtime-qualification.py"
V50_SHA = "4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c"
LABELS = {"v17-reference", "source-challenger", "fitted-reference", "challenger"}
SELECTORS = {
    "request['custody']": ("request['basis']", 6),
    "V45_SHA": ("BASIS_CONSUMER_SHA", 1),
    "load(V45_PATH, V45_SHA)": ("load(BASIS_CONSUMER, BASIS_CONSUMER_SHA)", 1),
    "consumer.CUSTODY": ("consumer.FRESH", 1),
    "consumer.CUSTODY_SHA": ("consumer.FRESH_SHA", 1),
    "consumer.completed_custody(consumer.custody_module())": (
        "source_basis(consumer, request['basis'])",
        1,
    ),
    "CUSTODY_RUN / 'material-custody-report.json'": ("BASIS_RUN / 'fresh-report.json'", 1),
}


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def sha(value: Any) -> bool:
    return isinstance(value, str) and re.fullmatch("[a-f0-9]{64}", value) is not None


def digest(path: Path) -> str:
    require(path.is_file() and not path.is_symlink(), "Missing immutable regular input")
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def pin(path: Path, value: Any) -> None:
    require(sha(value) and digest(path) == value, "Unknown/mismatched actual byte pin")


def source_basis(consumer: Any, request: dict[str, Any]) -> dict[str, Any]:
    """One original V42 consumption per context; no invented V44 closure."""
    require(
        consumer.FRESH == BASIS_RUN
        and consumer.IDENTITY_SHA == BASIS_ID
        and consumer.FRESH_SHA == BASIS_OPERATOR
        and consumer.FRESH_WRAPPER_SHA == BASIS_WRAPPER,
        "Wrong original V41 source basis selectors",
    )
    require(
        request["completionSha256"] == BASIS_COMPLETION_SHA
        and request["reportSha256"] == BASIS_REPORT_SHA,
        "Authoritative actual V41 receipt byte pins required",
    )
    pin(consumer.IDENTITY, BASIS_ID)
    identity = json.loads(consumer.IDENTITY.read_text(encoding="utf-8"))
    require(
        identity
        == {
            "wholeWrapperPid": 2933,
            "startTicks": "518861",
            "run": BASIS_RUN.name,
            "operatorSha256": BASIS_OPERATOR,
            "wrapperSha256": BASIS_WRAPPER,
        },
        "Actual immutable V41 whole identity changed",
    )
    pin(BASIS_RUN / "completion.json", request["completionSha256"])
    pin(BASIS_RUN / "fresh-report.json", request["reportSha256"])
    actual = consumer.completed_fresh(consumer.fresh_module())
    require(
        actual["trained"] is True
        and set(actual["checkpointPaths"]) == set(actual["checkpointHashes"]) == LABELS,
        "Actual four preserved source policies required",
    )
    pin(BASIS_RUN / "completion.json", request["completionSha256"])
    pin(BASIS_RUN / "fresh-report.json", request["reportSha256"])
    return {
        **actual,
        "completionSha256": request["completionSha256"],
        "reportSha256": request["reportSha256"],
        "sourceBasisType": "actual-closed-v41-four-policy-development",
        "sourceConsumerSha256": BASIS_CONSUMER_SHA,
        "historicalPhysicalAccepted": False,
        "historicalRoomsAccepted": False,
        "acceptedStrengthOrMastery": False,
    }


def adapted_tree(tree: ast.Module) -> ast.Module:
    """Adapt only context selectors and two explicit historical report keys."""
    functions = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}
    require(
        {"context", "qualification", "main"} <= set(functions), "Original f14 interface missing"
    )
    counts = dict.fromkeys(SELECTORS, 0)

    class Select(ast.NodeTransformer):
        def visit(self, node: ast.AST) -> ast.AST:
            key = ast.unparse(node)
            if key in SELECTORS:
                counts[key] += 1
                return ast.copy_location(ast.parse(SELECTORS[key][0], mode="eval").body, node)
            return super().visit(node)

    context_node = Select().visit(functions["context"])
    require(
        all(counts[key] == expected for key, (_, expected) in SELECTORS.items()),
        "Pinned f14 selector cardinality changed",
    )
    labels = 0

    class ReportLabel(ast.NodeTransformer):
        def visit_Constant(self, node: ast.Constant) -> ast.AST:
            nonlocal labels
            if node.value == "actualV44Custody":
                labels += 1
                return ast.copy_location(ast.Constant(value="actualV41SourceBasis"), node)
            return node

    qualification_node = ReportLabel().visit(functions["qualification"])
    main_node = ReportLabel().visit(functions["main"])
    require(labels == 2, "Pinned f14 report label cardinality changed")
    return ast.fix_missing_locations(
        ast.Module(body=[context_node, qualification_node, main_node], type_ignores=[])
    )


def bound_context(
    module: ModuleType, path: Path, request_sha: str, operator_sha: str
) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Stdlib admission without -O/preloaded Torch")
    pin(Path(__file__), operator_sha)
    pin(path, request_sha)
    request = module.read(path)
    source = request["source"]
    require(
        source["commit"] == SOURCE
        and source["archive"]["sha256"] == ARCHIVE
        and type(source["archive"]["bytes"]) is int
        and source["archive"]["bytes"] == 43769742
        and source["manifest"]["sha256"] == MANIFEST,
        "Frozen actual teacher source required",
    )
    require(
        "basis" in request and "custody" not in request,
        "Explicit V41 basis, never relabel V44 completed",
    )
    require(
        request["basis"]["consumerSha256"] == BASIS_CONSUMER_SHA
        and request["basis"]["identitySha256"] == BASIS_ID
        and request["basis"]["completionSha256"] == BASIS_COMPLETION_SHA
        and request["basis"]["reportSha256"] == BASIS_REPORT_SHA,
        "Actual closed V41 pins required",
    )
    result = module.admitted_context(path, request_sha, operator_sha)
    require(
        "torch" not in sys.modules
        and result["prior"]["custody"]["sourceBasisType"]
        == "actual-closed-v41-four-policy-development"
        and result["prior"]["custody"]["historicalPhysicalAccepted"] is False
        and result["prior"]["custody"]["historicalRoomsAccepted"] is False,
        "No false historical acceptance",
    )
    result["_adapterRuntime"] = module
    return result


def runtime() -> ModuleType:
    sys.dont_write_bytecode = True
    pin(SEALED, SEALED_SHA)
    source = SEALED.read_bytes()
    require(hashlib.sha256(source).hexdigest() == SEALED_SHA, "Original f14 source bytes changed")
    module = ModuleType("sealed_f14_source_basis")
    module.__file__ = str(SEALED)
    exec(compile(source, str(SEALED), "exec"), vars(module))  # noqa: S102 - full immutable SHA-bound f14 source, no producer main or bytecode cache.
    pin(SEALED, SEALED_SHA)
    # These are declared target selectors only; original command/whole/cost/loop
    # functions continue using their existing module globals and code objects.
    module.__file__ = str(Path(__file__))
    module.CUSTODY_RUN, module.CUSTODY_ID = BASIS_RUN, BASIS_ID
    module.BASIS_CONSUMER, module.BASIS_CONSUMER_SHA = BASIS_CONSUMER, BASIS_CONSUMER_SHA
    module.BASIS_RUN, module.source_basis = BASIS_RUN, source_basis
    exec(compile(adapted_tree(ast.parse(source)), str(SEALED), "exec"), vars(module))  # noqa: S102 - exact SHA-pinned f14 AST and counted declared selectors only.
    module.admitted_context = module.context
    module.context = lambda path, request_sha, operator_sha: bound_context(
        module, path, request_sha, operator_sha
    )
    pin(SEALED, SEALED_SHA)
    return module


def context(path: Path, request_sha: str, operator_sha: str) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Stdlib actual admission required")
    pin(Path(__file__), operator_sha)
    pin(path, request_sha)
    return bound_context(runtime(), path, request_sha, operator_sha)


def closed_prepare(ctx: dict[str, Any], identity_sha: str) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Stdlib actual closed reader required")
    pin(SEALED, SEALED_SHA)
    pin(Path(__file__), ctx["operatorSha256"])
    return ctx["_adapterRuntime"].closed_prepare(ctx, identity_sha)


def closed_migration(
    ctx: dict[str, Any], identity_sha: str, prepare_identity_sha: str
) -> dict[str, Any]:
    require(__debug__ and "torch" not in sys.modules, "Stdlib actual closed reader required")
    pin(SEALED, SEALED_SHA)
    pin(Path(__file__), ctx["operatorSha256"])
    return ctx["_adapterRuntime"].closed_migration(ctx, identity_sha, prepare_identity_sha)


def extract(
    path: Path, expected: str, names: set[str], namespace: dict[str, Any]
) -> dict[str, Any]:
    return runtime().extract(path, expected, names, namespace)


def helpers(ctx: dict[str, Any]) -> dict[str, Any]:
    pin(SEALED, SEALED_SHA)
    return ctx["_adapterRuntime"].helpers(ctx)


def host() -> None:
    runtime().host()


def main() -> None:
    require(__debug__ and "torch" not in sys.modules, "Stdlib phase admission required")
    runtime().main()


if __name__ == "__main__":
    main()
