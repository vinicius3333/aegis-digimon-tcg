import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-020.js";

describe("BT2-020 Gallantmon", () => {
  it("deletes a 6000 DP Digimon with a red Tamer in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-085" }, { card: "BT2-017", as: "base" }], hand: [{ card: "BT2-020", as: "evolving" }] }, 1: { battleArea: [{ card: "BT2-047", as: "target" }] } }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("trashes 1 opposing security card for every 10 cards in their trash when attacking", async () => {
    const trash = Array.from({ length: 20 }, (_, index) => ({ card: `BT1-${String((index % 8) + 1).padStart(3, "0")}` }));
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-020", as: "gallantmon" }] }, 1: { trash, security: ["BT1-010", "BT1-011", "BT1-012"] } });
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gallantmon"));
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
