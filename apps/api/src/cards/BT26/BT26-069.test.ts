import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-069.js";

describe("BT26-069 Dobermon", () => {
  it("models hand-trash draw, hand-trash deletion cost, and inherited Titan evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Draw",
              amount: 1,
              condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 },
            },
          ],
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        { kind: "Delete", cost: { kind: "trash" }, target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toBeDefined();
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          actions: [
            {
              kind: "Digivolve",
              from: ["trash"],
              payCost: true,
              costDelta: -1,
              optional: true,
              target: { filter: { nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] } },
            },
          ],
        },
      ],
    });
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("trashes a hand card to delete a level-4-or-lower Digimon on play", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-069", as: "dobermon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dobermon"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("digivolves its Titan host from trash when its controller's hand is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-069"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    await settle(() => s.perm("host").topCard.cardId === "P-209");

    expect(s.state.memory).toBe(0);
  });
});
