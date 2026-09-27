import copy
import json
import unittest

import numpy as np
import torch

from features import STATUS_FIELDS, FeatureEncoder
from model import CandidatePolicy


def window() -> dict:
    players = [
        {
            "seat": seat,
            "handCount": 1,
            "deckCount": 30,
            "eggDeckCount": 4,
            "securityCount": 5,
            "hand": [],
            "trash": [],
            "delay": [],
            "faceUpSecurity": [],
            "board": [],
        }
        for seat in (0, 1)
    ]
    players[0]["hand"] = [
        {
            "instanceId": "card-17",
            "cardId": "A",
            "faceUp": False,
            "level": 3,
            "playCost": 3,
            "dp": 2000,
            "kinds": ["Digimon"],
        },
        {
            "instanceId": "card-29",
            "cardId": "B",
            "faceUp": False,
            "level": 4,
            "playCost": 5,
            "dp": 5000,
            "kinds": ["Digimon"],
        },
    ]
    return {
        "observation": {
            "seat": 0,
            "turnSeat": 0,
            "turn": 3,
            "phase": "Main",
            "memory": 3,
            "players": players,
            "revealed": [],
        },
        "kind": "main",
        "selected": [],
        "actions": [
            {
                "intent": {"type": "playCard", "instanceId": "card-17"},
                "sourceId": "card-17",
                "label": "Play or use card",
                "projectedCost": 3,
            },
            {"intent": {"type": "endPhase"}, "label": "End main phase"},
        ],
    }


class PolicyTests(unittest.TestCase):
    def test_instance_identifier_renaming_does_not_change_model_inputs(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        original = window()
        renamed = json.loads(
            json.dumps(original).replace("card-17", "opaque-391").replace("card-29", "opaque-102")
        )
        first = encoder.encode(original)
        second = encoder.encode(renamed)
        for a, b in zip(first, second, strict=True):
            np.testing.assert_array_equal(a, b)

    def test_prior_selection_order_is_visible(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        message = window()
        message["selected"] = ["card-17", "card-29"]
        first, _ = encoder.encode(message)
        message["selected"].reverse()
        second, _ = encoder.encode(message)
        self.assertFalse(np.array_equal(first, second))

    def test_public_statuses_change_board_and_candidate_features(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        message = window()
        card = message["observation"]["players"][0]["hand"][0]
        permanent = {
            "permanentId": "unit-1",
            "top": card,
            "stack": [],
            "linked": [],
            "dp": 3000,
            "suspended": False,
            "keywords": [],
            "statuses": {},
        }
        message["observation"]["players"][0]["board"] = [permanent]
        original_state, original_actions = encoder.encode(message)
        message["observation"]["revealed"] = [dict(card)]
        _, revealed_actions = encoder.encode(message)
        np.testing.assert_array_equal(revealed_actions, original_actions)
        for key in STATUS_FIELDS:
            with self.subTest(status=key):
                changed = copy.deepcopy(message)
                changed["observation"]["players"][0]["board"][0]["statuses"][key] = True
                state, actions = encoder.encode(changed)
                self.assertFalse(np.array_equal(state, original_state))
                self.assertFalse(np.array_equal(actions, original_actions))
        for key, value in (
            ("keywords", ["Blocker"]),
            ("securityAttack", 3),
            ("enteredThisTurn", True),
            ("inBreeding", True),
        ):
            with self.subTest(field=key):
                changed = copy.deepcopy(message)
                changed["observation"]["players"][0]["board"][0][key] = value
                state, actions = encoder.encode(changed)
                self.assertFalse(np.array_equal(state, original_state))
                self.assertFalse(np.array_equal(actions, original_actions))

    def test_reveal_identifies_an_existing_anonymous_candidate(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        message = window()
        message["observation"]["players"][0]["hand"][0] = {"instanceId": "card-17", "faceUp": False}
        _, anonymous = encoder.encode(message)
        message["observation"]["revealed"] = [
            {"instanceId": "card-17", "cardId": "A", "faceUp": True}
        ]
        _, revealed = encoder.encode(message)
        self.assertFalse(np.array_equal(anonymous, revealed))

    def test_keyword_mechanics_do_not_collide(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        alliance = encoder.card({"cardId": "A", "keywords": ["Alliance"]})
        barrier = encoder.card({"cardId": "A", "keywords": ["Barrier"]})
        self.assertFalse(np.array_equal(alliance, barrier))
        with self.assertRaisesRegex(ValueError, "Unmapped live keyword"):
            encoder.card({"cardId": "A", "keywords": ["Future Keyword"]})

    def test_block_target_kind_is_visible(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        message = window()
        message["kind"] = "block"
        message["combat"] = {"targetsPlayer": True, "mustBlock": False}
        player_state, _ = encoder.encode(message)
        message["combat"]["targetsPlayer"] = False
        digimon_state, _ = encoder.encode(message)
        self.assertFalse(np.array_equal(player_state, digimon_state))

    def test_padding_never_changes_valid_action_probabilities(self) -> None:
        encoder = FeatureEncoder(["A", "B"], ["Alliance", "Barrier", "Blocker"])
        state, actions = encoder.encode(window())
        model = CandidatePolicy(encoder.state_dim, encoder.action_dim)
        state_tensor = torch.from_numpy(state[None])
        action_tensor = torch.from_numpy(actions[None])
        original, _ = model(state_tensor, action_tensor, torch.ones((1, 2), dtype=torch.bool))
        padded = torch.cat([action_tensor, torch.ones((1, 9, encoder.action_dim)) * 100], dim=1)
        logits, value = model(state_tensor, padded, torch.tensor([[True, True] + [False] * 9]))
        torch.testing.assert_close(original.softmax(-1), logits.softmax(-1)[:, :2])
        self.assertTrue(torch.equal(logits.softmax(-1)[:, 2:], torch.zeros((1, 9))))
        loss = -logits.log_softmax(-1)[0, 0] + value.square().mean()
        loss.backward()
        self.assertTrue(
            all(
                parameter.grad is None or torch.isfinite(parameter.grad).all()
                for parameter in model.parameters()
            )
        )


if __name__ == "__main__":
    unittest.main()
