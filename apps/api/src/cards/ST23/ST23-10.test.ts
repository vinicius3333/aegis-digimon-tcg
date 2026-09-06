import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-10.js";

describe("ST23-10 Pristimon", () => {
  it("places an exact hand card face down under a Glowing Dawn Tamer and draws two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST23-13", as: "tamer" }],
          hand: [
            { card: "ST23-10", as: "gatomon" },
            { card: "BT1-009", as: "cost" },
          ],
          deck: ["BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("cost").instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gatomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.perm("tamer").stack.some((card) => card.instanceId === costId) && s.state.players[0]!.hand.length === 2,
    );
    expect(s.perm("tamer").stack).toHaveLength(1);
    expect(s.perm("tamer").stack[0]!.instanceId).toBe(costId);
    expect(s.perm("tamer").stack[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-002")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-003")).toBe(true);
  });
  it("redirects a real player attack with inherited Blocker", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST23-02", as: "attacker" }] },
      1: { battleArea: [{ card: "ST5-06", as: "host", under: ["ST23-10"] }], security: ["BT1-001"] },
    });
    const attackerId = s.perm("attacker").permanentId;
    const hostId = s.perm("host").permanentId;
    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId));
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({
      kind: "combatResolved",
      deletedPermanentIds: [attackerId],
    });
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === hostId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
