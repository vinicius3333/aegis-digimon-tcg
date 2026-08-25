import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-008.js";

describe("EX11-008 Elizamon", () => {
  it("grants Raid and DP on entry while inheriting the opponent-security memory trigger", () => {
    const compiled = runtimeCompiledCard("EX11-008")!;
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions).toEqual([
        expect.objectContaining({
          kind: "GainKeyword",
          keyword: { keyword: "Raid", raw: "＜Raid＞" },
          duration: "forTheTurn",
        }),
        expect.objectContaining({
          kind: "ModifyDP",
          target: expect.objectContaining({ sameTarget: true }),
          amount: 3000,
          duration: "forTheTurn",
        }),
      ]);
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenSecurityRemoved",
            sourceFilter: { controller: "opponent" },
            actions: [{ kind: "GainMemory", amount: 1 }],
          }),
        ],
      }),
    );
  });

  it("on play gives Raid and +3000 DP to the same selected eligible Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX11-007", as: "first" },
            { card: "EX11-007", as: "chosen" },
          ],
          hand: [{ card: "EX11-008", as: "elizamon" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("chosen").permanentId);
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("elizamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("chosen").currentDP === 4000);

    expect(s.perm("chosen").currentDP).toBe(4000);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Raid")).toBe(true);
    expect(s.perm("first").currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(s.perm("first"), "Raid")).toBe(false);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("when moving gives Raid and +3000 DP to one selected Reptile ally", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          breeding: { card: "EX11-008", as: "mover" },
          battleArea: [{ card: "EX11-007", as: "ally" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 4000);

    expect(s.perm("ally").currentDP).toBe(4000);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Raid")).toBe(true);
    expect(s.perm("mover").currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(s.perm("mover"), "Raid")).toBe(false);
    assertNoLoudGap(s);
  });

  it("gains memory once when the opponent's security is removed on its owner's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX11-009", as: "host", under: ["EX11-008"] }] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);

    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    await settle();
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory from its owner's security or during the opponent's turn", async () => {
    const ownSecurity = setupEngine({
      0: {
        battleArea: [{ card: "EX11-009", as: "host", under: ["EX11-008"] }],
        security: ["BT1-001"],
      },
      1: { security: ["BT1-001"] },
    });
    ownSecurity.state.memory = 0;
    await ownSecurity.ready();

    await advance(ownSecurity.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    await settle();
    expect(ownSecurity.state.memory).toBe(0);

    ownSecurity.state.turnSeat = 1;
    await ownSecurity.engine.recomputeContinuousEffects();
    await advance(ownSecurity.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    await settle();
    expect(ownSecurity.state.memory).toBe(0);
    assertNoLoudGap(ownSecurity);
  });
});
