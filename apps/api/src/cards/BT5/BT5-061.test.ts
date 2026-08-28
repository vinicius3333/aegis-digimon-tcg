import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-061.js";

describe("BT5-061 Commandramon", () => {
  it("has Blocker", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-061", as: "command" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("command"), "Blocker")).toBe(true);
  });

  it("can redirect an opposing attack as a Blocker", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT5-061", as: "command" }], security: ["BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const blockerId = s.perm("command").permanentId;
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: blockerId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT5-061"));
    expect(s.events).toContainEqual(expect.objectContaining({ kind: "blocked", blockerPermanentId: blockerId }));
    expect(s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT5-061")).toBe(true);
  });
});
