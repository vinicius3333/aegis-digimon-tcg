import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-047.js";

describe("EX1-047 Guardromon", () => {
  it("has Blocker and can't attack on your turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-047", as: "guardromon" }] }, 1: { security: ["BT1-001"] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("guardromon"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("guardromon").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
  });

  it("trashes a Machine card to draw 2 through its inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-042", as: "host", under: ["EX1-047"] }],
          hand: [{ card: "BT1-068", as: "machine" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("machine").instanceId)).toBe(true);
  });
});
