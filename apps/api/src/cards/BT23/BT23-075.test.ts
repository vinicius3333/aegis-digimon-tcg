import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-075.js";

describe("BT23-075 Eater EDEN", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-075")).toMatchObject({
      cardId: "BT23-075",
      nameEn: "Eater EDEN",
      colors: ["White"],
      kinds: ["Digimon"],
      playCost: 10,
      dp: 12000,
      evoCosts: [],
      forms: ["Eater"],
      attributes: ["-"],
      types: ["CS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Eater Legion"], cost: 3, isAlternate: true }]);
  });

  it("returns exactly an opposing cost-6-or-lower Digimon or Tamer to deck bottom", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-075", as: "eden" }] },
      1: {
        battleArea: [
          { card: "BT23-081", as: "lowTamer" },
          { card: "BT23-101", as: "highDigimon" },
        ],
      },
    });
    const lowId = s.perm("lowTamer").permanentId;
    const highId = s.perm("highDigimon").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnPlay, { subjectPermanentId: s.perm("eden").permanentId });

    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === highId)).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT23-081");
  });

  it("raises the live return ceiling by each Mother Eater digivolution card", async () => {
    const s = setupEngine({
      0: {
        breeding: {
          card: "BT22-007",
          as: "mother",
          under: ["BT23-073", "BT23-073"],
        },
        battleArea: [{ card: "BT23-075", as: "eden" }],
      },
      1: { battleArea: [{ card: "BT23-074", as: "cost8" }] },
    });
    const targetId = s.perm("cost8").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.WhenDigivolving, { subjectPermanentId: s.perm("eden").permanentId });

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === targetId)).toBe(false);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT23-074");
  });

  it("plays an Eater for free before leaving through an opponent effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden" }],
          hand: [{ card: "BT23-073", as: "eater" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const edenId = s.perm("eden").permanentId;
    const eaterId = s.inst("eater").instanceId;
    await advance(s.engine).verb.deletePermanent([edenId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === eaterId)).toBe(true);
  });

  it("may refuse the Eater play and still leaves the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-075", as: "eden" }],
          hand: [{ card: "BT23-073", as: "eater" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const edenId = s.perm("eden").permanentId;
    const eaterId = s.inst("eater").instanceId;
    await advance(s.engine).verb.deletePermanent([edenId], "byEffect");

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === edenId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === eaterId)).toBe(true);
  });

  it("deletes exactly one opposing lowest-play-cost Digimon at the opponent turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT23-075", as: "eden" }] },
      1: {
        battleArea: [
          { card: "BT1-009", as: "lowest" },
          { card: "BT23-074", as: "higher" },
        ],
      },
    });
    s.state.turnSeat = 1;
    const lowestId = s.perm("lowest").permanentId;
    const higherId = s.perm("higher").permanentId;
    await (
      s.engine as unknown as {
        fireTiming(timing: EffectTiming, trigger: Record<string, unknown>): Promise<void>;
      }
    ).fireTiming(EffectTiming.OnEndTurn, {});

    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === lowestId)).toBe(false);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === higherId)).toBe(true);
  });

  it("raises the return ceiling for Mother Eater cards in the breeding area", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({ kind: "Return", to: "deckBottom", target: { count: 1 } });
      expect(action.playCostCeiling).toMatchObject({
        base: 6,
        raise: 1,
        per: 1,
        unit: "digivolutionCardsOfFiltered",
        filter: { zone: "breeding", nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }] },
      });
    }
  });

  it("limits the leave replacement and end-of-opponent-turn deletion correctly", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { isSelfRef: true },
    });
    const end = compiled.effects.find((entry) => entry.trigger === "EndOfOpponentsTurn") as any;
    expect(end.frequency).toBe("OncePerTurn");
    expect(end.actions[0].target.filter.superlative).toBe("lowestPlayCost");
  });
});
