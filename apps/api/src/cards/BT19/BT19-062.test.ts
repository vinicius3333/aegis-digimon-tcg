import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-062", () => {
  it("preserves Rush, Collision, effect-placed Option trashing, and end-turn player attack", () => {
    const card = runtimeCompiledCard("BT19-062");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Rush" }] },
      { trigger: "Static", keywords: [{ keyword: "Collision" }] },
      {
        trigger: "WhenAttacking",
        actions: [
          {
            kind: "Trash",
            target: {
              filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
            },
          },
        ],
      },
      {
        trigger: "EndOfYourTurn",
        actions: [
          {
            kind: "Attack",
            attackPlayer: true,
            condition: { kind: "opponentHas", filter: { unsuspended: true, kind: ["Digimon"] } },
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Collision" }] },
    ]);
  });

  it("trashes an effect-placed Option from a public play and attack", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT19-093", as: "queen" }],
          battleArea: [{ card: "BT19-062", as: "cyber" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], security: [] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("queen").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-093"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-093")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("cyber").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT19-093"));
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT19-093")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-093")).toBe(false);
    expect(s.perm("cyber").isSuspended).toBe(true);
  });

  it("resolves End of Your Turn as a real forced player attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-062", as: "cyber" }],
          hand: ["BT1-009"],
          deck: ["BT19-030"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }], security: [] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("opponent").permanentId,
      }),
    ).toEqual({ ok: true });
    await turn;
    const forcedAttackRequest = s.decisions.find(
      ({ req }) =>
        req.promptText === "Choose the attack target for the forced attack." &&
        req.options?.candidateInstanceIds?.includes("player"),
    );
    expect(forcedAttackRequest).toBeDefined();
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        attackerPermanentId: s.perm("cyber").permanentId,
        target: { kind: "player" },
      }),
    );
    expect(s.perm("cyber").isSuspended).toBe(true);
  });
});
