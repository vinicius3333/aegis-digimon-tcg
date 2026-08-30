import { describe, expect, it } from "vitest";
import { hasRegisteredCompiledCard, runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT2-081.js";
import "./BT2-082.js";
import "./BT2-083.js";
import "./BT2-084.js";
import "./BT2-085.js";
import "./BT2-086.js";
import "./BT2-087.js";
import "./BT2-088.js";
import "./BT2-089.js";
import "./BT2-090.js";

const CARD_IDS = [
  "BT2-081",
  "BT2-082",
  "BT2-083",
  "BT2-084",
  "BT2-085",
  "BT2-086",
  "BT2-087",
  "BT2-088",
  "BT2-089",
  "BT2-090",
] as const;

describe("BT2-081 through BT2-090 IR coverage", () => {
  it("registers every range card through complete compiled IR", () => {
    for (const cardId of CARD_IDS) {
      expect(hasRegisteredCompiledCard(cardId), "direct compiled registration for " + cardId).toBe(true);
      expect(runtimeCompiledCard(cardId), "runtime IR for " + cardId).toMatchObject({
        coverage: "full",
        residual: [],
      });
    }
  });

  it("retains the printed contracts and audited direct semantics", () => {
    expect(runtimeCompiledCard("BT2-081")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          actions: [
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["trash"],
              optional: true,
              suppressOnPlayEffects: true,
              target: {
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levels: [3],
                },
                count: 1,
              },
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-082")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            expect.objectContaining({
              kind: "Replacement",
              event: "wouldBeDeleted",
              mode: "prevent",
              leaveCause: "byBattle",
              sourceFilter: { isSelfRef: true },
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-083")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenDigivolving",
          actions: expect.arrayContaining([expect.objectContaining({ kind: "Return", to: "deckBottom" })]),
        }),
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "PlayWithoutCost",
              from: ["trash"],
              condition: expect.objectContaining({ kind: "selfHadDigivolutionCards" }),
            }),
          ]),
        }),
      ]),
    );
    expect(runtimeCompiledCard("BT2-083")?.effects.flatMap((effect) => effect.actions)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "Trash" })]),
    );

    expect(runtimeCompiledCard("BT2-084")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Red"] },
              actions: [
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
                  amount: 2000,
                  duration: "forTheTurn",
                  condition: { kind: "attackTargetsPlayer" },
                }),
              ],
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-085")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenDigivolutionTrashed",
              sourceFilter: { controller: "opponent" },
              actions: [expect.objectContaining({ kind: "GainMemory", amount: 1, optional: true })],
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-086")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] },
              actions: [
                expect.objectContaining({
                  kind: "ModifyDP",
                  target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
                  amount: 1000,
                  duration: "forTheTurn",
                }),
              ],
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Vee"], match: "name" }],
                  },
                  count: 1,
                  to: "hand",
                },
              ],
              rest: "deckBottom",
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-087")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "GainMemory",
              amount: 1,
              condition: expect.objectContaining({
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
              }),
            }),
          ]),
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-088")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
                },
                count: "all",
              },
              keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            expect.objectContaining({
              kind: "CostModifier",
              costType: "digivolve",
              amount: 1,
              target: { filter: { zone: "battleArea", controller: "mine", kind: ["Digimon"] } },
              into: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Tyrannomon"], match: "name" }],
              },
              restriction: "suspendThisTamer",
              optional: true,
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-089")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [
            expect.objectContaining({
              kind: "SetMemory",
              value: 3,
              condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
            }),
          ],
        }),
        expect.objectContaining({
          trigger: "OpponentsTurn",
          actions: [
            expect.objectContaining({
              kind: "ModifyDP",
              target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Black"] }, count: "all" },
              amount: 1000,
              duration: "permanent",
            }),
          ],
        }),
      ]),
    );

    expect(runtimeCompiledCard("BT2-090")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "StartOfYourTurn",
          actions: [expect.objectContaining({ kind: "SetMemory", value: 3 })],
        }),
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "Return",
              to: "hand",
              target: {
                filter: { zone: "trash", controller: "mine", kind: ["Digimon", "Option"], colors: ["Purple"] },
                count: 1,
              },
            }),
          ],
        }),
      ]),
    );
  });
});
