"""Versioned numeric inputs. Engine instance IDs are lookup keys, never learned features."""

import hashlib
import re
from typing import Any

import numpy as np
from numpy.typing import NDArray

FEATURE_VERSION = 2
TEXT_DIM = 32
KINDS = (
    "main",
    "breeding",
    "block",
    "counter",
    "alliance",
    "respondEvade",
    "respondBarrier",
    "mulligan",
    "optional",
    "chooseTargets",
    "selectCards",
    "orderCards",
    "orderTriggers",
    "chooseOption",
)
ACTION_TYPES = (
    "endPhase",
    "hatchEgg",
    "moveFromBreeding",
    "playCard",
    "digivolve",
    "attack",
    "activateEffect",
    "declareBlock",
    "declineBlock",
    "respondCounter",
    "respondAlliance",
    "respondEvade",
    "respondBarrier",
    "mulligan",
    "respondDecision",
)
PHASES = ("None", "Unsuspend", "Draw", "Breeding", "Main", "End")


def text_features(text: str) -> NDArray[np.float32]:
    features = np.zeros(TEXT_DIM, dtype=np.float32)
    for word in re.findall(r"[a-z]+", text.lower()):
        index = int.from_bytes(hashlib.blake2b(word.encode(), digest_size=4).digest(), "little")
        features[index % TEXT_DIM] += 1
    norm = np.linalg.norm(features)
    return features / max(float(norm), 1.0)


class FeatureEncoder:
    def __init__(self, card_ids: list[str]) -> None:
        self.card_ids = tuple(card_ids)
        self.index = {card_id: index + 1 for index, card_id in enumerate(card_ids)}
        self.card_dim = len(card_ids) + 1
        self.card_features = self.card_dim + 10
        self.state_dim = 13 + len(PHASES) + len(KINDS) + self.card_dim * 15 + 6 + TEXT_DIM
        self.action_dim = (
            len(ACTION_TYPES) + 8 + self.card_features * 2 + self.card_dim * 2 + TEXT_DIM
        )

    def card(self, card: dict[str, Any] | None) -> NDArray[np.float32]:
        result = np.zeros(self.card_features, dtype=np.float32)
        if card is None:
            return result
        result[self.index.get(card.get("cardId", ""), 0)] = 1
        kinds = card.get("kinds", [])
        result[self.card_dim :] = [
            (card.get("level") or 0) / 7,
            max(card.get("playCost", 0), 0) / 20,
            card.get("dp", 0) / 20000,
            bool(card.get("faceUp")),
            "Digimon" in kinds,
            "Tamer" in kinds,
            "Option" in kinds,
            "DigiEgg" in kinds,
            card.get("relativeSeat", 0),
            bool(card.get("suspended")),
        ]
        return result

    def bag(self, cards: list[dict[str, Any]]) -> NDArray[np.float32]:
        result = np.zeros(self.card_dim, dtype=np.float32)
        for card in cards:
            result[self.index.get(card.get("cardId", ""), 0)] += 0.25
        return result

    def encode(self, window: dict[str, Any]) -> tuple[NDArray[np.float32], NDArray[np.float32]]:
        observation = window["observation"]
        seat = observation["seat"]
        players = sorted(observation["players"], key=lambda player: player["seat"] != seat)
        if len(players) != 2:
            raise ValueError("Expected two seated players")
        known: dict[str, dict[str, Any]] = {}
        stacks: dict[str, list[dict[str, Any]]] = {}
        bags = []
        scalars = [
            observation["memory"] / 10 * (1 if observation["turnSeat"] == seat else -1),
            observation["turn"] / 60,
            float(observation["turnSeat"] == seat),
        ]
        for relative, player in enumerate(players):
            scalars.extend(
                [
                    player["handCount"] / 20,
                    player["deckCount"] / 50,
                    player["eggDeckCount"] / 5,
                    player["securityCount"] / 10,
                    len(player["board"]) / 10,
                ]
            )
            permanents = player["board"] + ([player["breeding"]] if "breeding" in player else [])
            zones = [
                player["hand"],
                player["trash"],
                player["delay"],
                player["faceUpSecurity"],
                [permanent["top"] for permanent in permanents],
                [
                    card
                    for permanent in permanents
                    for card in permanent["stack"] + permanent["linked"]
                ],
            ]
            bags.extend(self.bag(zone) for zone in zones)
            for zone in zones:
                for card in zone:
                    known[card["instanceId"]] = {**card, "relativeSeat": 1 if relative == 0 else -1}
            for permanent in permanents:
                known[permanent["permanentId"]] = {
                    **permanent["top"],
                    "dp": permanent["dp"],
                    "suspended": permanent["suspended"],
                    "relativeSeat": 1 if relative == 0 else -1,
                }
                stacks[permanent["permanentId"]] = permanent["stack"] + permanent["linked"]
                known[permanent["top"]["instanceId"]] = known[permanent["permanentId"]]
                stacks[permanent["top"]["instanceId"]] = stacks[permanent["permanentId"]]
        for card in observation["revealed"]:
            known[card["instanceId"]] = card
        request = window.get("request", {})
        options = request.get("options") or {}
        selected_order = np.zeros(self.card_dim, dtype=np.float32)
        for position, reference in enumerate(window["selected"]):
            card_id = known.get(reference, {}).get("cardId", "")
            selected_order[self.index.get(card_id, 0)] += 1 / (position + 1)
        state = np.concatenate(
            [
                np.array(scalars, dtype=np.float32),
                np.array([observation["phase"] == phase for phase in PHASES], dtype=np.float32),
                np.array([window["kind"] == kind for kind in KINDS], dtype=np.float32),
                *bags,
                selected_order,
                self.bag(observation["revealed"]),
                self.bag(
                    [{"cardId": request["sourceCardId"]}] if "sourceCardId" in request else []
                ),
                np.array(
                    [
                        len(window["selected"]) / 10,
                        options.get("min", 0) / 10,
                        options.get("max", 0) / 10,
                        options.get("maxTotalPlayCost", 0) / 20,
                        options.get("maxTotalDP", 0) / 20000,
                        options.get("purpose") == "cost",
                    ],
                    dtype=np.float32,
                ),
                text_features(
                    " ".join(
                        [
                            request.get("promptText", ""),
                            options.get("effectText", ""),
                            request.get("sourceCardId", ""),
                        ]
                    )
                ),
            ]
        )
        encoded_actions = []
        for action in window["actions"]:
            intent = action["intent"]
            response = intent.get("response", {})
            source = action.get("sourceId", "")
            target = action.get("targetId", "")
            encoded_actions.append(
                np.concatenate(
                    [
                        np.array(
                            [intent["type"] == kind for kind in ACTION_TYPES], dtype=np.float32
                        ),
                        np.array(
                            [
                                action.get("projectedCost", 0) / 20,
                                (intent.get("alternateRequirementIndex", -1) + 1) / 10,
                                intent.get("target", {}).get("kind") == "player",
                                response.get("optionIndex", 0) / 10,
                                intent.get("accept", response.get("accept", False)),
                                intent.get("keep", False),
                                action["label"] == "Finish selection",
                                source in window["selected"],
                            ],
                            dtype=np.float32,
                        ),
                        self.card(known.get(source)),
                        self.card(known.get(target)),
                        self.bag(stacks.get(source, [])),
                        self.bag(stacks.get(target, [])),
                        text_features(action["label"]),
                    ]
                )
            )
        actions = np.stack(encoded_actions).astype(np.float32)
        if state.shape != (self.state_dim,) or actions.shape[1] != self.action_dim:
            raise ValueError("Feature schema dimension mismatch")
        if not np.isfinite(state).all() or not np.isfinite(actions).all():
            raise ValueError("Nonfinite policy inputs")
        return state.astype(np.float32), actions
