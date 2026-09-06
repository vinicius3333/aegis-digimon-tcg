import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-043.js";
import "./index.js";

describe("BT20-043 Varodurumon", () => {
  it("suspends all opposing Digimon, grants +3000 DP, and offers an attack on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "Suspend", target: { count: "all" } },
          { kind: "ModifyDP", amount: 3000, duration: "forTheTurn" },
          { kind: "Attack", optional: true },
        ],
      });
    }
  });

  it("DNA digivolves this Digimon with another own Digimon, then offers the attack", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "EndOfYourTurn")).toMatchObject({
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2, includeRef: "self" },
        },
        { kind: "Attack", optional: true, condition: { kind: "bindingExists", ref: "dnaDigivolvedByThisEffect" } },
      ],
    });
  });

  it("gates the ACCEL play reduction and inherited DP reduction", () => {
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          actions: [{ kind: "Replacement", mode: "reduceCost", amount: 5, condition: { kind: "youHave" } }],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" }],
    });
  });

  it("pays 7 with an ACCEL resident, suspends all opponents, and gives +3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT20-041", dp: 6000, as: "accel" }],
          hand: [{ card: "BT20-043", as: "varodurumon" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "first" },
            { card: "BT20-011", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("varodurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").isSuspended && s.perm("second").isSuspended);
    expect(s.perm("accel").currentDP).toBe(9000);
    expect(s.state.memory).toBe(5);
  });

  it("suspends every opposing Digimon, buffs exactly one ally, and leaves the second ally unchanged", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-041", dp: 6000, as: "accel" },
            { card: "BT20-010", dp: 1000, as: "firstAlly" },
            { card: "BT20-011", dp: 2000, as: "secondAlly" },
          ],
          hand: [{ card: "BT20-043", as: "varodurumon" }],
        },
        1: {
          battleArea: [
            { card: "BT20-010", as: "opponentOne" },
            { card: "BT20-011", as: "opponentTwo" },
          ],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("firstAlly").permanentId, s.perm("firstAlly").topCard.instanceId);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("varodurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("opponentOne").isSuspended && s.perm("opponentTwo").isSuspended);
    expect(s.perm("firstAlly").currentDP).toBe(4000);
    expect(s.perm("secondAlly").currentDP).toBe(2000);
    expect(s.state.memory).toBe(5);
  });

  it("reaches Varodurumon through a public ACCEL level-5 evolution with the exact alternate cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT20-041", as: "accelBase" }], hand: [{ card: "BT20-043", as: "varodurumon" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("accelBase").permanentId,
        instanceId: s.inst("varodurumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("accelBase").topCard.cardId === "BT20-043");
    expect(s.perm("accelBase").stack.map((card) => card.cardId)).toEqual(["BT20-041"]);
    expect(s.state.memory).toBe(2);
  });

  it("DNA digivolves itself with another own Digimon, attacks, and applies inherited -4000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT20-043", as: "varodurumon" },
            { card: "BT20-036", as: "bancho" },
          ],
          hand: [{ card: "BT16-036", as: "chaosmon" }],
        },
        1: { battleArea: [{ card: "BT20-010", dp: 6000, suspended: true, as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await advance(s.engine).fire(EffectTiming.OnEndTurn, s.perm("varodurumon"));
    await settle(
      () =>
        s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT16-036") &&
        s.state.players[1]!.battleArea.length === 0,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });
});
