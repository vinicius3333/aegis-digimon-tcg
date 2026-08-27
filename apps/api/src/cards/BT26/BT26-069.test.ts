import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-069.js";
import "../index.js";

describe("BT26-069 Dobermon", () => {
  it("models hand-trash draw, hand-trash deletion cost, and inherited Titan evolution", () => {
    expect(getCardDefinition("BT26-069")).toMatchObject({
      nameEn: "Dobermon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 5,
      dp: 6000,
      types: ["Dark Animal", "Titan", "TS"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
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
          target: {
            filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
          },
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

  it("uses the cost-2 TS evolution path from a differently colored level 3", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-008", as: "redTsBase" }],
        hand: [{ card: "BT26-069", as: "dobermon" }],
        deck: ["BT1-001"],
      },
    });
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redTsBase").permanentId,
        instanceId: s.inst("dobermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("redTsBase").topCard.cardId === "BT26-069");

    expect(s.state.memory).toBe(0);
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

  it("trashes a hand card to delete a level-4-or-lower Digimon when digivolving", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-008", as: "base" }],
          hand: [{ card: "BT26-069", as: "dobermon" }, { card: "BT1-001", as: "cost" }],
          deck: ["BT1-002"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dobermon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("base").topCard.cardId).toBe("BT26-069");
    expect(s.state.memory).toBe(2);
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

  it("Q7091 draws only once when two copies are trashed together and leave five cards", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "BT26-069", as: "first" },
          { card: "BT26-069", as: "second" },
          "BT1-001",
          "BT1-002",
          "BT1-003",
          "BT1-004",
          "BT1-005",
        ],
        deck: ["BT1-006", "BT1-007"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.trash([s.inst("first").instanceId, s.inst("second").instanceId], 0);

    expect(s.state.players[0]!.hand).toHaveLength(6);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("may delete an own level-4 Digimon after paying the hand-trash activation", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-069", as: "dobermon" },
            { card: "BT1-014", as: "ownTarget" },
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

  it("digivolves its Titan host when an opponent's effect trashes its controller's hand", async () => {
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

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 0, byEffectSeat: 1 });
    await settle(() => s.perm("host").topCard.cardId === "P-209");

    expect(s.state.memory).toBe(0);
  });

  it("does not trigger its inherited evolution when the opponent's hand is trashed", async () => {
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

    await advance(s.engine).fireSubTrigger("whenHandTrashed", { handTrashedSeat: 1, byEffectSeat: 0 });

    expect(s.perm("host").topCard.cardId).toBe("BT26-074");
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toContain("P-209");
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
  });

  it("Q7090 does not retroactively trigger Alliance after evolving during an attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT24-075",
              as: "attacker",
              under: ["BT26-069", "BT26-064"],
            },
            { card: "BT1-009", as: "alliancePartner" },
          ],
          trash: [{ card: "P-209", as: "titamon" }],
          deck: [{ card: "BT1-010", as: "drawnAndTrashed" }],
        },
        1: { security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("attacker").topCard.cardId === "P-209" &&
        s.state.players[1]!.security.length < 3 &&
        s.state.pendingDecision === undefined,
    );

    expect(s.perm("alliancePartner").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("drawnAndTrashed").instanceId,
    );
  });
});
