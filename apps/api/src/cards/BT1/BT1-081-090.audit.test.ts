import { describe, expect, it } from "vitest";
import { compiled as herculesKabuterimon } from "./BT1-081.js";
import { compiled as rosemon } from "./BT1-082.js";
import { compiled as granKuwagamon } from "./BT1-083.js";
import { compiled as omnimon } from "./BT1-084.js";
import { compiled as taiKamiya } from "./BT1-085.js";
import { compiled as mattIshida } from "./BT1-086.js";
import { compiled as tkTakaishi } from "./BT1-087.js";
import { compiled as izzyIzumi } from "./BT1-088.js";
import { compiled as mimiTachikawa } from "./BT1-089.js";
import { compiled as gravityCrush } from "./BT1-090.js";

describe("BT1-081 through BT1-090 IR coverage", () => {
  it("registers every range module with complete IR", () => {
    for (const card of [
      herculesKabuterimon,
      rosemon,
      granKuwagamon,
      omnimon,
      taiKamiya,
      mattIshida,
      tkTakaishi,
      izzyIzumi,
      mimiTachikawa,
      gravityCrush,
    ]) {
      expect(card).toMatchObject({ coverage: "full", residual: [] });
    }
  });

  it("retains each printed trigger, scope, target, and duration clause", () => {
    expect(herculesKabuterimon.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Piercing" }],
    });
    expect(herculesKabuterimon.effects[1]).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "TwicePerTurn",
      optional: true,
      actions: [{ kind: "Unsuspend", cost: { kind: "payMemory", memory: 3 } }],
    });
    expect(rosemon.effects[0]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              condition: { kind: "allOf" },
            },
          ],
        },
      ],
    });
    expect(granKuwagamon.effects[0]).toMatchObject({
      trigger: "Static",
      keywords: [{ keyword: "Piercing" }],
    });
    expect(granKuwagamon.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 4000, duration: "forTheTurn" }],
    });
    expect(omnimon.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "SelectBind", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], sameNameAsSelection: "bt1-084-name" },
            count: "all",
          },
        },
      ],
    });
    expect(omnimon.effects[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          from: ["digivolutionCards"],
          to: "hand",
          optional: true,
          target: {
            filter: { zone: "digivolutionCards", controller: "mine", kind: ["Digimon"], levels: [6] },
            count: 1,
          },
        },
        { kind: "Unsuspend", condition: { kind: "ifThisEffectActed" } },
      ],
    });
    expect(taiKamiya.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(taiKamiya.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Red"], digivolutionCardsAtLeast: 4 },
            count: "all",
          },
          effect: { kind: "keyword", keyword: { keyword: "SecurityAttack", amount: 1 } },
        },
      ],
    });
    expect(mattIshida.effects[1]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] },
          actions: [
            {
              kind: "TrashDigivolution",
              amount: 1,
              fromTop: false,
              cost: { kind: "suspend" },
              optional: true,
            },
          ],
        },
      ],
    });
    expect(tkTakaishi.effects[1]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          source: "securityTop",
          chooseFromSecurity: true,
          selectionFilter: { controller: "mine" },
          amount: 1,
        },
        { kind: "Recover", amount: 1, condition: { kind: "bindingContains", ref: "bt1-087-selected" } },
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
      ],
    });
    expect(izzyIzumi.effects[0]).toMatchObject({
      trigger: "Main",
      condition: { kind: "youHaveGreenLevelAtLeastInBattle", value: 5 },
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [{ filter: { kind: ["Digimon"] }, count: 1, to: "hand" }],
          rest: "deckBottom",
          cost: { kind: "suspend" },
        },
      ],
    });
    expect(mimiTachikawa.effects[0]).toMatchObject({
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    });
    expect(mimiTachikawa.effects[1]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          condition: { kind: "allOf" },
          cost: { kind: "suspend" },
          options: [
            [{ kind: "Hatch" }],
            [{ kind: "MovePermanent", direction: "toBattle" }],
          ],
          optional: true,
        },
      ],
    });
    expect(gravityCrush.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        { kind: "GainMemory", amount: 2 },
        { kind: "GainMemory", amount: -2, at: "endOfTurn" },
      ],
    });
  });
});
