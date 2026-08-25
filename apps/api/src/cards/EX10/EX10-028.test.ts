import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-028.js";
import "../index.js";

const CARD_ID = "EX10-028";

describe("EX10-028 Landramon", () => {
  it("records the exact catalog and compiled clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Black"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mineral", "LIBERATOR"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            target: expect.objectContaining({ bindAs: "chosen" }),
            keyword: { keyword: "Reboot" },
            cost: {
              kind: "trash",
              target: {
                from: ["digivolutionCards"],
                count: 1,
                filter: { controller: "mine", nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }] },
              },
            },
          },
          {
            kind: "GainKeyword",
            target: { fromSelectionRef: "chosen" },
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
          },
          { kind: "ModifyDP", target: { fromSelectionRef: "chosen" }, amount: 3000, duration: "untilOpponentTurnEnd" },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ match: "trait", tokens: ["Mineral", "Rock"] }],
          },
          actions: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 }, count: 1 },
            },
          ],
        },
      ],
    });
  });

  it("Q5083 pays from another Mineral stack and gives all three buffs to one matching target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: CARD_ID, as: "costHost", under: [{ card: "EX10-025", as: "cost" }] },
            { card: CARD_ID, as: "target" },
            { card: "BT1-009", as: "near" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("near").permanentId, s.perm("target").permanentId);
    const baseDp = s.perm("target").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(baseDp + 3000);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("near"), "Blocker")).toBe(false);
  });

  it("refusal pays nothing and grants nothing", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "source" },
            { card: CARD_ID, as: "target", under: [{ card: "EX10-025", as: "cost" }] },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    const baseDp = s.perm("target").currentDP;
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("target").stack.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(baseDp);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(false);
  });

  it("Q5100 deletes using final play cost 4, rejects 5, and works in a realistic stack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "host", under: [{ card: CARD_ID, as: "landramon" }] }] },
        1: {
          battleArea: [
            { card: "BT1-019", as: "reduced" },
            { card: "AD1-003", as: "five" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("five").permanentId, s.perm("reduced").permanentId);
    await s.ready();
    advance(s.engine).ledgers.modifiers.addPlayCostAdjustment(() => true, -2, false);
    const reducedId = s.perm("reduced").permanentId;
    const fiveId = s.perm("five").permanentId;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("landramon").instanceId],
      0,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(reducedId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(fiveId);
  });

  it("the inherited watcher is silent from a non-Mineral/Rock host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: [{ card: CARD_ID, as: "landramon" }] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    const targetId = s.perm("target").permanentId;
    await advance(s.engine).verb.trashDigivolutionCards(
      s.perm("host").permanentId,
      [s.inst("landramon").instanceId],
      0,
    );
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toContain(targetId);
  });
});
