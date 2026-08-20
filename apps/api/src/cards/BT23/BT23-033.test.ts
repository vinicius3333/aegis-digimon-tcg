import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-033.js";

describe("BT23-033 Beautymon", () => {
  it("links only a Link-capable level-4-or-lower card and still scales DP when Recovery is ineligible", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-033", as: "beautymon" }],
          trash: [
            { card: "BT23-039", as: "linkCapable" },
            { card: "BT1-009", as: "noLink" },
          ],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
          deck: [{ card: "BT23-100", as: "mustRemainInDeck" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const linkId = s.inst("linkCapable").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("beautymon"));

    expect(s.perm("beautymon").linked.some((card) => card.instanceId === linkId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("target").currentDP).toBe(4000);
  });

  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("may link a level 4-or-lower card from trash or this Digimon's stack", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "Link",
        target: {
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            hasLinkRequirement: true,
            levelComparison: { op: "lte", value: 4 },
          },
          count: 1,
        },
        from: ["trash", "digivolutionCards"],
        payCost: false,
        optional: true,
      });
      expect(action.recipient).toBeUndefined();
    }
  });

  it("once per turn reacts only when this Digimon gets linked", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 5 },
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -1000,
          duration: "untilOpponentTurnEnd",
          scaling: { per: 1, unit: "security", filter: { controller: "mine" } },
        },
      ],
    });
  });

  it("carries App Fusion, Link cost and linked return/de-digivolve protection", () => {
    expect(compiled.appFusionRequirement).toEqual([{ names: ["Coordemon", "Consulmon"], cost: 0 }]);
    expect(compiled.linkRequirement).toEqual([{ cost: 3, traits: ["Appmon"] }]);
    expect(compiled.effects.find((entry) => entry.isLinked)).toMatchObject({
      trigger: "AllTurns",
      isLinked: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "Restrict", restriction: "cannotReturnToHandOrDeck", duration: "untilOpponentTurnEnd" },
            {
              kind: "GrantStatic",
              grant: "protection",
              tokens: ["beDeDigivolved"],
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    });
  });
});
