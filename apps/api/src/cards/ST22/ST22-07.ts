// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const option = { kind: ["Option"], nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }] };
const line = { tokens: ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"], match: "name" };
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: { filter: { zone: "hand", controller: "mine", ...option }, count: 1, from: ["hand"] },
            underFilter: { isSelfRef: true },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing 1 Option card with the [Onmyōjutsu] or [Plug-In] trait from your hand under this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: { filter: { zone: "hand", controller: "mine", ...option }, count: 1, from: ["hand"] },
            underFilter: { isSelfRef: true },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing 1 Option card with the [Onmyōjutsu] or [Plug-In] trait from your hand under this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [line] },
          actions: [
            {
              kind: "UseOptionWithoutCost",
              target: {
                filter: { zone: "underThisTamer", controller: "mine", ...option, playCostLteAttackerLevel: true },
                count: 1,
              },
              from: ["underThisTamer"],
              payCost: false,
              optional: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
            },
          ],
          frequency: "OncePerTurn",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("ST22-07", compiled);
