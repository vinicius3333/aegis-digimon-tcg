import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-022.js";

describe("LM-022 Gabumon - Bond of Friendship", () => {
  it("returns opposing Digimon with at most as many digivolution cards as itself", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-022", as: "bond" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "zero" },
            { card: "BT1-010", as: "one", under: ["BT1-001"] },
            { card: "BT1-011", as: "over", under: ["BT1-001", "BT1-002", "BT1-003"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 2, 2000);

    // Played fresh, Gabumon has an empty stack, so only the stackless opponent qualifies.
    expect(s.state.players[1]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011"]),
    );
    expect(s.state.players[1]!.deck.map((card) => card.cardId)).toContain("BT1-009");
  });

  it("returns two once its own stack is deep enough", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-022", as: "bond", under: ["BT1-001", "BT1-002"] }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "zero" },
            { card: "BT1-010", as: "one", under: ["BT1-001"] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bond"));
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-010"]);
  });

  it("offers the Gabumon cost-3 path only at two or fewer security cards, per Q4021", async () => {
    const board = (securityCount: number) => ({
      0: {
        battleArea: [{ card: "BT1-029", as: "gabumon" }],
        hand: [{ card: "LM-022", as: "bond" }],
        security: securityCount,
      },
    });

    const low = setupEngine(board(2), { autoDeclineOptional: true, autoSelectCards: true });
    low.state.memory = 3;
    await low.ready();
    expect(
      low.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: low.perm("gabumon").permanentId,
        instanceId: low.inst("bond").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => low.perm("gabumon").topCard?.cardId === "LM-022", 2000);
    expect(low.state.memory).toBe(0);

    const high = setupEngine(board(3), { autoDeclineOptional: true, autoSelectCards: true });
    high.state.memory = 3;
    await high.ready();
    expect(
      high.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: high.perm("gabumon").permanentId,
        instanceId: high.inst("bond").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("unsuspends itself once per turn when attacking with a Tamer in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-022", as: "bond", suspended: true },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => !s.perm("bond").isSuspended, 2000);
    expect(s.perm("bond").isSuspended).toBe(false);

    s.perm("bond").isSuspended = true;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => s.state.pendingDecision === null);
    expect(s.perm("bond").isSuspended).toBe(true);
  });

  it("stays suspended without a Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-022", as: "bond", suspended: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.perm("bond").isSuspended).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-022");
    const compiled = runtimeCompiledCard("LM-022");
    expect(definition?.nameEn).toBe("Gabumon - Bond of Friendship");
    expect(definition?.level).toBe(7);
    expect(definition?.overflowMemory).toBe(5);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });
});
