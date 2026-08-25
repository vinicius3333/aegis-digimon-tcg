import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-045.js";
import "../index.js";

const CARD_ID = "EX10-045";

describe("EX10-045 Tuwarmon", () => {
  it("records the exact catalog and Damemon evolution", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Black"],
      level: 4,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Black", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Mutant", "Bagra Army"],
    });
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Damemon"], cost: 1, isAlternate: true }]);
  });

  it("proves Rush/Collision, shared same-target buffs, DigiXros, Save, and scoped inherited Draw 1", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digiXrosRequirement).toEqual([
      { materials: [{ names: ["Damemon"] }, { names: ["ChuuChuumon"] }], count: 2 },
    ]);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "GainKeyword",
            target: { bindAs: "chosen" },
            keyword: { keyword: "Blocker" },
            cost: {
              kind: "trash",
              target: {
                filter: { hostFilter: { nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] } },
                from: ["digivolutionCards"],
              },
            },
          },
          { kind: "GainKeyword", target: { fromSelectionRef: "chosen" }, keyword: { keyword: "Retaliation" } },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          sourceFilter: { isSelfRef: true },
          hostFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 1 }],
        },
      ],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [{ kind: "PlaceUnder", target: { isSelf: true }, underFilter: { kind: ["Tamer"] }, optional: true }],
      keywords: [{ keyword: "Save" }],
    });
  });

  it("publishes Rush and Collision", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "tuwarmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("tuwarmon"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("tuwarmon"), "Collision")).toBe(true);
  });

  it("pays with any friendly Bagra Army source and grants Blocker and Retaliation to the same target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: "EX10-026", as: "costHost", under: [{ card: "BT1-009", as: "cost" }] },
            { card: "EX10-031", as: "target" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("cost").instanceId, s.perm("plain").permanentId, s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("tuwarmon"));
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Retaliation")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("plain"), "Blocker")).toBe(false);
  });

  it("DigiXros uses one Damemon and one ChuuChuumon for -2 each", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: "EX10-044", as: "damemon" },
            { card: "EX10-039", as: "chuu" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 7;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("tuwarmon").instanceId,
        digiXros: { materialInstanceIds: [s.inst("damemon").instanceId, s.inst("chuu").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.cardId === CARD_ID));
    expect(s.state.memory).toBe(4);
  });

  it("executes Save and draws only when discarded from a Bagra Army host", async () => {
    const saved = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "tuwarmon" },
            { card: "EX10-064", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const savedId = saved.inst("tuwarmon").instanceId;
    await advance(saved.engine).verb.deletePermanent([saved.perm("tuwarmon").permanentId], "byEffect");
    await settle(() => saved.perm("tamer").stack.some(({ instanceId }) => instanceId === savedId));
    expect(saved.perm("tamer").stack.map(({ instanceId }) => instanceId)).toContain(savedId);

    const inherited = setupEngine({
      0: {
        battleArea: [{ card: "EX10-026", as: "host", under: [{ card: CARD_ID, as: "source" }] }],
        deck: ["BT1-009"],
      },
    });
    await inherited.ready();
    await advance(inherited.engine).verb.trashDigivolutionCards(
      inherited.perm("host").permanentId,
      [inherited.inst("source").instanceId],
      0,
    );
    await settle(() => inherited.state.players[0]!.hand.length === 1);
    expect(inherited.state.players[0]!.hand).toHaveLength(1);
  });
});
