import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-052.js";
import "../index.js";

describe("EX4-052 Fake Agumon Expert", () => {
  it("registers its official identity and same-level deletion watcher", () => {
    expect(getCardDefinition("EX4-052")).toMatchObject({
      cardId: "EX4-052",
      nameEn: "Fake Agumon Expert",
      colors: ["Purple"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Dinosaur"],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [{ kind: "Draw", amount: 2 }],
          cost: { kind: "trash", target: { filter: { levelEqTriggerSource: true } } },
        },
      ],
    });
  });

  it("digivolves from a purple level-2 Digi-Egg for 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-006", as: "base" }],
        hand: [{ card: "EX4-052", as: "fakeExpert" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("fakeExpert").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX4-052");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT10-006"]);
  });

  it("publicly pays a same-level Digimon hand cost before drawing two", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [
            { card: "BT1-009", as: "sameLevelCost" },
            { card: "BT4-005", as: "levellessCost" },
          ],
          deck: [{ card: "BT1-010" }, { card: "BT1-012" }, { card: "BT1-013" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length >= 3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("sameLevelCost").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levellessCost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(3);
  });

  it("does not pay the cost or draw with only a different-level hand card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [{ card: "EX4-016", as: "wrongLevel" }],
          deck: ["BT1-010", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX4-016"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("Q3494 does not match a level-less Calumon to another Calumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [{ card: "EX2-045", as: "ownCalumon" }],
          deck: ["BT1-010", "BT1-012"],
        },
        1: { battleArea: [{ card: "EX2-045", as: "opponentCalumon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("opponentCalumon").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX2-045"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("does not activate during the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [{ card: "BT1-009", as: "sameLevel" }],
          deck: ["BT1-010", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("opponentDigimon").permanentId], "byEffect");

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("pays and draws only once per turn across two qualifying deletions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX4-052", as: "host" }],
          hand: [
            { card: "BT1-009", as: "firstCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
          deck: ["BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "firstOpponent" },
            { card: "BT1-010", as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("firstOpponent").permanentId], "byEffect");
    await settle(() => s.state.players[0]!.hand.length === 3);
    await advance(s.engine).verb.deletePermanent([s.perm("secondOpponent").permanentId], "byEffect");
    await settle();

    expect(s.state.players[0]!.hand).toHaveLength(3);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
