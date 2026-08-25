import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-072.js";
import "../index.js";

const CARD_ID = "EX10-072";

describe("EX10-072 Spiral Mountain", () => {
  it("records the exact catalog and complete Main, Delay, and Security contracts", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Spiral Mountain",
      colors: ["White"],
      kinds: ["Option"],
      playCost: 3,
      types: ["Dark Masters"],
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const effects = compiled.effects;
    expect(effects[0]).toMatchObject({
      trigger: "Static",
      actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone" } }],
    });
    expect(effects[1]).toMatchObject({
      trigger: "Main",
      actions: [{ kind: "Draw", amount: 2 }, { kind: "PlaceInBattleAreaSelf" }],
    });
    expect(effects[2]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      keywords: [{ keyword: "Delay" }],
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          optional: true,
          target: { filter: { faceUp: true, nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }] } },
        },
        { kind: "DelayedDeletePlayed" },
      ],
    });
    expect(effects[3]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", from: ["hand", "trash"], bindResultAs: "playedByThisEffect" },
        { kind: "AddToHandSelf" },
        {
          kind: "SubTrigger",
          event: "endOfTurn",
          on: { filter: { boundRef: "playedByThisEffect" }, count: 1 },
        },
      ],
    });
  });

  it("plays without a color source when no Spiral Mountain exists, draws 2, and places itself", async () => {
    const s = setupEngine({ 0: { hand: [{ card: CARD_ID, as: "spiral" }], deck: ["BT1-001", "BT1-002"] } });
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spiral").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID));
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === CARD_ID)).toBe(true);
  });

  it("does not waive color while another Spiral Mountain is established", async () => {
    const s = setupEngine({
      0: { hand: [{ card: CARD_ID, as: "handSpiral" }], battleArea: [{ card: CARD_ID, as: "fieldSpiral" }] },
    });
    s.perm("fieldSpiral").placedByEffect = true;
    s.state.memory = 3;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("handSpiral").instanceId })).toMatchObject({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });

  it("Security plays only a Dark Masters Digimon and adds itself to hand", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: CARD_ID, as: "spiral" }], hand: ["BT15-031", "BT1-001"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("spiral"));
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT15-031");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).not.toContain("BT1-001");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain(CARD_ID);
  });
});
