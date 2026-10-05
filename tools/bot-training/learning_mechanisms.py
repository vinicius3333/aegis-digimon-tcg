"""Training-label coverage, distinct from accepted physical execution or playing strength."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path
from typing import Any

MECHANISMS = (
    "linkCard",
    "dnaDigivolve",
    "appFusion",
    "mainAssembly",
    "mainAssemblyMaterial",
    "effectAssemblyMaterial",
    "mainDigiXros",
    "effectDigiXrosMaterial",
)


def label_mechanism(window: dict[str, Any], selected: int) -> str:
    """Classify the target using bridge contracts, never labels or hidden card identities."""
    actions = window["actions"]
    if type(selected) is not int or not 0 <= selected < len(actions):
        raise ValueError("Invalid supervised action index")
    intent = actions[selected]["intent"]
    kind = intent["type"]
    if kind == "playCard":
        if "assembly" in intent:
            return "mainAssembly"
        if "digiXros" in intent:
            return "mainDigiXros"
    if kind != "respondDecision" or window.get("kind") != "selectCards":
        return kind
    response = intent.get("response", {})
    # An empty decline teaches refusal, not a positive material route. Finishing a
    # nonempty sequential selection remains part of that route's supervision.
    if response.get("kind") != "selectCards" or not (
        response.get("instanceIds") or window.get("selected")
    ):
        return kind
    request = window.get("request") or {}
    options = request.get("options") or {}
    if options.get("assemblyCardId"):
        return "effectAssemblyMaterial"
    if options.get("digiXrosCardId"):
        return "effectDigiXrosMaterial"
    # Main Assembly uses this explicit private marker and no engine request.
    if not request and intent.get("decisionId") == "assembly":
        return "mainAssemblyMaterial"
    return kind


def sample_context(row: dict[str, Any]) -> dict[str, Any]:
    window = row["window"]
    if window.get("role", "learner") != "learner":
        raise ValueError("Imitation labels must belong to the learner")
    seat = window["observation"]["seat"]
    if type(seat) is not int or seat not in (0, 1):
        raise ValueError("Learner seat must be 0 or 1")
    return {"mechanism": label_mechanism(window, row["action"]), "seat": seat}


def coverage(contexts: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    counts = {
        fold: dict(Counter(f"{row['mechanism']}:seat{row['seat']}" for row in rows))
        for fold, rows in contexts.items()
    }
    missing = {
        fold: [
            f"{mechanism}:seat{seat}"
            for mechanism in MECHANISMS
            for seat in (0, 1)
            if not counts[fold].get(f"{mechanism}:seat{seat}")
        ]
        for fold in ("training", "validation")
    }
    return {
        "nontrivialSupervisedLabelsByFold": counts,
        "missingMechanismSeatsByFold": missing,
        "allMechanismsBothSeatsBothFolds": not any(missing.values()),
        "physicalExecutionOrStrengthEstablished": False,
    }


def require_coverage(contexts: dict[str, list[dict[str, Any]]]) -> None:
    gaps = coverage(contexts)["missingMechanismSeatsByFold"]
    if any(gaps.values()):
        raise ValueError(f"Missing mechanism/seat supervision in original episode folds: {gaps}")


def inspect_dataset(dataset: Path) -> dict[str, Any]:
    """Inspect complete-named episodes without encoding, loading models or moving folds.

    Source terminal/custody verification remains the producer's strict consumer's job.
    This report cannot certify an unverified dataset merely because files have names.
    """
    config = dataset / "config.json"
    if not config.is_file():
        raise ValueError("Missing dataset configuration")
    hashes = {"config.json": hashlib.sha256(config.read_bytes()).hexdigest()}
    contexts: dict[str, list[dict[str, Any]]] = {"training": [], "validation": []}
    episodes: dict[str, list[str]] = {"training": [], "validation": []}
    for path in sorted(dataset.glob("episode-*.jsonl")):
        index = int(path.stem.split("-")[-1])
        fold = "validation" if index % 5 == 0 else "training"
        episodes[fold].append(path.name)
        contents = path.read_bytes()
        hashes[path.name] = hashlib.sha256(contents).hexdigest()
        for line in contents.decode("utf-8").splitlines():
            row = json.loads(line)
            if row["supervised"] is True and len(row["window"]["actions"]) > 1:
                contexts[fold].append(sample_context(row))
    return {
        "sourceHashes": hashes,
        "originalIndexModuloFiveEpisodeFolds": episodes,
        "sourceTerminalAndCustodyVerified": False,
        **coverage(contexts),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = inspect_dataset(args.dataset)
    # Do not overwrite evidence from a previous invocation.
    with args.output.open("x", encoding="utf-8") as stream:
        json.dump(report, stream, indent=2)


if __name__ == "__main__":
    main()
