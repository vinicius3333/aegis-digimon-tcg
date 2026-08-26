import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-098.js";
import "./BT9-098.js";

describe("BT9-098 Awakening of the Golden Knight", () => {
  it("matches catalog values and Armor waiver, free evolution, and security IR", () => {
    expect(getCardDefinition("BT9-098")).toMatchObject({
      colors: ["Yellow"], kinds: ["Option"], playCost: 3,
      securityEffectText: "[Security] Return 1 card with [Magnamon] in its name from your trash to your hand, and add this card to your hand.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { traits: ["Armor Form"] } } }] },
        { trigger: "Main", actions: [{ kind: "Digivolve", from: ["hand"], payCost: false, ignoreDigivolutionRequirements: true, optional: true, target: { filter: { traits: ["Armor Form"] } }, into: { nameOrTrait: [{ tokens: ["Magnamon"], match: "name" }] } }, { kind: "Restrict", restriction: "dpImmune", duration: "untilOpponentTurnEnd", byOpponentEffectsOnly: true }] },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "Return", to: "hand", target: { filter: { nameOrTrait: [{ tokens: ["Magnamon"], match: "name" }] } } }, { kind: "AddToHandSelf" }] },
      ],
    });
  });

  it("uses an off-color Armor Form requirement and freely evolves it into Magnamon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT8-012", as: "flamedramon" }],
          hand: [
            { card: "BT9-098", as: "option" },
            { card: "BT9-044", as: "magnamonX" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("flamedramon").topCard.cardId === "BT9-044");

    expect(s.perm("flamedramon").topCard.instanceId).toBe(s.inst("magnamonX").instanceId);
    expect(s.state.memory).toBe(-2);
    assertNoLoudGap(s);
  });

  it("does not waive the yellow requirement for a Digimon without Armor Form", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-010", as: "agumon" }],
        hand: [{ card: "BT9-098", as: "option" }],
      },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });
});
