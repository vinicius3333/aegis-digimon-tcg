import { describe, expect, it } from "vitest";
import { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-059.js";

describe("EX8-059", () => {
  it("makes an opposing Digimon gain an On Deletion effect that trashes a card in your hand on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      effectText: "[On Deletion] Trash 1 card in your hand.",
      optional: true,
      cost: { kind: "trash" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
    });
  });
  it("inherits draw 1 then trash 1 when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "Draw", amount: 1 }, { kind: "Trash", target: { count: 1 } }],
    }));
  it("resolves the inherited draw-and-trash during a real attack", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT19-062", as: "attacker", under: ["EX8-059"] }], hand: [{ card: "BT1-010", as: "filler" }], deck: ["BT1-001"] }, 1: { security: ["BT1-016"] } },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => player.trash.some((card) => card.instanceId === s.inst("filler").instanceId));
    expect(player.hand).toHaveLength(1);
    expect(player.trash.some((card) => card.instanceId === s.inst("filler").instanceId)).toBe(true);
  });
});
