import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("BT19-064", () => {
  it("preserves Blast Digivolve, Blocker/protection, shared unsuspend cost, and either-side Option targeting", () => {
    const card = runtimeCompiledCard("BT19-064");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Counter", isFromHand: true, keywords: [{ keyword: "BlastDigivolve" }] },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
          {
            kind: "Restrict",
            restriction: "beAffected",
            duration: "untilOpponentTurnEnd",
            sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          },
        ],
      })),
      ...["WhenDigivolving", "WhenAttacking"].map((trigger) => ({
        trigger,
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "Unsuspend",
            cost: { kind: "trash", target: { filter: { zone: "battleArea", kind: ["Option"] } } },
            optional: true,
          },
        ],
      })),
    ]);
  });

  it("resolves On Play Blocker/protection from a public play intent", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-064", as: "justi" }] }, 1: { battleArea: [{ card: "BT19-020", as: "opponent" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("justi").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("justi"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("justi"), "Blocker")).toBe(true);
  });

  it("naturally blocks an opponent Digimon effect after public play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-064", as: "justi" }] },
        1: { hand: [{ card: "BT19-046", as: "chamble" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("justi").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("justi"), "Blocker"));

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("chamble").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-046"));
    expect(s.state.players[1]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-046")).toBe(true);
    expect(s.perm("justi").isSuspended).toBe(false);
  });

  it("uses the same Option cost window for public evolution and attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "BT19-064", as: "justi" },
            { card: "BT19-093", as: "queen" },
            { card: "BT19-095", as: "knight" },
          ],
          battleArea: [{ card: "BT11-073", as: "base", suspended: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-093"));
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("knight").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-095"));
    expect(
      s.state.players[0]!.battleArea.filter(
        (perm) => perm.topCard?.cardId === "BT19-093" || perm.topCard?.cardId === "BT19-095",
      ),
    ).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("justi").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT19-064");
    await settle(() =>
      s.state.players[0]!.trash.some((card) => card.cardId === "BT19-093" || card.cardId === "BT19-095"),
    );
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-093" || card.cardId === "BT19-095")).toBe(
      true,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").isSuspended);
    expect(s.perm("base").isSuspended).toBe(true);
    expect(
      s.state.players[0]!.battleArea.some(
        (perm) => perm.topCard?.cardId === "BT19-093" || perm.topCard?.cardId === "BT19-095",
      ),
    ).toBe(true);
  });
});
