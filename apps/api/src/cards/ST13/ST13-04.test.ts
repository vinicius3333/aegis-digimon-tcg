import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST13-04.js";

describe("ST13-04 Duramon", () => {
  it("reduces a Legend-Arms digivolution cost by 1 on its turn", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "ST13-04", as: "duramon" }],
      hand: [{ card: "ST13-05", as: "durandamon" }],
      deck: ["BT1-001"],
    } });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("duramon").permanentId, instanceId: s.inst("durandamon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("duramon").topCard.cardId === "ST13-05");
    expect(s.state.memory).toBe(1);
  });
});
