import { describe, expect, it } from "vitest";
import { compiled as boutmon } from "./BT17-036.js";
import { compiled as rizeGreymon } from "./BT17-037.js";
import { compiled as sakuyamon } from "./BT17-038.js";
import { compiled as shineGreymon } from "./BT17-039.js";

describe("BT17-036 through BT17-039", () => {
  it("models Boutmon's opponent-effect leave prevention and security-triggered digivolution", () => {
    expect(boutmon.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "byOpponentEffect",
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
    expect(boutmon.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          actions: [{ kind: "Digivolve", payCost: false, from: ["hand"], optional: true }],
        },
      ],
    });
    expect(boutmon.effects?.[2]).toMatchObject({
      trigger: "EndOfAttack",
      isInherited: true,
      actions: [{ kind: "Unsuspend", cost: { kind: "trashSecurityTop" }, optional: true }],
    });
  });

  it("models RizeGreymon's suspended-Tamer bonuses and Marcus Damon recovery", () => {
    expect(rizeGreymon.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 3000 } },
        { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } },
      ],
    });
    expect(rizeGreymon.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "ModifyDP", amount: -3000, cost: { kind: "suspend" }, optional: true }],
    });
    expect(rizeGreymon.effects?.[2]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "ModifyDP", amount: -3000, cost: { kind: "suspend" }, optional: true }],
    });
    expect(rizeGreymon.effects?.[3]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }],
        },
      ],
    });
  });

  it("models Sakuyamon's Barrier, option use, and return restriction", () => {
    expect(sakuyamon.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
    expect(sakuyamon.effects?.[1]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "ModifyDP", amount: -6000 },
        { kind: "UseOptionWithoutCost", optional: true },
      ],
    });
    expect(sakuyamon.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          actions: [
            {
              kind: "Restrict",
              restriction: "beReturned",
              duration: "untilOpponentTurnEnd",
              byOpponentEffectsOnly: true,
            },
          ],
        },
      ],
    });
  });

  it("models ShineGreymon's Marcus Damon play and leave prevention", () => {
    expect(shineGreymon.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [{ kind: "PlayWithoutCost", payCost: false, from: ["hand"], optional: true }],
    });
    expect(shineGreymon.effects?.[1]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          actions: [{ kind: "Prevent", cost: { kind: "return" }, optional: true }],
        },
      ],
    });
  });
});
