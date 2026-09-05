import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX11-007.js";

describe("EX11-007 Agumon", () => {
  it("binds one eligible Digimon for both turn-long keyword grants on play or moving", () => {
    const compiled = runtimeCompiledCard("EX11-007")!;
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Koromon"], cost: 0, isAlternate: true }]);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions).toEqual([
        expect.objectContaining({
          kind: "GainKeyword",
          target: expect.objectContaining({
            count: 1,
            filter: expect.objectContaining({
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Tyrannomon"], match: "name" },
                { tokens: ["Reptile", "Dinosaur"], match: "trait" },
              ],
            }),
          }),
          keyword: { keyword: "Raid", raw: "＜Raid＞" },
          keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
          duration: "forTheTurn",
        }),
      ]);
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        isInherited: true,
        actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000, duration: "permanent" })],
      }),
    );
  });

  it("on play gives Raid and Piercing to the same selected eligible Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-008", as: "first" },
            { card: "EX11-008", as: "chosen" },
          ],
          hand: [{ card: "EX11-007", as: "agumon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("chosen").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("chosen")));

    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("chosen"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("first"), "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("first"))).toBe(false);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("when moving grants both keywords to one selected Reptile ally", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX11-007", as: "mover" },
          battleArea: [{ card: "EX11-008", as: "ally" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("ally")));

    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("ally"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("mover"), "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("mover"))).toBe(false);
    assertNoLoudGap(s);
  });

  it("selects across a mixed pool: the name branch matches a Cyborg MetalTyrannomon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-024", as: "nameOnly" },
            { card: "EX11-008", as: "reptile" },
            { card: "BT1-009", as: "nonMatching" },
          ],
          hand: [{ card: "EX11-007", as: "agumon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    // BT1-024 MetalTyrannomon carries [Tyrannomon] in its NAME but only the [Cyborg] trait, so
    // it is eligible through the name branch alone; BT1-009 Monodramon ([Mini Dragon]) matches
    // neither branch.
    preferInstanceIds.push(s.perm("nameOnly").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("nameOnly")));

    expect(observe(s.engine).hasKeyword(s.perm("nameOnly"), "Raid")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("nameOnly"))).toBe(true);
    // "1 of your Digimon" is a single selection: the other eligible Reptile gets nothing.
    expect(observe(s.engine).hasKeyword(s.perm("reptile"), "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("reptile"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonMatching"), "Raid")).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("nonMatching"))).toBe(false);
    assertNoLoudGap(s);
  });

  it("cannot grant the keywords to an opponent or an ineligible own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "ineligible" }],
          hand: [{ card: "EX11-007", as: "agumon" }],
        },
        1: { battleArea: [{ card: "EX11-008", as: "opponentReptile" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("agumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasPierce(s.perm("agumon")));

    expect(observe(s.engine).hasKeyword(s.perm("agumon"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("ineligible"), "Raid")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentReptile"), "Raid")).toBe(false);
    assertNoLoudGap(s);
  });

  it("adds 1000 DP only while Agumon is an inherited source in a realistic stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-009", as: "host", under: ["EX11-007"] },
          { card: "EX11-007", as: "standalone" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").baseDP).toBe(6000);
    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("standalone").currentDP).toBe(1000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("digivolves from Koromon for the alternate cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-001", as: "koromon" }],
        hand: [{ card: "EX11-007", as: "agumon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("koromon").permanentId,
        instanceId: s.inst("agumon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("koromon").topCard.instanceId === s.inst("agumon").instanceId);

    expect(s.perm("koromon").topCard.instanceId).toBe(s.inst("agumon").instanceId);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
