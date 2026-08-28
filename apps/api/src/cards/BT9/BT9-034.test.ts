import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-034.js";

describe("BT9-034 Salamon (X Antibody)", () => {
  it("matches catalog, alternate evolution, and Q1833 security IR", () => {
    expect(getCardDefinition("BT9-034")).toMatchObject({
      cardId: "BT9-034", nameEn: "Salamon (X Antibody)", colors: ["Yellow"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 3000, evoCosts: [{ color: "Yellow", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Vaccine"], types: ["Mammal", "X Antibody"],
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Salamon"], cost: 0, isAlternate: true }],
      effects: [{ trigger: "WhenDigivolving", actions: [{
        kind: "SecurityManipulation", op: "lookAndMayAddToHand", controller: "mine", source: "securityTop", amount: 1,
        ifAddedToHand: [{ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 }],
      }] }],
    });
  });

  it("adds the top security card to hand and recovers from the deck", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-034", as: "base" }],
          hand: [{ card: "BT9-034", as: "evolving" }],
          security: [{ card: "BT1-048", as: "oldSecurity" }],
          deck: ["BT1-049", { card: "BT1-050", as: "recovered" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT9-034"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("oldSecurity").instanceId)).toBe(true);
    expect(s.state.players[0]!.security[0]?.instanceId).toBe(s.inst("recovered").instanceId);
  });

  it("returns the looked-at security card face down when the optional add is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-034", as: "base" }],
        hand: [{ card: "BT9-034", as: "evolving" }],
        security: [{ card: "BT1-048", as: "top", faceUp: true }],
        deck: ["BT1-049", "BT1-050"],
      },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");

    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("top").instanceId);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(false);
  });
});
