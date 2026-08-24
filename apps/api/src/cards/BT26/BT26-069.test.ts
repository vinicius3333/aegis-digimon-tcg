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
        {
          kind: "Delete",
          cost: { kind: "trash" },
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "any", kind: ["Digimon"] } },
        },
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
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dobermon"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("draws when this card is trashed from hand and five cards remain, but not when six remain", async () => {
    const qualifying = setupEngine({
      0: {
        hand: [{ card: "BT26-069", as: "dobermon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        deck: [{ card: "BT1-006", as: "drawn" }],
      },
    });
    await qualifying.ready();
    await advance(qualifying.engine).verb.trash([qualifying.inst("dobermon").instanceId], 0);
    expect(qualifying.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-006");

    const tooMany = setupEngine({
      0: {
        hand: [{ card: "BT26-069", as: "dobermon" }, "BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005", "BT1-006"],
        deck: [{ card: "BT1-007", as: "top" }],
      },
    });
    await tooMany.ready();
    await advance(tooMany.engine).verb.trash([tooMany.inst("dobermon").instanceId], 0);
    expect(tooMany.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-007"]);
  });

  it("may delete an own level-4 Digimon after paying the hand-trash activation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-069", as: "dobermon" },
            { card: "BT1-009", as: "ownTarget" },
          ],
          hand: [{ card: "BT1-001", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT26-060", as: "opponentHigh" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTarget").permanentId);
    const ownTargetId = s.perm("ownTarget").permanentId;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dobermon"));

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(ownTargetId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-060");
  });

  it("may decline without trashing its hand or deleting a Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-069", as: "dobermon" }], hand: [{ card: "BT1-001", as: "cost" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("dobermon"));

    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-001");
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
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
