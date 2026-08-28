import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-021.js";

describe("LM-021 Agumon - Bond of Bravery", () => {
  it("deletes opposing Digimon whose total DP fits inside its own DP, per Q4017", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-021", as: "bond" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "within", dp: 14000 },
            { card: "BT1-010", as: "over", dp: 14001 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bond").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009"), 2000);

    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-009")).toBe(false);
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT1-010")).toBe(true);
  });

  it("reads its LIVE DP for the budget, not the printed 14000", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-021", as: "bond", dp: 4000 }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 5000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("bond"));
    await settle(() => s.state.pendingDecision === null);

    // 5000 DP exceeds the source's live 4000 DP budget, so nothing is deleted.
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("takes several Digimon whose DP adds up inside the budget", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-021", as: "bond" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "a", dp: 7000 },
            { card: "BT1-010", as: "b", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("bond"));
    await settle(() => s.state.players[1]!.battleArea.length === 0, 2000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("offers the Agumon cost-3 path only at two or fewer security cards, per Q4014", async () => {
    const board = (securityCount: number) => ({
      0: {
        battleArea: [{ card: "BT1-010", as: "agumon" }],
        hand: [{ card: "LM-021", as: "bond" }],
        security: securityCount,
      },
    });

    const low = setupEngine(board(2), { autoDeclineOptional: true, autoSelectCards: true });
    low.state.memory = 3;
    await low.ready();
    expect(
      low.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: low.perm("agumon").permanentId,
        instanceId: low.inst("bond").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => low.perm("agumon").topCard?.cardId === "LM-021", 2000);
    expect(low.state.memory).toBe(0);

    const high = setupEngine(board(3), { autoDeclineOptional: true, autoSelectCards: true });
    high.state.memory = 3;
    await high.ready();
    expect(
      high.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: high.perm("agumon").permanentId,
        instanceId: high.inst("bond").instanceId,
      }),
    ).not.toEqual({ ok: true });
  });

  it("trashes the opponent's top security once per turn while you have a Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-021", as: "bond" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => s.state.players[1]!.security.length === 2, 2000);
    expect(s.state.players[1]!.security).toHaveLength(2);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("trashes nothing without a Tamer", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-021", as: "bond" }] },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("bond"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-021");
    const compiled = runtimeCompiledCard("LM-021");
    expect(definition?.nameEn).toBe("Agumon - Bond of Bravery");
    expect(definition?.level).toBe(7);
    expect(definition?.overflowMemory).toBe(5);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.trigger === "Counter")).toMatchObject({
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });
});
