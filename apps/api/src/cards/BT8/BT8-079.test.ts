import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-079.js";

describe("BT8-079 SkullSatamon", () => {
  it("mills 2, then returns a Demon Lord from trash to hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-074", as: "base" }], hand: [{ card: "BT8-079", as: "evolving" }], deck: ["BT1-009", { card: "BT2-111", as: "demonLord" }, "BT1-010"] } }, { autoSelectCards: true });
    const mine = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.events.some(event => event.kind === "effectResolved" && event.sourceCardId === "BT8-079"));
    expect(mine.hand.some(card => card.instanceId === s.inst("demonLord").instanceId)).toBe(true);
    expect(mine.trash).toHaveLength(1);
  });
});
