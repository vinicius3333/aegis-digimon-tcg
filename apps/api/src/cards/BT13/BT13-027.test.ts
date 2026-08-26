import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT13-027.js";

describe("BT13-027 Shaujinmon", () => {
  it("keeps Blocker and optionally plays a level 4 or lower card from its stack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "Static",
      keywords: [expect.objectContaining({ keyword: "Blocker" })],
    }));
    expect(compiled.effects).toContainEqual(expect.objectContaining({
      trigger: "OpponentsTurn",
      actions: [expect.objectContaining({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      actions: [expect.objectContaining({ kind: "PlayWithoutCost", fromOwnDigivolutionStack: true, optional: true })],
      })],
    }));
  });

  it("plays a level 4 card from its own stack when the opponent attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-027", as: "shaujin", under: ["BT13-028", "BT13-026"] }],
          security: ["BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }], security: ["BT1-002"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-026"),
      3000,
    );
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT13-026")).toBe(true);
    expect(s.perm("shaujin").stack.map(({ cardId }) => cardId)).toEqual(["BT13-028"]);
  });

  it("allows the controller to decline playing from its stack", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-027", as: "shaujin", under: ["BT13-026"] }], security: ["BT1-001"] },
        1: { battleArea: [{ card: "BT1-015", as: "attacker" }] },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some(({ kind }) => kind === "blockWindowOpened"));

    expect(s.perm("shaujin").stack.map(({ cardId }) => cardId)).toEqual(["BT13-026"]);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
  });

  it("keeps Blocker as a static keyword", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-027", as: "shaujin" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("shaujin"), "Blocker")).toBe(true);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("shaujin"), "Blocker")).toBe(true);
  });
});
