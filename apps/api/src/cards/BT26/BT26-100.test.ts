import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function continuous(s: ReturnType<typeof setupEngine>) {
  return (s.engine as unknown as {
    continuous: { hasKeyword(id: string, keyword: string): boolean; hasColorWaiver(id: string): boolean };
  }).continuous;
}

describe("BT26-100 Dark Field", () => {
  it("keeps its Security All Turns Blocker and DP grants active while face-up in security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-100", faceUp: true, as: "darkField" }],
        battleArea: [
          { card: "BT24-009", dp: 1000, as: "titan" },
          { card: "BT26-059", dp: 12000, as: "plutomon" },
        ],
      },
    });
    await s.ready();

    expect(continuous(s).hasKeyword(s.perm("titan").permanentId, "Blocker")).toBe(true);
    expect(s.perm("titan").currentDP).toBe(4000);
    expect(continuous(s).hasColorWaiver(s.inst("darkField").instanceId)).toBe(false);
  });

  it("uses its no-face-up-security waiver, recycles bottom security, and places itself face-up", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT26-100", as: "darkField" }],
        security: ["AD1-001", "AD1-002"],
        battleArea: [{ card: "BT24-009", as: "titan" }],
      },
    });
    await s.ready();
    s.state.memory = 3;
    const darkFieldId = s.inst("darkField").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("darkField").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === darkFieldId));

    const placed = s.state.players[0]!.security.find((card) => card.instanceId === darkFieldId);
    expect(placed?.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-002")).toBe(true);
  });

  it("plays a level-4-or-lower Titan Digimon from trash from Security", async () => {
    const s = setupEngine({
      0: {
        trash: [{ card: "BT24-009", as: "titanTarget" }],
        security: [{ card: "BT26-100", as: "darkField" }, "AD1-001"],
      },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards"));
    const decision = s.decisions.find(({ req }) => req.kind === "selectCards");
    if (decision === undefined) throw new Error("Dark Field Security selection not found");
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.req.decisionId,
      response: { kind: "selectCards", instanceIds: [s.inst("titanTarget").instanceId] },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("titanTarget").instanceId));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("titanTarget").instanceId)).toBe(true);
  });
});
