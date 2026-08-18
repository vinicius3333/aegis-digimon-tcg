import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-024.js";

describe("BT8-024 Angemon", () => {
  it("recovers before digivolving while you have 3 or fewer security cards", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-024", as: "base" }],
      hand: [{ card: "BT8-042", as: "evolving" }],
      deck: ["BT8-033", "BT8-034"],
      security: ["BT8-035", "BT8-036", "BT8-037"],
    } });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security).toHaveLength(4);
  });

  it("returns an opposing level 3 when its host attacks with at least 3 security", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-030", as: "host", under: ["BT8-024"] }], security: ["BT8-034", "BT8-035", "BT8-036"] },
      1: { security: ["BT8-034"], battleArea: [{ card: "BT8-033", as: "target" }] },
    }, { autoSelectCards: true });
    s.state.memory = 3;
    const targetId = s.perm("target").topCard.instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === targetId));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
