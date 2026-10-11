"""Keep reflection structural and gate each proposal on fresh paired seed blocks."""

import json
from pathlib import Path

from gepa.strategies.instruction_proposal import InstructionProposalSignature

from adapter import REFLECTION_TEMPLATE
from evidence import paired_evidence, policy_hash
from residual_weights import RESIDUAL_WEIGHTS


def guarded_proposer(
    adapter, reflector, calibrated: dict, tasks: list[dict], directory: Path, proposal_limit: int
):
    if len(tasks) < 48:
        raise ValueError("Proposal gates require at least 48 paired games")
    weights = {}
    exact_weights = {}
    for rule in calibrated["rules"]:
        weights.setdefault(rule["feature"], rule["weight"])
        if "when" not in rule:
            weights[rule["feature"]] = rule["weight"]
        exact_weights[(rule["feature"], json.dumps(rule.get("when"), sort_keys=True))] = rule[
            "weight"
        ]
    directory.mkdir(parents=True, exist_ok=True)
    calls = max(
        (int(path.stem.split("-")[1]) for path in directory.glob("proposal-*.json")), default=0
    )

    def propose(candidate, dataset, components):
        nonlocal calls
        if calls >= proposal_limit:
            return candidate
        calls += 1
        reservation = directory / f"proposal-{calls:04d}.json"
        reservation.write_text(
            json.dumps(
                {"status": "reserved", "proposalNumber": calls, "parent": candidate}, indent=2
            )
            + "\n"
        )
        text = InstructionProposalSignature.run(
            lm=reflector,
            input_dict={
                "current_instruction_doc": candidate["heuristic"],
                "dataset_with_feedback": dataset["heuristic"],
                "prompt_template": REFLECTION_TEMPLATE,
            },
        )["new_instruction"]
        program = json.loads(text)
        if program.get("basePolicy") != calibrated.get("basePolicy"):
            reservation.write_text(
                json.dumps({"program": program, "status": "rejected-base-change"}, indent=2) + "\n"
            )
            return candidate
        for rule in program["rules"]:
            calibrated_weight = exact_weights.get(
                (rule["feature"], json.dumps(rule.get("when"), sort_keys=True)),
                weights.get(rule["feature"], 1),
            )
            if (
                calibrated.get("basePolicy") == "projected-balanced"
                and calibrated_weight == 0
                and rule["weight"] != 0
            ):
                calibrated_weight = RESIDUAL_WEIGHTS.get(rule["feature"], 0.25)
            if (
                rule["weight"] != 0
                and calibrated_weight != 0
                and rule["weight"] * calibrated_weight < 0
            ):
                (directory / f"proposal-{calls:04d}.json").write_text(
                    json.dumps(
                        {
                            "program": program,
                            "rejected": "Reflection changed calibrated weight sign; advice needs reauthoring",
                        },
                        indent=2,
                    )
                    + "\n"
                )
                return candidate
            rule["weight"] = calibrated_weight
        # Gate seeds are disjoint from train/validation/test; each hypothesis gets
        # new blocks even when its parent was selected using previous outcomes.
        gate_tasks = [
            {**task, "seed": task["seed"] + 1_000_000_000 + calls * 10000} for task in tasks
        ]
        proposal = {"heuristic": json.dumps(program)}
        if policy_hash(program) == policy_hash(json.loads(candidate["heuristic"])):
            reservation.write_text(
                json.dumps({"program": program, "status": "unchanged"}, indent=2) + "\n"
            )
            return candidate
        selected = adapter.evaluate(gate_tasks, proposal).outputs
        control = adapter.evaluate(gate_tasks, candidate).outputs
        evidence = paired_evidence(
            selected, control, alpha=0.05 / proposal_limit, method="wilson-wins"
        )
        (directory / f"proposal-{calls:04d}.json").write_text(
            json.dumps(
                {"program": program, "pairedEvidence": evidence, "tasks": gate_tasks}, indent=2
            )
            + "\n"
        )
        return proposal if evidence["accepted"] else candidate

    return propose
