import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-041.js";
import "../index.js";

const CARD_ID = "EX10-041";

describe("EX10-041 Wizardmon", () => {
  it("records the exact catalog", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      colors: ["Purple", "Yellow"],
      level: 4,
      playCost: 5,
      dp: 5000,
      evoCosts: [
        { color: "Purple", level: 3, memoryCost: 3 },
        { color: "Yellow", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Wizard", "Witchelny"],
    });
  });

  it("proves effect-only deck/security trash triggers and opponent-turn DP duration", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["Evil"], cost: 2, isAlternate: true }]);
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      actions: [{ kind: "SubTrigger", event: "whenTrashedFromDeck", sourceFilter: { isSelfRef: true } }],
    });
    expect(compiled.effects?.find((effect) => effect.trigger === "OnDiscardSecurity")).toMatchObject({
      actions: [
        { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "untilOpponentTurnEnd" },
      ],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "CostGatedBlock",
            cost: {
              kind: "trash",
              target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            },
            optional: true,
            abortOnDecline: true,
            actions: [
              { kind: "TrashTopDeck", controller: "mine", amount: 2 },
              {
                kind: "ModifyDP",
                target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
                amount: -3000,
                duration: "forTheTurn",
              },
            ],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier" }],
    });
    // The deck watcher must carry no attribution flag: `whenTrashedFromDeck` only fires from the
    // TrashTopDeck seam (already effect-only), and `requireByEffect` reads a payload field that
    // seam never sets, so either flag is dead or actively silences the clause.
    const deckWatcher = compiled.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(deckWatcher).not.toHaveProperty("byEffect");
    expect(deckWatcher).not.toHaveProperty("requireByEffect");
  });

  it("Q5122 grants Security Attack -1 when an effect directly trashes it from the deck", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-040", as: "miller" }], deck: [{ card: CARD_ID, as: "wizard" }, "BT1-009"] },
      1: { battleArea: [{ card: "EX10-030", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.StartOfYourMainPhase, s.perm("miller"));
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("wizard").instanceId);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("grants Security Attack -1 when an effect trashes it from its controller's security", async () => {
    const s = setupEngine({
      0: { security: [{ card: CARD_ID, as: "wizard", faceUp: true }] },
      1: { battleArea: [{ card: "EX10-030", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).verb.trash([s.inst("wizard").instanceId]);
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === -1);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });

  it("pays the On Play security cost before milling 2 and giving every opposing Digimon -3000 DP", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wizard" }],
          security: [
            { card: "BT1-009", as: "security" },
            { card: "BT1-010", as: "bottomSecurity" },
          ],
          deck: [
            { card: "BT1-009", as: "mill1" },
            { card: "BT1-010", as: "mill2" },
          ],
        },
        1: {
          battleArea: [
            { card: "EX10-030", as: "first", dp: 9000 },
            { card: "EX10-028", as: "second", dp: 7000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("wizard"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("bottomSecurity").instanceId);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("security").instanceId, s.inst("mill1").instanceId, s.inst("mill2").instanceId]),
    );
    expect(s.perm("first").currentDP).toBe(6000);
    expect(s.perm("second").currentDP).toBe(4000);
  });

  it("declining the security cost aborts the mill and leaves every opposing DP untouched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wizard" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [
            { card: "BT1-009", as: "mill1" },
            { card: "BT1-010", as: "mill2" },
          ],
        },
        1: { battleArea: [{ card: "EX10-030", as: "first", dp: 9000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("wizard"));
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("first").currentDP).toBe(9000);
  });

  it('the -3000 DP lasts only "for the turn" and is swept at the end of the turn it resolved on', async () => {
    // Mutation check for the duration field: under untilOpponentTurnEnd the debuff would still be
    // on the board after seat 0's own turn ends, so this assertion is what distinguishes the two.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "wizard" }],
          security: [{ card: "BT1-009", as: "security" }],
          deck: [{ card: "BT1-009", as: "mill1" }, { card: "BT1-010", as: "mill2" }, "BT1-009", "BT1-010", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 9000 }], deck: ["BT1-009", "BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForPermanent(EffectTiming.WhenDigivolving, s.perm("wizard"));
    expect(s.perm("victim").currentDP).toBe(6000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("victim").currentDP).toBe(9000);
  });

  it("provides Barrier only from a realistic inherited stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-030", as: "host", under: [{ card: CARD_ID, as: "wizard" }] },
          { card: CARD_ID, as: "standalone" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("standalone"), "Barrier")).toBe(false);
  });
});
