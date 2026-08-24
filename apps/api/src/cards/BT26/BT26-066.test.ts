import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-066.js";
import "../index.js";

describe("BT26-066 Salamon", () => {
  it("preserves normal evolution requirements and both Titan trash-digivolve windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourMainPhase",
          actions: [
            expect.objectContaining({
              kind: "Digivolve",
              from: ["trash"],
              payCost: true,
              useAlternateCost: true,
              costDelta: -2,
              optional: true,
              condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 5 },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenHandTrashed",
              actions: [
                expect.objectContaining({
                  kind: "Digivolve",
                  from: ["trash"],
                  payCost: true,
                  useAlternateCost: true,
                  costDelta: -1,
                  optional: true,
                  target: expect.objectContaining({
                    filter: expect.objectContaining({ nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] }),
                  }),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    expect(JSON.stringify(compiled)).not.toContain("ignoreRequirements");
  });

  it("publicly digivolves a Titan into a Titan from trash when the hand has five or fewer cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-042", as: "titanHost" },
            { card: "BT26-066", as: "salamon" },
          ],
          trash: [{ card: "BT26-059", as: "trashTitan" }],
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("salamon"));

    expect(s.perm("titanHost").topCard.cardId).toBe("BT26-059");
    expect(s.state.memory).toBe(3);
  });

  it("allows the inherited trash evolution only when its host has the Titan trait", async () => {
    const titan = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-074", as: "host", under: ["BT26-066"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    titan.state.memory = 2;
    await titan.ready();
    await advance(titan.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(titan.perm("host").topCard.cardId).toBe("P-209");
    expect(titan.state.memory).toBe(0);

    const nonTitan = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-031", as: "host", under: ["BT26-066"] }],
          trash: [{ card: "P-209", as: "titamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    nonTitan.state.memory = 10;
    await nonTitan.ready();
    await advance(nonTitan.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 0 });
    expect(nonTitan.perm("host").topCard.cardId).toBe("BT26-031");
    expect(nonTitan.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-209");
  });
});
