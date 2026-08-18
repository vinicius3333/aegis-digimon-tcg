import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-070.js";

describe("BT9-070 Gazimon (X Antibody)", () => {
  it("trashes the top 3 cards of your deck", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-006", as: "base" }], hand: [{ card: "BT9-070", as: "evolving" }], deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
