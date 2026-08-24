import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-098.js";
import "../index.js";

describe("BT26-098 compiled fidelity", () => {
  it("encodes the face-down Tamer payment, literal materials, free Rosemon evolution, and Security mode", () => {
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
          target: {
            filter: {
              kind: ["Digimon", "Tamer"],
              orFilters: [
                { nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }] },
                { nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "name" }] },
              ],
            },
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });

    const beforePayCost = card?.effects?.find((effect) => effect.trigger === "BeforePayCost")?.actions ?? [];
    expect(beforePayCost).toMatchObject([
      {
        kind: "CostModifier",
        costType: "use",
        mode: "reduce",
        amount: 2,
        handResident: true,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
        optional: true,
        abortOnDecline: true,
      },
    ]);

    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({
      kind: "CostGatedBlock",
      optional: true,
      abortOnDecline: true,
      cost: {
        kind: "compound",
        costs: [
          { kind: "place", position: "bottom", bindHostAs: "lalamonHost" },
          { kind: "place", position: "bottom", host: { filter: { boundRef: "lalamonHost" } } },
        ],
      },
      actions: [
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "lalamonHost" },
          from: ["hand"],
          payCost: false,
          ignoreRequirements: true,
          optional: true,
        },
      ],
    });
  });

  it("publicly plays a Lalamon from hand and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-098", as: "option", faceUp: true }],
          hand: [{ card: "BT26-036", as: "lalamon" }],
          battleArea: [{ card: "BT26-036", as: "existingLalamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT26-036")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-098");
  });

  it("places both named materials under one Lalamon before the free evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-036", as: "lalamon" }],
          trash: [
            { card: "BT26-039", as: "sunflowmon" },
            { card: "BT26-044", as: "lilamon" },
          ],
          hand: [
            { card: "BT26-098", as: "option" },
            { card: "BT26-049", as: "rosemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("lalamon").topCard.cardId === "BT26-049");

    expect(s.perm("lalamon").topCard.cardId).toBe("BT26-049");
    expect(s.perm("lalamon").stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT26-039", "BT26-044"]),
    );
  });

  it("Q7173: with only one named material, moves neither card and does not digivolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-036", as: "lalamon" }],
          trash: [{ card: "BT26-039", as: "sunflowmon" }],
          hand: [
            { card: "BT26-098", as: "option" },
            { card: "BT26-049", as: "rosemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT26-098"));

    expect(s.perm("lalamon").topCard.cardId).toBe("BT26-036");
    expect(s.perm("lalamon").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("BT26-039");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-049");
  });
});
