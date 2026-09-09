import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX11-008.js";
import "./EX11-057.js";

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
            { card: "EX11-007", as: "chosen", dp: 3_000 },
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
    await settle(() => s.perm("chosen").currentDP === 6000);

    expect(s.perm("chosen").currentDP).toBe(6000);
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
          battleArea: [{ card: "EX11-007", as: "ally", dp: 3_000 }],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("ally").permanentId);
    s.state.phase = Phase.Breeding;

    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("mover").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("ally").currentDP === 6000);

    expect(s.perm("ally").currentDP).toBe(6000);
    expect(observe(s.engine).hasKeyword(s.perm("ally"), "Raid")).toBe(true);
    expect(s.perm("mover").currentDP).toBe(1000);
    expect(observe(s.engine).hasKeyword(s.perm("mover"), "Raid")).toBe(false);
    assertNoLoudGap(s);
  });

  it("hatches a legal Digi-Egg through the public breeding flow", async () => {
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT1-001", as: "egg" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.instanceId === s.inst("egg").instanceId);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    assertNoLoudGap(s);
  });

  it("gains memory when a public attack removes the opponent's security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-009", as: "host", under: ["EX11-008"], dp: 20_000 }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: ["BT1-009", "BT1-010"], deck: ["BT1-009", "BT1-010"] },
    });
    s.state.memory = 0;
    s.state.turnCount = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("orders the inherited trigger with a public Security play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-009", as: "host", under: ["EX11-008"], dp: 20_000 }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: { security: [{ card: "EX11-057", as: "securitySuzune" }, "BT1-009"], deck: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[1]!.security.length === 1 &&
        s.state.players[1]!.battleArea.some(({ topCard }) => topCard.cardId === "EX11-057"),
    );
    expect(s.state.memory).toBe(1);
    assertNoLoudGap(s);
  });

  it("does not gain memory from its owner's security or during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX11-009", as: "host", under: ["EX11-008"] }],
        security: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-080", as: "attacker" }], security: ["BT1-009"] },
    });
    s.state.memory = 0;
    await s.ready();
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });
});
