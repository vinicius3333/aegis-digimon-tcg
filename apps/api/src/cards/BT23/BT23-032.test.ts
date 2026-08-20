import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-032.js";

describe("BT23-032 Shakkoumon", () => {
  it("plays an eligible source from its carrier before the carrier leaves by an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT23-035",
              as: "carrier",
              under: [{ card: "BT23-050", as: "eligible" }, "BT23-032", { card: "BT1-009", as: "ineligible" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const carrierId = s.perm("carrier").permanentId;
    const eligibleId = s.inst("eligible").instanceId;

    expect(await advance(s.engine).verb.deletePermanent([carrierId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea.some((card) => card.topCard?.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((card) => card.permanentId === carrierId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
  });

  it("gives an opponent Digimon a Start of Your Main Phase attack trigger and de-digivolves on DNA", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving") as any;
    expect(effect.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      effectText: "[Start of Your Main Phase] This Digimon attacks.",
      duration: "untilOpponentTurnEnd",
    });
    expect(effect.actions[1]).toMatchObject({
      kind: "DeDigivolve",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      amount: 1,
      condition: { kind: "isDnaDigivolving" },
    });
  });

  it("once per turn may play a qualifying level 4-or-lower card from this stack when leaving", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    const replacement = effect.actions[0];
    expect(effect.frequency).toBe("OncePerTurn");
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Black"],
              levelComparison: { op: "lte", value: 4 },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                levelComparison: { op: "lte", value: 4 },
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
  });

  it("inherits the same once-per-turn leave reaction and OR eligibility", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited) as any;
    expect(effect).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn" });
    expect(effect.actions[0]).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { colors: ["Yellow", "Black"], levelComparison: { op: "lte", value: 4 } },
            orFilters: [
              {
                nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                levelComparison: { op: "lte", value: 4 },
              },
            ],
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    });
  });
});
