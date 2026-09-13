import { advance } from "../../engine/testkit/advance.js";
import "./BT13-097.js";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-030.js";

describe("BT13-030 UlforceVeedramon", () => {
  it("trashes two cards per Royal Knight or blue Tamer and returns only empty-stack Digimon", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "TrashDigivolution",
        amount: 2,
        fromTop: true,
        scaling: { per: 1, unit: "cards" },
      });
    }
    expect(compiled.effects[2]).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      sharedUseKey: "bt13-030-return",
      actions: [
        expect.objectContaining({
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: expect.not.objectContaining({ excludeSelf: true }),
          actions: [expect.objectContaining({ kind: "Return", to: "hand" })],
        }),
      ],
    });
  });

  it("trashes two opponent evolution cards, then returns the emptied Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-040", as: "magnamon" }], hand: [{ card: "BT13-030", as: "ulforce" }] },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009", "BT1-010"] }], security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ulforce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId), 3000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("target").instanceId)).toBe(true);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-009", "BT1-010"]),
    );
  });

  it("trashes the scaled total from only one opponent Digimon when digivolving (Q2281)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-029", as: "base" },
            { card: "BT13-040", as: "magnamon" },
          ],
          hand: [{ card: "BT13-030", as: "ulforce" }],
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "first", under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] },
            { card: "BT1-015", as: "second", under: ["BT1-013", "BT1-014", "BT1-016", "BT1-017"] },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("first").stack.length === 0 || s.perm("second").stack.length === 0);

    expect([s.perm("first").stack.length, s.perm("second").stack.length].sort()).toEqual([0, 4]);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(4);
    expect(s.state.memory).toBe(2);
  });

  it("counts a blue Tamer alongside Royal Knights for the two-per-card scaling", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT13-029", as: "base" },
            { card: "BT13-040", as: "magnamon" },
            { card: "BT9-086", as: "kiyoshiro" },
          ],
          hand: [{ card: "BT13-030", as: "ulforce" }],
        },
        1: {
          battleArea: [
            {
              card: "BT1-015",
              as: "target",
              under: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014", "BT1-016"],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("ulforce").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);

    expect(s.perm("target").stack.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[1]!.trash).toHaveLength(6);
  });

  it("returns an empty-stack Digimon for a blue Tamer once per turn and resets next own turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-030", as: "ulforce" }],
          hand: [
            { card: "BT13-097", as: "firstTamer" },
            { card: "BT13-097", as: "secondTamer" },
            { card: "BT13-097", as: "nextTamer" },
            "BT1-010",
          ],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
        1: {
          battleArea: [
            { card: "BT1-015", as: "firstTarget" },
            { card: "BT1-015", as: "nextTarget" },
          ],
          hand: ["BT1-010"],
          deck: Array.from({ length: 8 }, () => "BT1-010"),
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    const sourceId = s.perm("ulforce").permanentId;
    const firstTargetId = s.inst("firstTarget").instanceId;
    const nextTargetId = s.inst("nextTarget").instanceId;
    preferred.push(s.perm("firstTarget").permanentId);
    s.state.memory = 10;
    await s.ready();
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("firstTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === firstTargetId));
    expect(s.state.memory).toBe(6);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("secondTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.state.memory).toBe(2);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.instanceId === nextTargetId)).toBe(
      true,
    );
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nextTamer").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === nextTargetId));
    expect(s.state.memory).toBe(-1);
    expect(s.perm("ulforce").permanentId).toBe(sourceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("offers its self-play On Play and Your Turn effects for player ordering (Q2282/Q2283)", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-030", as: "ulforce" }] },
        1: { battleArea: [{ card: "BT1-015", as: "target", under: ["BT1-009", "BT1-010"] }] },
      },
      { autoOrderTriggers: false },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ulforce").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    expect(s.state.pendingDecision?.kind).toBe("orderTriggers");
    const ordering = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision?.decisionId)?.req;
    expect(ordering?.options?.triggerKeys).toHaveLength(2);
    expect(ordering?.options?.triggerCardIds).toEqual(["BT13-030", "BT13-030"]);
  });

  it("does not return an opponent Digimon that still has a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-030", as: "ulforce" }],
          hand: [{ card: "BT9-086", as: "kiyoshiro" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "sourced", under: ["BT1-009"] }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kiyoshiro").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.state.players[1]!.battleArea).toContain(s.perm("sourced"));
    expect(s.state.players[1]!.hand).toHaveLength(0);
  });
});
