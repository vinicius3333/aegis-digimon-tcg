"""Prepare commands after real V41/V49/V50 closure; never execute games or models.

The root coordinator supplies the sealed V50 consumer/identity and a fresh request.
Coverage and actual CUDA/model parity remain mandatory before any learning command.
"""

import argparse
import ast
import json
import re
from pathlib import Path
from typing import Any

from development_summary import LAB, closed_inputs, digest, load_pinned, read, require

SOURCE = "7d34b4c1267e0bc266736e61b43cb28debf598ee"
ARCHIVE_SHA = "a7dada720768672287b2af577f64b383f2b71e2eba73a5bb6ebc21dbccd0f021"
QUALIFICATION_SHA = "4cfb5f462169eac06c01d70a51ae48f38987f0641006d3af23bd24c90db5c27c"
INVENTORY = LAB / "transfers/aegis-v27-fresh-curriculum-comparison.py"
INVENTORY_SHA = "c984171ddba83eecf49b0f41c20a5fe221e7a777a0b81e456acb02cfecdd15a9"
SIZES = {"diagnostic": 88, "contexts": 436, "ppo": 3872, "comparison": 3872}


def validate_blocks(blocks: dict[str, Any]) -> None:
    require(set(blocks) == set(SIZES), "Exact bounded development blocks required")
    occupied: set[int] = set()
    for name, size in SIZES.items():
        start = blocks[name]
        require(type(start) is int and start >= 0, "Invalid seed")
        seeds = set(range(start, start + size))
        require(start + size <= 6210000, "Reserved/final seeds prohibited")
        require(not seeds & occupied, "Development blocks overlap")
        occupied |= seeds


def fresh_inventory(run: Path, start: int, games: int) -> dict[str, Any]:
    require(__debug__, "Original inventory assertions must remain enabled")
    require(digest(INVENTORY) == INVENTORY_SHA, "Inventory source changed")
    nodes = [
        node
        for node in ast.parse(INVENTORY.read_text()).body
        if isinstance(node, ast.FunctionDef) and node.name == "inventory_seeds"
    ]
    require(len(nodes) == 1, "Missing original inventory")
    namespace = {
        "Any": Any,
        "Path": Path,
        "re": re,
        "LAB": LAB,
        "RUN": run,
        "SEED": start,
        "GAMES": games,
        "read": read,
        "digest": digest,
    }
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(INVENTORY), "exec"), namespace)  # noqa: S102 - SHA-bound unchanged read-only original inventory.
    return namespace["inventory_seeds"]()


def minimum_fold_prefix() -> int:
    for count in range(88, 441):
        cells: dict[tuple[int, int], set[bool]] = {}
        for index in range(count):
            cells.setdefault((index % 44, (index // 44) % 2), set()).add(index % 5 == 0)
        if len(cells) == 88 and all(len(folds) == 2 for folds in cells.values()):
            return count
    raise ValueError("No both-fold context prefix")


def commands(checkout: Path, bindings: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    blocks = request["seeds"]
    validate_blocks(blocks)
    require(
        set(bindings) == {"v17-reference", "source-challenger", "fitted-reference", "challenger"},
        "Four preserved checkpoints required",
    )
    primary = bindings["challenger"]["path"]
    references = [
        bindings[label]["path"]
        for label in ("v17-reference", "source-challenger", "fitted-reference")
    ]
    require(len({primary, *references}) == 4, "Checkpoint paths must differ")
    run = Path(request["futureRun"])
    require(
        run.is_relative_to(LAB / "runs") and run.parent == LAB / "runs",
        "Fresh lane-specific run required",
    )
    require(not run.exists() and "learning-followthrough" in run.name, "Preserve prior runs")
    require(type(request["imitationSeed"]) is int, "Invalid optimizer RNG seed")
    python = str(LAB / "venv/bin/python")
    source = checkout / "tools/bot-training"
    worker = str(checkout / "apps/api/dist/bot/training/cli.js")
    dataset = run / "contexts"
    imitation = run / "imitation"
    ppo = run / "ppo"
    collections = {
        name: [
            python,
            str(source / "collect.py"),
            "--worker",
            worker,
            "--output",
            str(run / name),
            "--checkpoint",
            primary,
            "--device",
            "cuda",
            "--workers",
            "4",
            "--games",
            str(SIZES[name]),
            "--seed",
            str(blocks[name]),
            "--curriculum",
        ]
        for name in ("diagnostic", "contexts")
    }
    inspect = [
        python,
        str(source / "learning_mechanisms.py"),
        "--dataset",
        str(dataset),
        "--output",
        str(run / "label-coverage.json"),
    ]
    fit = [
        python,
        str(source / "imitate.py"),
        "--dataset",
        str(dataset),
        "--output",
        str(imitation),
        "--checkpoint",
        primary,
        "--device",
        "cuda",
        "--epochs",
        "3",
        "--seed",
        str(request["imitationSeed"]),
        "--learning-rate",
        "0.00001",
        "--policy-anchor",
        "0.25",
        "--mechanism-share",
        "0.20",
    ]
    train = [
        python,
        str(source / "train.py"),
        "--worker",
        worker,
        "--output",
        str(ppo),
        "--checkpoint",
        str(imitation / "checkpoint.pt"),
        "--device",
        "cuda",
        "--workers",
        "4",
        "--games",
        "3872",
        "--batch-games",
        "88",
        "--curriculum",
        "--seed",
        str(blocks["ppo"]),
        "--learning-rate",
        "0.00003",
        "--max-failures",
        "0",
        "--max-decisions",
        "4000",
        "--snapshot-games",
        "352",
        "--heuristic-share",
        "0.60",
        *[arg for reference in references for arg in ("--opponent-checkpoint", reference)],
    ]
    comparisons = [
        [
            python,
            str(source / "train.py"),
            "--worker",
            worker,
            "--output",
            str(run / ("comparison-" + label)),
            "--checkpoint",
            path,
            "--device",
            "cuda",
            "--workers",
            "4",
            "--games",
            "3872",
            "--batch-games",
            "88",
            "--seed",
            str(blocks["comparison"]),
            "--curriculum",
            "--evaluate",
            "--max-failures",
            "0",
            "--max-decisions",
            "4000",
        ]
        for label, path in [
            ("candidate", str(ppo / "checkpoint.pt")),
            ("primary-before", primary),
            *[
                (label, bindings[label]["path"])
                for label in ("v17-reference", "source-challenger", "fitted-reference")
            ],
        ]
    ]
    return {
        "launchesAnyJob": False,
        "resourceOwner": "coordinator",
        "gpuConcurrentJobs": 1,
        "workers": 4,
        "diagnosticCommand": collections["diagnostic"],
        "contextCommandConditionalOnReviewedLabelProducer": collections["contexts"],
        "coverageCommand": inspect,
        "imitationConditionalOnStrictCorpusCoverage": fit,
        "ppoConditionalOnValidatedImitationAndTensorCustody": train,
        "sequentialDevelopmentComparisonCommands": comparisons,
        "seedBlocksHalfOpen": {
            name: [blocks[name], blocks[name] + size] for name, size in SIZES.items()
        },
        "minimumBothFoldRecipeSeatOpportunityPrefix": minimum_fold_prefix(),
        "contextCoverageGuaranteed": False,
        "automaticJobAdmission": False,
        "teacherSeam": "Main Assembly material windows currently have unavailable labels; collect.py alone cannot fill all eight families. Root must review a genuine teacher seam or an unchanged winning-choice corpus producer, with exact provenance and original index%5 folds.",
        "beforeAnyJob": "Root scheduling and real current-primary CUDA/model reload parity; idle desktop; fresh unchanged seed inventory recheck.",
        "beforeAnyLearning": "Closed strict producer terminal/source/custody consumer, no forfeit/errors/cap, exact eight families x both seats x original train/validation folds, all181 identities/all44 recipes retained. Never move folds or relabel teacher-null fallbacks.",
        "afterLearning": "Actual Adam/finite changed tensor/reload custody plus strict all44 paired gains and current-policy bothseat Link/DNA/full Charismon/Mienumon/Main+effect Assembly/DigiXros/rooms; fresh final blind remains separate.",
        "streamEvaluationEnabled": False,
        "finalBlindSeedsConsumed": False,
    }


def prepare(request: dict[str, Any], qualification: Any, identity_sha: str) -> dict[str, Any]:
    require(
        qualification.COMMIT == SOURCE and qualification.ARCHIVE_SHA == ARCHIVE_SHA,
        "Unexpected qualified source",
    )
    qualified = qualification.closed(
        identity_sha
    )  # Original V50 closure also consumes actual V49 custody.
    require(
        qualified["sourceCommit"] == SOURCE and qualified["cpuRuntimeQualified"] is True,
        "Runtime not closed",
    )
    require(
        qualified["noPromotionClaim"] is True and qualified["finalBlindAccepted"] is False,
        "Qualification scope changed",
    )
    consumer, pins, _ = closed_inputs()
    metadata = read(qualification.RUN / "metadata.json")
    curriculum = read(qualification.RUN / "curriculum.json")
    expected = {f"BT26-{number:03}" for number in range(1, 105)} | {
        f"EX13-{number:03}" for number in range(1, 78)
    }
    require(
        len(metadata["cardIds"]) == len(set(metadata["cardIds"])) == 479
        and expected <= set(metadata["cardIds"]),
        "Current 479/181 vocabulary required",
    )
    require(
        len(metadata["decks"]) == 26
        and len(curriculum["decks"]) == 44
        and curriculum["decks"][:26] == metadata["decks"],
        "Exact 26+18 recipe scope required",
    )
    require(
        metadata["engineSha256"] == curriculum["engineSha256"] == qualified["engineSha256"],
        "Engine mismatch",
    )
    bindings = qualified["checkpointBindings"]
    for binding in bindings.values():
        require(digest(Path(binding["path"])) == binding["sha256"], "Actual V49 checkpoint changed")
    report = commands(qualification.CHECKOUT, bindings, request)
    report["inventories"] = {
        name: fresh_inventory(Path(request["futureRun"]), request["seeds"][name], size)
        for name, size in SIZES.items()
    }
    require(
        qualification.closed(identity_sha) == qualified, "Qualification changed during planning"
    )
    require(
        consumer.completed_fresh(consumer.fresh_module()) == pins, "V41 changed during planning"
    )
    report.update(
        {
            "qualifiedRuntimeBindings": qualified,
            "closedV41CheckpointHashes": pins["checkpointHashes"],
            "noAdditionalCheckpointMigration": True,
        }
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--qualification-consumer", type=Path, required=True)
    parser.add_argument("--qualification-consumer-sha256", required=True)
    parser.add_argument("--qualification-identity-sha256", required=True)
    parser.add_argument("--request", type=Path, required=True)
    parser.add_argument("--request-sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    require(not args.output.exists(), "Preserve existing plans")
    require(digest(args.request) == args.request_sha256, "Planning request changed")
    require(
        args.qualification_consumer_sha256 == QUALIFICATION_SHA,
        "Use the root-reviewed sealed V50 consumer",
    )
    qualification = load_pinned(args.qualification_consumer, args.qualification_consumer_sha256)
    report = prepare(read(args.request), qualification, args.qualification_identity_sha256)
    report["qualificationConsumerSha256"] = args.qualification_consumer_sha256
    report["requestSha256"] = args.request_sha256
    with args.output.open("x") as stream:
        json.dump(report, stream, indent=2, sort_keys=True)
        stream.write("\n")


if __name__ == "__main__":
    main()
