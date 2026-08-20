import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-075.js";

describe("BT23-075 Eater EDEN", () => {
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
