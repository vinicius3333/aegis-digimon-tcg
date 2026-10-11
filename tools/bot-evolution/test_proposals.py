"""Proposal gates keep numeric calibration and never reuse seeds after a resume."""

import json
from types import SimpleNamespace

from proposals import guarded_proposer


def test_structural_proposals_gate_on_fresh_seeds_and_resume_monotonically(tmp_path, monkeypatch):
    program = {
        "schemaVersion": 1,
        "title": "Pilot",
        "rules": [{"feature": "cost", "weight": -1, "advice": "Spend carefully."}],
    }
    raw = {**program, "rules": [{**program["rules"][0], "weight": -999, "when": {"kind": "main"}}]}
    prompts = []

    def reflect(**kwargs):
        prompts.append(kwargs)
        return {"new_instruction": json.dumps(raw)}

    monkeypatch.setattr("proposals.InstructionProposalSignature.run", reflect)

    class Adapter:
        def __init__(self):
            self.calls = []

        def evaluate(self, tasks, candidate):
            self.calls.append(tasks)
            conditional = "when" in json.loads(candidate["heuristic"])["rules"][0]
            return SimpleNamespace(
                outputs=[{"task": task, "score": int(conditional), "valid": True} for task in tasks]
            )

    adapter = Adapter()
    tasks = [{"seed": index // 2, "learnerSeat": index % 2} for index in range(96)]
    candidate = {"heuristic": json.dumps(program)}
    propose = guarded_proposer(adapter, None, program, tasks, tmp_path, 2)
    chosen = propose(candidate, {"heuristic": []}, ["heuristic"])
    assert json.loads(chosen["heuristic"])["rules"][0]["weight"] == -1
    assert adapter.calls[0] == adapter.calls[1]
    assert not {task["seed"] for task in tasks} & {task["seed"] for task in adapter.calls[0]}
    resumed = guarded_proposer(adapter, None, program, tasks, tmp_path, 2)
    resumed(candidate, {"heuristic": []}, ["heuristic"])
    assert not {task["seed"] for task in adapter.calls[0]} & {
        task["seed"] for task in adapter.calls[2]
    }
    resumed(candidate, {"heuristic": []}, ["heuristic"])
    assert len(prompts) == 2
