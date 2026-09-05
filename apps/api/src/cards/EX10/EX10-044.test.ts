import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-044.js";
import "../index.js";

const CARD_ID = "EX10-044";

describe("EX10-044 Damemon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple"],
      level: 4,
      playCost: 4,
      dp: 3000,
      evoCosts: [{ color: "Purple", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mutant", "Bagra Army"],
    });
  });

  it("proves Bagra Army placement, Tuwarmon Save, and host/card-scoped inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          amount: 1,
          cost: {
            kind: "place",
            target: { from: ["hand", "trash"] },
            underFilter: { kind: ["Tamer"] },
            position: "bottom",
          },
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        { kind: "PlayWithoutCost", from: ["underTamers"], payCost: false, optional: true },
        { kind: "PlaceUnder", underFilter: { kind: ["Tamer"] }, optional: true },
      ],
      keywords: [{ keyword: "Save" }],
    });
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
  });

  it("Q5126 places the Bagra Army payment at the true Tamer bottom, then draws 1", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-064", as: "tamer", under: [{ card: "BT1-009", as: "existing" }] },
          ],
          hand: [
            { card: "EX10-026", as: "material" },
            { card: "BT1-009", as: "near" },
          ],
          deck: [{ card: "BT1-010", as: "draw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("material").instanceId, s.perm("tamer").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("damemon"));
    expect(s.perm("tamer").stack.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("material").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("near").instanceId, s.inst("draw").instanceId]),
    );
  });

  it("rejects a non-Bagra Army hand card as the placement cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-064", as: "tamer" },
          ],
          hand: [{ card: "BT1-009", as: "wrong" }],
          deck: [{ card: "BT1-010", as: "draw" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("damemon"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("wrong").instanceId);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toContain(s.inst("draw").instanceId);
  });

  it("On Deletion may play a cost-7 Tuwarmon from under a Tamer, then may Save", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "damemon" },
            { card: "EX10-064", as: "tamer", under: [{ card: "BT12-064", as: "tuwarmon" }] },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("tuwarmon").instanceId, s.perm("tamer").permanentId);
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("damemon").permanentId], "byEffect");
    await settle(
      () =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-064") &&
        s.perm("tamer").stack.some(({ cardId }) => cardId === CARD_ID),
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT12-064")).toBe(true);
    expect(s.perm("tamer").stack.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });

  it("the inherited watcher draws only when effect-trashed from a Bagra Army host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX10-026", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await s.ready();
    await advance(s.engine).verb.trashDigivolutionCards(s.perm("host").permanentId, [s.inst("source").instanceId], 0);
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    const blocked = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await blocked.ready();
    await advance(blocked.engine).verb.trashDigivolutionCards(
      blocked.perm("host").permanentId,
      [blocked.inst("source").instanceId],
      0,
    );
    expect(blocked.state.players[0]!.hand).toHaveLength(0);
  });
});
