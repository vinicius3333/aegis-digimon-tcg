import { describe, expect, it } from "vitest";
import { setupEngine } from "../testkit/harness.js";
import "../../cards/index.js";

function setup(played: string, material: string) {
  const s = setupEngine({
    0: {
      hand: [
        { card: played, as: "played" },
        { card: material, as: "material" },
      ],
      trash: [material],
    },
  });
  s.state.memory = 10;
  return s;
}

const malformedPlans: { name: string; plan: unknown }[] = [
  { name: "a bare list of ids", plan: ["material"] },
  { name: "a material list that is not a list", plan: { materialInstanceIds: "material" } },
  { name: "a material list holding non-ids", plan: { materialInstanceIds: [42] } },
  { name: "no plan fields at all", plan: {} },
];

describe("malformed material plans from a client", () => {
  for (const { name, plan } of malformedPlans) {
    it(`rejects a DigiXros play declared as ${name} without crashing`, async () => {
      const s = setup("BT12-011", "BT12-063");
      await s.ready();
      const digiXros = Array.isArray(plan) ? [s.inst("material").instanceId] : plan;
      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        digiXros,
      } as never);
      expect(result.ok).toBe(false);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("played").instanceId);
    });

    it(`rejects an Assembly play declared as ${name} without crashing`, async () => {
      const s = setup("EX13-060", "BT1-010");
      await s.ready();
      const assembly = Array.isArray(plan) ? [s.inst("material").instanceId] : plan;
      const result = s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("played").instanceId,
        assembly,
      } as never);
      expect(result.ok).toBe(false);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("played").instanceId);
    });
  }

  it("rejects a DigiXros play whose expander list is not a list of ids", async () => {
    const s = setup("BT12-011", "BT12-063");
    await s.ready();
    const result = s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("played").instanceId,
      digiXros: { materialInstanceIds: [s.inst("material").instanceId], expanderPermanentIds: "tamer" },
    } as never);
    expect(result).toEqual({ ok: false, reason: expect.any(String) });
  });
});
