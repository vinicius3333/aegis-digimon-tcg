import copy
import unittest

import numpy as np
import torch

from features import FEATURE_VERSION, STATUS_FIELDS, FeatureEncoder
from migrate import column_map, migrate_checkpoint
from model import CandidatePolicy
from test_policy import window


def metadata(cards: list[str]) -> dict:
    return {
        "schemaVersion": 4,
        "cardIds": cards,
        "keywords": ["Blocker"],
        "statusFields": list(STATUS_FIELDS),
        "engineSha256": "source",
        "decks": [{"version": "pinned@1", "sha256": "recipe"}],
    }


def checkpoint() -> dict:
    encoder = FeatureEncoder(["A", "C"], ["Blocker"])
    torch.manual_seed(71)
    model = CandidatePolicy(encoder.state_dim, encoder.action_dim, width=8)
    optimizer = torch.optim.Adam(model.parameters(), amsgrad=True)
    state, actions = encoder.encode(window())
    logits, value = model(
        torch.from_numpy(state[None]),
        torch.from_numpy(actions[None]),
        torch.ones((1, len(actions)), dtype=torch.bool),
    )
    (logits.sum() + value.sum()).backward()
    optimizer.step()
    return {
        "metadata": metadata(["A", "C"]),
        "featureVersion": FEATURE_VERSION,
        "model": model.state_dict(),
        "optimizer": optimizer.state_dict(),
        "games": 52,
        "seed": 917,
    }


class MigrationTests(unittest.TestCase):
    def test_rejects_scalar_or_nontensor_moments_and_nonscalar_step(self) -> None:
        for field, value in (
            ("exp_avg", torch.tensor(0.0)),
            ("exp_avg_sq", 0.0),
            ("max_exp_avg_sq", torch.tensor(0.0)),
            ("step", "parameter-shaped"),
            ("step", torch.tensor(torch.nan)),
        ):
            saved = checkpoint()
            if isinstance(value, str):
                value = torch.zeros_like(saved["model"]["state.0.weight"])
            saved["optimizer"]["state"][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                migrate_checkpoint(saved, metadata(["A", "B", "C"]))

    def test_preserves_logits_values_and_greedy_choices_with_previously_unknown_cards(self) -> None:
        saved = checkpoint()
        target = {**metadata(["A", "B", "C", "D"]), "engineSha256": "target"}
        migrated = migrate_checkpoint(saved, target)
        original_encoder = FeatureEncoder(["A", "C"], ["Blocker"])
        target_encoder = FeatureEncoder(target["cardIds"], target["keywords"])
        old_model = CandidatePolicy(
            original_encoder.state_dim, original_encoder.action_dim, width=8
        )
        new_model = CandidatePolicy(target_encoder.state_dim, target_encoder.action_dim, width=8)
        old_model.load_state_dict(saved["model"])
        new_model.load_state_dict(migrated["model"])
        sample = window()
        # Exercise every card bag, history role, board summary and action/material block.
        observation = sample["observation"]
        observation["history"] = {
            "seenCardIds": ["A", "B", "D"],
            "recent": [{"kind": "played", "cardIds": ["B", "C"], "seat": 1, "amount": 2}],
            "knownCards": [
                {"cardId": "A", "ownerSeat": 0},
                {"cardId": "B", "ownerSeat": 1},
                {"cardId": "D"},
            ],
        }
        for player in observation["players"]:
            top = {
                **observation["players"][0]["hand"][0],
                "instanceId": f"top-{player['seat']}",
                "cardId": "D",
            }
            board = {
                "permanentId": f"host-{player['seat']}",
                "top": top,
                "stack": [{"instanceId": f"stack-{player['seat']}", "cardId": "B"}],
                "linked": [{"instanceId": f"link-{player['seat']}", "cardId": "C"}],
                "dp": 6000,
                "suspended": True,
                "keywords": ["Blocker"],
                "statuses": {"cannotDigivolve": True},
            }
            player["board"] = [board]
            for zone in ("trash", "delay", "faceUpSecurity"):
                player[zone] = [{"cardId": "B", "instanceId": f"{zone}-{player['seat']}"}]
        observation["revealed"] = [{"cardId": "D", "instanceId": "revealed"}]
        sample["combat"] = {"targetPermanentId": "host-1"}
        sample["selected"] = ["host-0", "card-29"]
        sample["request"] = {
            "sourceCardId": "B",
            "promptText": "Recover a card",
            "options": {"min": 1},
        }
        sample["actions"][0].update(
            targetId="host-1", materialIds=["host-0", "card-29", "revealed"]
        )
        for message in (window(), sample):
            with self.subTest(compound=message is sample):
                original_state, original_actions = original_encoder.encode(message)
                expanded_state, expanded_actions = target_encoder.encode(message)
                mask = torch.ones((1, len(original_actions)), dtype=torch.bool)
                with torch.no_grad():
                    old_logits, old_value = old_model(
                        torch.from_numpy(original_state[None]),
                        torch.from_numpy(original_actions[None]),
                        mask,
                    )
                    new_logits, new_value = new_model(
                        torch.from_numpy(expanded_state[None]),
                        torch.from_numpy(expanded_actions[None]),
                        mask,
                    )
                torch.testing.assert_close(old_logits, new_logits)
                torch.testing.assert_close(old_value, new_value)
                self.assertEqual(old_logits.argmax().item(), new_logits.argmax().item())
                # Expanding IDs only splits the old unknown bag; numerical inputs remain exact.
                for old_columns, new_columns, original, expanded in (
                    (
                        original_encoder.state_columns,
                        target_encoder.state_columns,
                        original_state,
                        expanded_state,
                    ),
                    (
                        original_encoder.action_columns,
                        target_encoder.action_columns,
                        original_actions,
                        expanded_actions,
                    ),
                ):
                    mapping = column_map(old_columns, new_columns)
                    folded = np.zeros_like(original)
                    for index, source in enumerate(mapping.sources):
                        folded[..., source] += expanded[..., index]
                    np.testing.assert_allclose(folded, original, atol=1e-7)

    def test_preserves_existing_parameters_adam_moments_and_updates_after_expansion(self) -> None:
        saved = checkpoint()
        original = copy.deepcopy(saved)
        target = {**metadata(["A", "B", "C"]), "engineSha256": "target"}
        expanded = migrate_checkpoint(saved, target)
        old = FeatureEncoder(["A", "C"], ["Blocker"])
        new = FeatureEncoder(["A", "B", "C"], ["Blocker"])
        maps = {
            "state.0.weight": column_map(old.state_columns, new.state_columns),
            "action.0.weight": column_map(old.action_columns, new.action_columns),
        }
        for index, name in enumerate(saved["model"]):
            torch.testing.assert_close(
                saved["model"][name], original["model"][name], rtol=0, atol=0
            )
            if name not in maps:
                torch.testing.assert_close(
                    expanded["model"][name], saved["model"][name], rtol=0, atol=0
                )
            for field, value in saved["optimizer"]["state"][index].items():
                actual = expanded["optimizer"]["state"][index][field]
                if name in maps and value.ndim > 0:
                    mapping = maps[name]
                    retained = [i for i, added in enumerate(mapping.added) if not added]
                    torch.testing.assert_close(
                        actual[:, retained],
                        value[:, [mapping.sources[i] for i in retained]],
                        rtol=0,
                        atol=0,
                    )
                    self.assertEqual(torch.count_nonzero(actual[:, list(mapping.added)]).item(), 0)
                else:
                    torch.testing.assert_close(actual, value, rtol=0, atol=0)
                torch.testing.assert_close(
                    value, original["optimizer"]["state"][index][field], rtol=0, atol=0
                )
        self.assertEqual(expanded["optimizer"]["param_groups"], saved["optimizer"]["param_groups"])
        self.assertEqual(expanded["games"], 52)
        self.assertEqual(expanded["vocabularyMigration"]["learningUpdates"], 0)
        model = CandidatePolicy(new.state_dim, new.action_dim, width=8)
        model.load_state_dict(expanded["model"])
        optimizer = torch.optim.Adam(model.parameters())
        optimizer.load_state_dict(expanded["optimizer"])
        state, actions = new.encode(window())
        logits, value = model(
            torch.from_numpy(state[None]),
            torch.from_numpy(actions[None]),
            torch.ones((1, len(actions)), dtype=torch.bool),
        )
        (logits.sum() + value.sum()).backward()
        optimizer.step()
        self.assertTrue(all(torch.isfinite(parameter).all() for parameter in model.parameters()))

    def test_rejects_removed_cards_schema_changes_and_malformed_states(self) -> None:
        for change in (
            {"cardIds": ["A", "B"]},
            {"cardIds": ["A", "C"]},
            {"keywords": []},
            {"decks": []},
            {"schemaVersion": 5},
            {"statusFields": []},
        ):
            with self.subTest(change=change), self.assertRaises(ValueError):
                migrate_checkpoint(checkpoint(), {**metadata(["A", "B", "C"]), **change})
        for mutation in ("featureVersion", "model", "optimizer"):
            saved = checkpoint()
            if mutation == "featureVersion":
                saved[mutation] = 6
            elif mutation == "model":
                saved[mutation]["state.0.weight"][0, 0] = torch.nan
            else:
                saved[mutation]["state"][0]["exp_avg"] = torch.zeros((1, 1))
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                migrate_checkpoint(saved, metadata(["A", "B", "C"]))


if __name__ == "__main__":
    unittest.main()
