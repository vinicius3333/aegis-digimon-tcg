import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "revealTop",
          controller: "opponent",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "triggerRevealedMatchesFilter",
            filter: { kind: ["Digimon"] },
            raw: "that card is a Digimon card",
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: { kind: "triggerRevealedMatchesFilter", filter: { kind: ["Digimon"] } },
            raw: "it's a non-Digimon card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: "revealed",
          faceDown: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "revealTop",
          controller: "opponent",
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "triggerRevealedMatchesFilter",
            filter: { kind: ["Digimon"] },
            raw: "that card is a Digimon card",
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: { kind: "triggerRevealedMatchesFilter", filter: { kind: ["Digimon"] } },
            raw: "it's a non-Digimon card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTopOrBottom",
          controller: "opponent",
          source: "revealed",
          faceDown: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
          while: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "mine", zone: "battleArea", filter: { kind: ["Tamer"] }, op: "gte", value: 1 },
              {
                kind: "zoneCount",
                seat: "opponent",
                zone: "battleArea",
                filter: { kind: ["Tamer"] },
                op: "gte",
                value: 1,
              },
            ],
            raw: "there's a Tamer",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beDeleted",
          byOpponentEffectsOnly: true,
          duration: "permanent",
          while: {
            kind: "anyOf",
            conditions: [
              { kind: "zoneCount", seat: "mine", zone: "battleArea", filter: { kind: ["Tamer"] }, op: "gte", value: 1 },
              {
                kind: "zoneCount",
                seat: "opponent",
                zone: "battleArea",
                filter: { kind: ["Tamer"] },
                op: "gte",
                value: 1,
              },
            ],
            raw: "there's a Tamer",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-027", compiled);
