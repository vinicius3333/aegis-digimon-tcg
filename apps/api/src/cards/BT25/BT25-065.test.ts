import { digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_065 } from "./BT25-065.js";
import "../index.js";

const CARD_ID = "BT25-065";

describe("BT25-065 Monodramon", () => {
  it("matches the complete catalog, TS alternate evolution, and all three effect clauses", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      cardId: CARD_ID,
      set: "BT25",
      nameEn: "Monodramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 4000,
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Vaccine"],
      types: ["Mini Dragon", "Iliad", "TS"],
      rarity: "C",
      maxCountInDeck: 4,
      dualEffect: "Monodramon",
    });
    const card = getCardDefinition(CARD_ID)!;
    expect(card.effectText?.replace(/\u00a0/g, " ")).toContain("[All Turns] When this Digimon suspends, ＜Draw 1＞");
    expect(card.effectText?.replace(/\u00a0/g, " ")).toContain(
      "[Your Turn] When this Digimon attacks a player, lose 2 memory.",
    );
    expect(card.inheritedEffectText).toBe("[All Turns] This Digimon gets +1000 DP.");
    expect(digivolutionRequirementsFor(CARD_ID)).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });

    expect(BT25_065.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "AllTurns",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenSuspended",
              sourceFilter: { isSelfRef: true },
              actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
            },
          ],
        }),
        expect.objectContaining({
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenAttacking",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "GainMemory",
                  amount: -2,
                  condition: { kind: "attackTargetsPlayer", raw: "this Digimon attacks a player" },
                },
              ],
            },
          ],
        }),
        expect.objectContaining({
          trigger: "AllTurns",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 1000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("alternate-digivolves from a level 2 TS for zero", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-005", as: "tsBase" }],
        hand: [{ card: CARD_ID, as: "monodramon" }],
      },
    });
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tsBase").permanentId,
        instanceId: s.inst("monodramon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tsBase").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(2);
    expect(s.perm("tsBase").stack.map((card) => card.cardId)).toContain("BT25-005");
    expect(s.perm("tsBase").topCard?.cardId).toBe(CARD_ID);
  });

  it("applies inherited +1000 DP when Monodramon is in a realistic evolution stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-013", dp: 4000, as: "host", under: [CARD_ID] }],
      },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("draws only when this physical copy suspends, including on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "monodramon" },
          { card: "BT1-009", as: "other" },
        ],
        deck: ["BT1-001", "BT1-002"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("monodramon").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);

    await advance(s.engine).verb.unsuspend([s.perm("monodramon").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("loses 2 memory only when this Monodramon attacks a player during its turn", async () => {
    const valid = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "monodramon" }] },
      1: { security: ["BT1-010"] },
    });
    valid.state.memory = 5;
    expect(
      valid.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: valid.perm("monodramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(valid.engine).isAttacking());
    expect(valid.state.memory).toBe(3);

    const otherAttacker = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "monodramon" },
          { card: "BT1-009", as: "other" },
        ],
      },
      1: { security: ["BT1-010"] },
    });
    otherAttacker.state.memory = 5;
    expect(
      otherAttacker.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: otherAttacker.perm("other").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(otherAttacker.engine).isAttacking());
    expect(otherAttacker.state.memory).toBe(5);
  });

  it("does not lose memory for an attack on a Digimon or outside its Your Turn window", async () => {
    const digimonTarget = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "monodramon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    digimonTarget.state.memory = 5;
    expect(
      digimonTarget.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: digimonTarget.perm("monodramon").permanentId,
        target: { kind: "permanent", permanentId: digimonTarget.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(digimonTarget.engine).isAttacking());
    expect(digimonTarget.state.memory).toBe(5);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "monodramon" }] } });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 5;
    await opponentTurn.ready();
    await advance(opponentTurn.engine).fireSubTrigger("whenAttacking", {
      attackerPermanentId: opponentTurn.perm("monodramon").permanentId,
    });
    expect(opponentTurn.state.memory).toBe(5);
  });
});
