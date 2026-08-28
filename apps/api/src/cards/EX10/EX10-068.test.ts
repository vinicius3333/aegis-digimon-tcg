import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-068.js";
import "../index.js";

const CARD_ID = "EX10-068";

describe("EX10-068 Digimon Emperor", () => {
  it("records the exact catalog and both complete effect contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Digimon Emperor",
      colors: ["White"],
      kinds: ["Tamer"],
      playCost: 5,
      dp: 0,
      evoCosts: [],
      forms: ["-"],
      attributes: ["-"],
      types: ["-"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects.find(({ trigger }) => trigger === "StartOfYourMainPhase")).toMatchObject({
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: { per: 2, unit: "colors", filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
        },
      ],
    });
    expect(compiled.effects.find(({ trigger }) => trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
        },
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: {
            filter: {
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              sameColorAsReturned: true,
            },
          },
          cost: {
            kind: "return",
            target: { filter: { zone: "trash", controller: "opponent", kind: ["Digimon"] } },
            to: "deckBottom",
          },
          abortOnDecline: true,
        },
      ],
    });
  });

  it("gains 1 memory for every complete pair of distinct opposing colors", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "emperor" }] },
      1: { battleArea: [{ card: "EX10-023" }, { card: "EX10-047" }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnStartMainPhase, s.perm("emperor"));
    expect(s.state.memory).toBe(2);
  });

  it("deletes exactly 1 opposing play-cost-5-or-lower Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "emperor" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "cheap" },
            { card: "EX10-023", as: "expensive" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("emperor"));
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("expensive").permanentId,
    ]);
  });

  it.each([
    ["Blue", "BT1-029"],
    ["Green", "BT1-064"],
  ])("Q5181/Q5182 plays a level-4-or-lower %s card sharing either returned color", async (_color, playable) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "emperor" }], hand: [{ card: playable, as: "playable" }] },
        1: { trash: [{ card: "BT16-021", as: "dualColor" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("emperor"));
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT16-021");
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === playable)).toBe(true);
  });

  it("does not pay the return cost when no eligible same-color play exists", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "emperor" }], hand: ["BT1-009"] },
        1: { trash: [{ card: "BT16-021", as: "dualColor" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("emperor"));
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("BT16-021");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-009");
  });

  it("plays itself from security without paying", async () => {
    const s = setupEngine({ 0: { security: [{ card: CARD_ID, as: "emperor" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("emperor"));
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });
});
