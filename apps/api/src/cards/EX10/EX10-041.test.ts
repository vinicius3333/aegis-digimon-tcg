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
      actions: [
        { kind: "SubTrigger", event: "whenTrashedFromDeck", byEffect: true, sourceFilter: { isSelfRef: true } },
      ],
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
                duration: "untilOpponentTurnEnd",
              },
            ],
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Barrier" }],
    });
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
          security: [{ card: "BT1-009", as: "security" }],
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
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("security").instanceId, s.inst("mill1").instanceId, s.inst("mill2").instanceId]),
    );
    expect(s.perm("first").currentDP).toBe(6000);
    expect(s.perm("second").currentDP).toBe(4000);
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
