import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-102.js";
import "../index.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.[0]?.actions).toMatchObject([
      { kind: "WaiveColorRequirement", condition: { kind: "youHave" } },
    ]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true },
        trackCount: "sevenCodeMaterials",
        optional: true,
        abortOnDecline: true,
      },
      {
        kind: "Digivolve",
        ignoreRequirements: true,
        payCost: false,
        condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 },
      },
    ]);
  });

  it("publicly plays an Appmon from hand and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-102", as: "option", faceUp: true }],
          hand: [{ card: "BT21-009", as: "appmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT21-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-102");
  });

  it("Q7183-Q7186: places exactly six mixed-source materials, then may evolve the chosen host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-010", as: "host" }],
          hand: [
            { card: "BT26-102", as: "option" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: [
            { card: "BT26-019", as: "material1" },
            { card: "BT26-028", as: "material2" },
            { card: "BT26-037", as: "material3" },
            { card: "BT26-051", as: "material4" },
            { card: "BT26-063", as: "material5" },
            { card: "BT26-084", as: "material6" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("host").topCard.cardId === "BT26-086");

    expect(s.perm("host").stack).toHaveLength(6);
    expect(s.perm("host").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063", "BT26-084"]),
    );
  });

  it("Q7184: with only five materials, places none and does not evolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-010", as: "host" }],
          hand: [
            { card: "BT26-102", as: "option" },
            { card: "BT26-086", as: "dantemon" },
          ],
          trash: ["BT26-019", "BT26-028", "BT26-037", "BT26-051", "BT26-063"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-102"));

    expect(s.perm("host").topCard.cardId).toBe("BT26-010");
    expect(s.perm("host").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.filter(({ cardId }) => cardId !== "BT26-102")).toHaveLength(5);
  });
});
