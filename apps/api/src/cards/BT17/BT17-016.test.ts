import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT14/BT14-062.js";
import "../ST22/ST22-08.js";
import "../BT5/BT5-080.js";
import "../ST7/ST7-05.js";
import "./BT17-013.js";
import { compiled } from "./BT17-016.js";

describe("BT17-016", () => {
  it("deletes an opposing Digimon at 8000 DP or less on digivolution or attack", () => {
    for (const effect of compiled.effects?.slice(0, 2) ?? []) {
      expect(effect.actions?.[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { dp: { op: "lte", value: 8000 } } },
      });
      expect(effect.actions?.[1]).toMatchObject({
        kind: "ModifyDP",
        amount: 3000,
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
      expect(effect.actions?.[2]).toMatchObject({
        kind: "GainKeyword",
        keyword: { keyword: "Blocker" },
        duration: "untilOpponentTurnEnd",
        condition: { kind: "ifThisEffectDidNotDelete" },
      });
    }
  });

  it("gains immunity for the turn at 0 or less memory", () => {
    expect(compiled.effects?.[2]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantImmunity",
          immuneFrom: "opponentEffects",
          duration: "forTheTurn",
          condition: { kind: "memoryAtMost", value: 0 },
        },
      ],
    });
  });

  it("deletes an opposing 8000 DP Digimon through a natural evolution", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "base" }],
          hand: [{ card: "BT17-016", as: "gallant" }],
        },
        1: { battleArea: [{ card: "BT1-015", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-016");

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("gains DP and Blocker after a natural attack finds no opposing Digimon within range", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-016", as: "gallant" }] },
      1: { battleArea: [{ card: "BT1-059", as: "target" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker"));

    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(true);
  });

  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition("BT17-016")).toMatchObject({
      cardId: "BT17-016",
      nameEn: "Gallantmon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      types: ["Holy Warrior", "Royal Knight"],
      evoCosts: [{ color: "Red", level: 5, memoryCost: 3 }],
      effectText:
        "[When Digivolving] [When Attacking] Delete 1 of your opponent's Digimon with 8000 DP or less. If this effect didn't delete, this Digimon gets +3000 DP and gains ＜Blocker＞until the end of your opponent's turn.\n[Your Turn] While you have 0 or less memory, this Digimon isn't affected by your opponent's effects.",
    });
    expect(getCardDefinition("BT17-016")?.inheritedEffectText).toBeUndefined();
  });

  it("digivolves from a Lv5 Red source for its printed cost, with the source stack and bonus draw", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "base", under: ["BT1-015"] }],
          hand: [{ card: "BT17-016", as: "gallant" }, "BT1-009"],
          deck: [{ card: "BT1-010", as: "drawn" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT1-059", as: "outOfRange" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT17-016");

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-015", "BT17-013"]);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
  });

  it("refuses an illegal Lv3 digivolution source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "lv3" }],
        hand: [{ card: "BT17-016", as: "gallant" }, "BT1-010"],
        deck: ["BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 5;
    await s.ready();

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("lv3").permanentId,
      instanceId: s.inst("gallant").instanceId,
    });

    expect(result.ok).toBe(false);
    expect(s.perm("lv3").topCard.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(5);
  });

  // Q2744: the deletion is mandatory while a legal target exists — declining every optional
  // prompt still deletes, and the +3000 DP / ＜Blocker＞ branch stays off.
  it("cannot decline the deletion on attack while a legal target exists (Q2744)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-016", as: "gallant" }] },
        1: { battleArea: [{ card: "BT1-015", dp: 8000, as: "target" }], security: ["BT1-009"] },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 3;
    await s.ready();
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(targetInstanceId);
    expect(s.perm("gallant").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // Q2745: a deletion-proof target is still a legal choice, and choosing it takes the
  // "didn't delete" branch. BT14-062 Datamon is 6000 DP and can't be deleted by opponent
  // effects; the plain 8000 DP Digimon beside it proves the pick was a real choice.
  it("gains DP and Blocker when the chosen target cannot be deleted (Q2745)", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-013", as: "base" }],
          hand: [{ card: "BT17-016", as: "gallant" }, "BT1-009"],
          deck: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [
            { card: "BT14-062", as: "datamon" },
            { card: "BT1-015", dp: 8000, as: "plain" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("datamon").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("gallant").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blocker"));

    expect(s.perm("base").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("keeps the DP and Blocker grants through the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-016", as: "gallant" }],
        hand: ["BT1-009"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-059", as: "outOfRange" }],
        hand: ["BT1-009"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
        security: ["BT1-009"],
      },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker"));
    expect(s.perm("gallant").currentDP).toBe(14000);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(s.perm("gallant").currentDP).toBe(14000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(true);

    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(s.perm("gallant").currentDP).toBe(11000);
    expect(observe(s.engine).hasKeyword(s.perm("gallant"), "Blocker")).toBe(false);
  });

  // [Your Turn] While you have 0 or less memory, this Digimon isn't affected by your
  // opponent's effects. The opponent effect is ST22-08's [Security] "delete the lowest-DP
  // Digimon", reached through a real attack and security check.
  it("ignores an opponent security effect at 0 memory but not at 1 memory", async () => {
    const board = () => ({
      0: {
        battleArea: [{ card: "BT17-016", as: "gallant" }],
        hand: ["BT1-009"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-059", as: "outOfRange" }],
        security: [{ card: "ST22-08", as: "plugIn" }],
        hand: ["BT1-009"],
        deck: ["BT1-010", "BT1-011", "BT1-012"],
      },
    });

    const immune = setupEngine(board(), { autoSelectCards: true, autoAcceptOptional: true });
    immune.state.memory = 0;
    await immune.ready();
    expect(
      immune.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: immune.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => immune.state.players[1]!.security.length === 0);
    expect(immune.state.players[0]!.battleArea).toHaveLength(1);
    expect(immune.perm("gallant").topCard.cardId).toBe("BT17-016");

    const exposed = setupEngine(board(), { autoSelectCards: true, autoAcceptOptional: true });
    exposed.state.memory = 1;
    await exposed.ready();
    expect(
      exposed.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: exposed.perm("gallant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => exposed.state.players[0]!.battleArea.length === 0);
    expect(exposed.state.players[0]!.battleArea).toHaveLength(0);
    expect(exposed.state.players[0]!.trash.some(({ cardId }) => cardId === "BT17-016")).toBe(true);
  });

  // Q2746: ST7-05's inherited "gain 1 memory" resolves before ＜Retaliation＞, so memory
  // reaches 1 and the [Your Turn] immunity is gone by the time Retaliation deletes.
  // BT5-080 Zanbamon is 10000 DP, out of the [When Attacking] delete range, so the
  // "didn't delete" branch pushes Gallantmon to 14000 and it wins the battle.
  it("is deleted by Retaliation once an inherited memory gain lifts memory above 0 (Q2746)", async () => {
    const withGrowlmon = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-016", as: "gallant", under: ["ST7-05"] }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT5-080", as: "zanbamon", suspended: true }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    withGrowlmon.state.memory = 0;
    await withGrowlmon.ready();

    expect(
      withGrowlmon.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withGrowlmon.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: withGrowlmon.perm("zanbamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => withGrowlmon.state.players[0]!.battleArea.length === 0);

    expect(withGrowlmon.state.players[1]!.battleArea).toHaveLength(0);
    expect(withGrowlmon.state.players[0]!.battleArea).toHaveLength(0);
    expect(withGrowlmon.state.players[0]!.trash.some(({ cardId }) => cardId === "BT17-016")).toBe(true);
    expect(withGrowlmon.state.memory).toBe(1);

    // Comparative case: the same battle without the inherited memory gain leaves memory at
    // 0, so the immunity holds and ＜Retaliation＞ cannot delete this Digimon.
    const withoutGrowlmon = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT17-016", as: "gallant", under: ["BT17-013"] }],
          hand: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT5-080", as: "zanbamon", suspended: true }],
          security: ["BT1-009"],
          deck: ["BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    withoutGrowlmon.state.memory = 0;
    await withoutGrowlmon.ready();

    expect(
      withoutGrowlmon.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: withoutGrowlmon.perm("gallant").permanentId,
        target: { kind: "permanent", permanentId: withoutGrowlmon.perm("zanbamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => withoutGrowlmon.state.players[1]!.battleArea.length === 0);

    expect(withoutGrowlmon.state.memory).toBe(0);
    expect(withoutGrowlmon.state.players[0]!.battleArea).toHaveLength(1);
    expect(withoutGrowlmon.perm("gallant").topCard.cardId).toBe("BT17-016");
  });
});
