import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";

// Discord 1557413340161253496, follow-up 2026-10-08: source costs cannot touch breeding.
describe("Discord 1557413340161253496 battle-area source trash costs", () => {
  for (const card of ["EX10-032", "EX11-044", "EX10-036"]) {
    it(`${card} offers battle sources but excludes Tumblemon in breeding`, async () => {
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card, as: "attacker" },
              {
                card: "BT4-065",
                as: "fuelHost",
                under: [
                  { card: "BT4-065", as: "fuel1" },
                  { card: "BT4-065", as: "fuel2" },
                  { card: "BT4-065", as: "fuel3" },
                  { card: "BT4-065", as: "fuel4" },
                ],
              },
            ],
            breeding: { card: "EX10-025", as: "breeding", under: [{ card: "EX8-005", as: "egg" }] },
            deck: ["BT1-009", "BT1-009"],
          },
          1: { battleArea: [{ card: "BT1-009", as: "victim", suspended: true }], security: 5 },
        },
        { autoAcceptOptional: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      const decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(decision.options?.candidateInstanceIds).toEqual(expect.arrayContaining([s.inst("fuel1").instanceId]));
      expect(decision.options?.candidateInstanceIds).not.toContain(s.inst("egg").instanceId);
      const eventsBefore = s.events.length;
      const response = s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: {
          kind: "selectCards",
          instanceIds:
            card === "EX10-032"
              ? [s.inst("egg").instanceId]
              : [s.inst("egg").instanceId, s.inst("fuel1").instanceId, s.inst("fuel2").instanceId],
        },
      });
      expect(response.ok).toBe(false);
      expect(s.perm("breeding").stack.map(({ cardId }) => cardId)).toEqual(["EX8-005"]);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.events.slice(eventsBefore)).toHaveLength(0);
    });
  }
});
