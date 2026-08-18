import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-107.js";
import "../ST9/ST9-13.js";

describe("BT1-107 Holy Wave", () => {
  it("recovers the top deck card", async () => {
    const s = setupEngine({
      0: {
        battleArea: ["BT1-047"],
        hand: [{ card: "BT1-107", as: "option" }],
        deck: [
          { card: "BT1-001", as: "top" },
          { card: "BT1-002", as: "second" },
          { card: "BT1-003", as: "third" },
        ],
      },
    });
    const topId = s.inst("top").instanceId;
    const secondId = s.inst("second").instanceId;
    const thirdId = s.inst("third").instanceId;
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: topId, faceUp: false });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([secondId, thirdId]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("recovers the top deck card from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-107", as: "securityOption", faceUp: true }], deck: [{ card: "BT1-001", as: "recovered" }] } });
    const recoveredId = s.inst("recovered").instanceId;
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[0]!.security.some((card) => card.instanceId === recoveredId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("continues a multi-check attack into the card recovered by its Security effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST9-13", as: "attacker", dp: 20000 }] },
      1: {
        security: ["BT1-107"],
        deck: [{ card: "BT1-010", as: "recovered" }],
      },
    });
    await s.ready();
    const recoveredInstanceId = s.inst("recovered").instanceId;
    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 0 &&
      s.state.players[1]!.trash.some((card) => card.instanceId === recoveredInstanceId),
    );

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === recoveredInstanceId)).toBe(true);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });
});
