import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

/**
 * A would-leave replacement printed in a digivolution card's INHERITED box belongs to that
 * card, not to the Digimon standing on top of it. Both the ordering prompt and the prompt
 * the clause itself raises name the card whose text is being applied, so the player is
 * never shown an unrelated effect of the top card (the match that raised this offered
 * KingEtemon's [All Turns] continuous clause for a Sukamon's prevention).
 */
describe("inherited would-leave replacement provenance", () => {
  function board() {
    return setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-035", as: "king", under: ["BT11-040", "EX13-028"] },
            { card: "EX13-028", as: "fodder" },
          ],
          deck: ["BT1-010", "BT1-010", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "enemy" }], deck: ["BT1-010"] },
      },
      { autoSelectCards: false, autoAcceptOptional: false, autoOrderTriggers: false },
    );
  }

  function deletePermanent(s: ReturnType<typeof setupEngine>, permanentId: string) {
    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    void primitives.deletePermanent([permanentId], "byEffect");
  }

  it("names each competing replacement by the card that prints it", async () => {
    const s = board();
    s.state.turnSeat = 1;
    await s.ready();
    deletePermanent(s, s.perm("king").permanentId);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const options = s.decisions.at(-1)!.req.options!;
    expect(options.triggerCardIds).toEqual(["BT11-040", "EX13-028"]);
    expect(options.triggerIsInherited).toEqual([true, true]);
    expect(options.triggerDescriptions?.[0]).toContain("by deleting 1 other Digimon with [Sukamon] in its name");
    // Each entry is addressed by the instance that prints it, so two copies of one card
    // under the same permanent stay separately answerable.
    expect(options.triggerKeys?.[0]).toContain("::replacement/");
  });

  it("asks the prevention as the digivolution card, not as the Digimon above it", async () => {
    const s = board();
    s.state.turnSeat = 1;
    await s.ready();
    deletePermanent(s, s.perm("king").permanentId);
    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");

    const order = s.decisions.at(-1)!.req;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [order.options!.triggerKeys![0]!] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const prevent = s.decisions.at(-1)!.req;
    expect(prevent.promptText).toBe("Prevent leaving the battle area?");
    expect(prevent.sourceCardId).toBe("BT11-040");
    expect(prevent.options?.isInherited).toBe(true);
  });
});
