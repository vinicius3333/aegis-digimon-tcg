import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-062.js";

describe("BT23-062 Dracmon", () => {
  it("trashes exactly one matching hand card to gain 1 memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-062" }],
          hand: [
            { card: "BT23-063", as: "matching" },
            { card: "BT1-009", as: "plain" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const matchingId = s.inst("matching").instanceId;
    const plainId = s.inst("plain").instanceId;
    const before = s.state.memory;
    await (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
      EffectTiming.OnStartMainPhase,
    );
    expect(s.state.memory).toBe(before + 1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === matchingId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === plainId)).toBe(true);
  });

  it("gains 1 memory by trashing a matching card from hand, without an optional decline", () => {
    const action = (compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase") as any).actions[0];
    expect(action).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      cost: {
        kind: "trash",
        target: {
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Undead", "Dark Animal", "CS"], match: "trait" }],
          },
          count: 1,
        },
      },
      abortOnDecline: true,
    });
    expect(action.optional).toBeUndefined();
  });

  it("has an inherited once-per-turn trash digivolution into an Undead or Dark Animal Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking") as any;
    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          optional: true,
          into: { nameOrTrait: [{ tokens: ["Undead", "Dark Animal"], match: "trait" }] },
        },
      ],
    });
  });

  it("requires a level 2 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["CS"], cost: 0, isAlternate: true }]);
  });
});
