import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-072.js";
import "./ST7-02.js";
import "./ST7-07.js";

describe("ST7-02 Agumon", () => {
  it("gives its host +2000 DP when it declares an attack on a player", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "ST7-10", as: "host", under: ["ST7-02"] }] }, 1: { security: ["ST7-01"] } },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 14000, 5000);
    expect(s.perm("host").currentDP).toBe(14000);
  });
});

describe("ST7-02 Agumon — KB Q&A rulings", () => {
  it("still gives +2000 DP when a player attack is blocked by an opposing Digimon (Q680)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-07", as: "host", under: ["ST7-02"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker", dp: 8000 }], security: ["ST7-01"] },
    });
    s.state.memory = 3;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.perm("host").currentDP).toBe(9000);
    const blockerInstanceId = s.perm("blocker").topCard.instanceId;
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some(({ instanceId }) => instanceId === blockerInstanceId));
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
