import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST8-04.js";

describe("ST8-04 Veemon", () => {
  it("digivolves into UlforceVeedramon for 4 ignoring requirements with opposing level 6", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST8-04", as: "veemon" }], hand: [{ card: "ST8-10", as: "ulforce" }] }, 1: { battleArea: ["ST8-10"] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("veemon").permanentId, instanceId: s.inst("ulforce").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("veemon").topCard.cardId === "ST8-10");
    expect(s.state.memory).toBe(1);
  });

  it("draws 1 when its host attacks with 7 or fewer cards in hand", async () => {
    const s = setupEngine({ 0: { deck: [{ card: "ST8-02", as: "drawn" }], battleArea: [{ card: "ST8-10", as: "host", under: ["ST8-04"] }] }, 1: { security: ["ST8-01"] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));
  });
});
