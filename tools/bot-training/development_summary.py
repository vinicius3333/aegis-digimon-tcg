"""Summarize V41 only after its unchanged, sealed whole-result consumer succeeds.

Run on desktop with stdlib Python (never -O). This is an adjunct to the original
comparison; it neither changes that verdict nor establishes physical mastery.
"""

import argparse
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

LAB = Path("/home/vinicius/aegis-bot-lab")
RUN = LAB / "runs/2026-10-05-bt26-ex13-v41-corrective-fresh-comparison"
CONSUMER = LAB / "transfers/aegis-v42-corrective-physical-comparison.py"
CONSUMER_SHA = "a85478961a835158c8a38088ea23fc4b650e8ae25fd5a7d6b95e40595b5c4ccf"
LABELS = ("v17-reference", "source-challenger", "fitted-reference", "challenger")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def digest(path: Path) -> str:
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def read(path: Path) -> Any:
    return json.loads(path.read_text())


def load_pinned(path: Path, expected: str) -> Any:
    require(__debug__ and "torch" not in sys.modules, "Use stdlib Python without -O")
    require(len(expected) == 64 and digest(path) == expected, "Consumer SHA mismatch")
    spec = importlib.util.spec_from_file_location("sealed_" + expected, path)
    require(spec is not None and spec.loader is not None, "Missing consumer loader")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    require(digest(path) == expected, "Consumer changed during import")
    return module


def whole_closed(run: Path, identity: dict[str, Any]) -> None:
    exit_file = Path(str(run) + "-launch") / "exit-code.txt"
    require(exit_file.is_file(), "Whole still live or not closed; no verdict")
    require(exit_file.read_text().strip() == "0", "Whole did not succeed")
    stat = Path("/proc") / str(identity["wholeWrapperPid"]) / "stat"
    if stat.exists():
        contents = stat.read_text()
        fields = contents[contents.rindex(")") + 2 :].split()
        require(fields[19] != identity["startTicks"] or fields[0] == "Z", "Whole still live")


def closed_inputs() -> tuple[Any, dict[str, Any], dict[str, Any]]:
    # Do not even import the consumer or read active parent maps before WHOLE0.
    whole_closed(RUN, {"wholeWrapperPid": 2933, "startTicks": "518861"})
    consumer = load_pinned(CONSUMER, CONSUMER_SHA)
    require(consumer.FRESH == RUN, "Unexpected V41 target")
    module = consumer.fresh_module()
    pins = consumer.completed_fresh(module)
    require(pins["trained"] is True, "No trained current primary")
    results = {label: read(RUN / label / "results.json") for label in LABELS}
    whole_closed(RUN, read(consumer.IDENTITY))
    return consumer, pins, results


def win(row: dict[str, Any]) -> bool:
    return row["winnerSeat"] == row["learnerSeat"]


def paired(rows: list[dict[str, Any]], reference: list[dict[str, Any]]) -> dict[str, int]:
    gained = sum(win(a) and not win(b) for a, b in zip(rows, reference, strict=True))
    lost = sum(not win(a) and win(b) for a, b in zip(rows, reference, strict=True))
    return {"games": len(rows), "gainedWins": gained, "lostWins": lost, "netWins": gained - lost}


def summarize(results: dict[str, Any]) -> dict[str, Any]:
    require(set(results) == set(LABELS), "All four policies required")
    episodes = {label: result["episodes"] for label, result in results.items()}
    rows = episodes["challenger"]
    require(len(rows) == 3872, "Incomplete comparison")
    versions = [row["decks"][row["learnerSeat"]] for row in rows[:44]]
    require(len(set(versions)) == 44, "All 44 recipes required")
    cells = Counter((row["decks"][row["learnerSeat"]], row["learnerSeat"]) for row in rows)
    require(set(cells) == {(v, s) for v in versions for s in (0, 1)}, "Missing recipe/seat")
    require(set(cells.values()) == {44}, "Unbalanced recipe/seat counts")
    for label, policy_rows in episodes.items():
        require(len(policy_rows) == 3872, "Incomplete policy " + label)
        for i, (current, row) in enumerate(zip(rows, policy_rows, strict=True)):
            require(row["seed"] == 6164000 + i, "Changed development seeds")
            require(
                all(
                    row[key] == current[key] for key in ("seed", "learnerSeat", "decks", "deckPins")
                ),
                "Unpaired recipes or seats",
            )
            require(row["type"] == "result" and row["usable"] is True, "Failed/unusable episode")
            require(
                row["terminated"] is True and row["truncated"] is False, "Non-natural termination"
            )
            require(row["reason"] in {"security", "deckOut"}, "Unexpected terminal reason")
            require(
                type(row["winnerSeat"]) is int and row["winnerSeat"] in (0, 1), "Invalid winner"
            )
            require(
                not any(row[key] for key in ("errors", "rejections", "asyncRejections")),
                "Engine failure",
            )
            require("trainingForfeit" not in row, "Forfeit forbidden")
            require(
                type(row["decisions"]) is int and 0 <= row["decisions"] < 4000,
                "Decision cap reached",
            )
    groups = {"all": list(range(3872))}
    groups.update(
        {f"seat{s}": [i for i, r in enumerate(rows) if r["learnerSeat"] == s] for s in (0, 1)}
    )
    # Membership comes from the fixed catalog/support order, never win totals.
    for cohort, selected in (
        ("BT26", versions[:11]),
        ("EX13", versions[11:26]),
        ("support", versions[26:]),
    ):
        require(
            all(v.startswith(cohort.lower() + "-") for v in selected)
            if cohort != "support"
            else all(v.startswith("curriculum-") for v in selected),
            "Unexpected cohort order",
        )
        groups[cohort] = [i for i, r in enumerate(rows) if r["decks"][r["learnerSeat"]] in selected]
        for seat in (0, 1):
            groups[f"{cohort}:seat{seat}"] = [
                i for i in groups[cohort] if rows[i]["learnerSeat"] == seat
            ]
    groups.update(
        {v: [i for i, r in enumerate(rows) if r["decks"][r["learnerSeat"]] == v] for v in versions}
    )
    for version in versions:
        for seat in (0, 1):
            groups[f"{version}:seat{seat}"] = [
                i for i in groups[version] if rows[i]["learnerSeat"] == seat
            ]
    comparisons = {}
    for reference in LABELS[:3]:
        comparisons[reference] = {
            name: paired([rows[i] for i in indices], [episodes[reference][i] for i in indices])
            for name, indices in groups.items()
        }
    regressions = [
        {"recipe": version, "against": reference, **comparisons[reference][version]}
        for reference in LABELS[:3]
        for version in versions
        if comparisons[reference][version]["netWins"] <= 0
    ]
    regressions.sort(key=lambda row: (row["netWins"], row["recipe"], row["against"]))
    reliability = {
        label: {
            "games": len(policy_rows),
            "naturalTerminations": len(policy_rows),
            "failed": 0,
            "unusable": 0,
            "forfeits": 0,
            "capReached": 0,
            "reasons": dict(Counter(row["reason"] for row in policy_rows)),
            "selectedProposals": results[label]["summary"]["actionCoverage"]["selectedProposals"],
        }
        for label, policy_rows in episodes.items()
    }
    for label, policy_rows in episodes.items():
        reliability[label]["proposedCompoundActionsBySeat"] = {
            str(seat): dict(
                sum(
                    (
                        Counter(row["actionCoverage"]["selectedProposals"])
                        for row in policy_rows
                        if row["learnerSeat"] == seat
                    ),
                    Counter(),
                )
            )
            for seat in (0, 1)
        }
    return {
        "pairedComparisons": comparisons,
        "recipesWithoutStrictGain": regressions,
        "reliability": reliability,
        "physicalMasteryEstablished": False,
        "currentEngineAcceptanceEstablished": False,
        "finalBlindAccepted": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    require(not args.output.exists(), "Preserve existing evidence")
    consumer, pins, results = closed_inputs()
    report = summarize(results)
    report.update(
        {
            "unchangedConsumerSha256": CONSUMER_SHA,
            "checkpointHashes": pins["checkpointHashes"],
            "wholeCompletionSha256": digest(RUN / "completion.json"),
            "originalStrictComparison": read(RUN / "fresh-report.json"),
            "configResultReceiptHashes": {
                str(p.relative_to(RUN)): digest(p)
                for label in LABELS
                for p in (
                    RUN / label / "config.json",
                    RUN / label / "results.json",
                    RUN / f"{label}-receipt.json",
                )
            },
        }
    )
    # A second unchanged-consumer read detects custody changes during summarization.
    require(consumer.completed_fresh(consumer.fresh_module()) == pins, "Custody changed")
    with args.output.open("x") as stream:
        json.dump(report, stream, indent=2, sort_keys=True)
        stream.write("\n")


if __name__ == "__main__":
    main()
