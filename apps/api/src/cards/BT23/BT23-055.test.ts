import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-055.js";

/**
 * Public route to an Option card in the battle area: BT23-100 Hudie Net Cafe's
 * [Main] "＜Draw 1＞ Then, place this card in the battle area". Per KB Q5320 that
 * placement is the only way an Option card is ever in the battle area, so it is
 * also the only legal fixture for Cyberdramon's prevention cost.
 */
async function placeNetCafe(s: EngineSetup, alias: string): Promise<string> {
  const instanceId = s.inst(alias).instanceId;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId })).toEqual({ ok: true });
  await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId));
  expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === instanceId)).toBe(true);
  return instanceId;
}

function battleAreaCardIds(s: EngineSetup, seat: 0 | 1): (string | undefined)[] {
  return s.state.players[seat]!.battleArea.map((permanent) => permanent.topCard?.cardId);
}

describe("BT23-055 Cyberdramon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-055")).toMatchObject({
      cardId: "BT23-055",
      nameEn: "Cyberdramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [{ color: "Black", level: 4, memoryCost: 3 }],
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Cyborg", "Hudie", "CS"],
      effectText:
        "[Digivolve] Lv.4 w/[CS]\u00a0trait: Cost 3 \n\n[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with a play cost of 5 or less.\n[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by trashing 1 of your Option cards in the battle area, it doesn't leave.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon with [Cyberdramon] or [Justimon]\u00a0in its name or the [CS]\u00a0trait would leave the battle area, by trashing 1 of your Option cards in the battle area, it doesn't leave.",
    });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("deletes an opposing play-cost-5 Digimon on play and leaves the cost-6 one", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-055", as: "cyber" }], deck: ["BT1-009", "BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "cost5" },
            { card: "BT1-019", as: "cost6" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const cost5Id = s.perm("cost5").permanentId;
    const cost5InstanceId = s.inst("cost5").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyber").instanceId })).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cost5Id));

    expect(battleAreaCardIds(s, 1)).toEqual(["BT1-019"]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([cost5InstanceId]);
    expect(battleAreaCardIds(s, 0)).toEqual(["BT23-055"]);
    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("cannot reach the opponent's breeding Digimon with the On Play deletion", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT23-055", as: "cyber" }], deck: ["BT1-009", "BT1-010"] },
        1: { breeding: { card: "BT1-010", as: "inBreeding" } },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const breedingInstanceId = s.inst("inBreeding").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyber").instanceId })).toEqual({ ok: true });
    await settle(() => battleAreaCardIds(s, 0).includes("BT23-055"));

    expect(s.state.players[1]!.breeding?.topCard?.instanceId).toBe(breedingInstanceId);
    expect(s.state.players[1]!.trash).toHaveLength(0);
    assertNoLoudGap(s);
  });

  it("digivolves for 3 from a black level-4 on its printed route and deletes when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST5-06", as: "base" }],
          hand: [{ card: "BT23-055", as: "cyber" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-020", as: "cost5" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const baseInstanceId = s.inst("base").instanceId;
    const cost5Id = s.perm("cost5").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cyber").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === cost5Id));

    expect(s.state.memory).toBe(2);
    expect(s.perm("cyber").topCard?.cardId).toBe("BT23-055");
    expect(s.perm("cyber").stack.map((card) => card.instanceId)).toEqual([baseInstanceId]);
    // Digivolving draws 1: the played card left the hand and the draw replaced it.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
    assertNoLoudGap(s);
  });

  it("digivolves for 3 from an off-color level-4 CS card on both cost branches", async () => {
    for (const useAlternateCost of [false, true]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-041", as: "base" }],
            hand: [{ card: "BT23-055", as: "cyber" }],
            deck: ["BT1-009", "BT1-010"],
          },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 5;
      await s.ready();

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("cyber").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.memory === 2);

      // The printed [Digivolve] Lv.4 w/[CS] alternate costs the same 3 as the black
      // Lv.4 route, so neither branch is cheaper — both must charge exactly 3.
      expect(s.state.memory).toBe(2);
      expect(s.perm("cyber").topCard?.cardId).toBe("BT23-055");
    }
  });

  it("rejects a level-4 source that is neither black nor CS", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "base" }], hand: [{ card: "BT23-055", as: "cyber" }] },
    });
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("cyber").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(battleAreaCardIds(s, 0)).toEqual(["BT1-037"]);
  });

  it("survives a lost battle by trashing 1 of its controller's placed Option cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT23-100", as: "spareOption" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "big", suspended: true }], security: [{ card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");
    const spareOptionId = await placeNetCafe(s, "spareOption");
    const cyberId = s.perm("cyber").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: cyberId,
        target: { kind: "permanent", permanentId: s.perm("big").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // 7000 DP into 10000 DP: Cyberdramon loses and would leave, and pays instead.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === spareOptionId)).toBe(
      true,
    );
    expect(battleAreaCardIds(s, 1)).toEqual(["BT1-024"]);
    assertNoLoudGap(s);
  });

  it("does not count an Option card in the hand or trash as being in the battle area (Q5320)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [{ card: "BT23-100", as: "inHand" }],
          trash: [{ card: "BT23-100", as: "inTrash" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-024", as: "big", suspended: true }], security: [{ card: "BT1-011" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const cyberId = s.perm("cyber").permanentId;
    const handOptionId = s.inst("inHand").instanceId;
    const trashOptionId = s.inst("inTrash").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: cyberId,
        target: { kind: "permanent", permanentId: s.perm("big").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId)).toBe(false);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([handOptionId]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === trashOptionId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("prevents leaving only once per turn even with a second Option still placed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [{ card: "BT23-100", as: "option" }, { card: "BT23-100", as: "spareOption" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "firstAttacker" },
            { card: "BT1-042", as: "secondAttacker" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");
    const spareOptionId = await placeNetCafe(s, "spareOption");
    const cyberId = s.perm("cyber").permanentId;

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    // The Active phase unsuspends the board, so arm the state the opponent needs to
    // declare an attack on Cyberdramon after their Main phase is authoritatively open.
    s.perm("cyber").isSuspended = true;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "permanent", permanentId: cyberId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "permanent", permanentId: cyberId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId));

    // The once-per-turn use is spent, so the second removal resolves with the spare
    // Option untouched — the refusal is the frequency gate, not a missing cost.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === spareOptionId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(["BT23-100", "BT23-055"]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    assertNoLoudGap(s);
  });

  it("regains the prevention on the following turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-055", as: "cyber" }],
          hand: [{ card: "BT23-100", as: "option" }, { card: "BT23-100", as: "spareOption" }, "BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }],
        },
        1: {
          battleArea: [
            { card: "BT1-024", as: "blocker", suspended: true },
            { card: "BT1-042", as: "attacker" },
          ],
          hand: ["BT1-009"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
          security: [{ card: "BT1-011" }, { card: "BT1-011" }, { card: "BT1-011" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");
    const spareOptionId = await placeNetCafe(s, "spareOption");
    const cyberId = s.perm("cyber").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: cyberId,
        target: { kind: "permanent", permanentId: s.perm("blocker").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 5;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    s.perm("cyber").isSuspended = true;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: cyberId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === spareOptionId));

    // A new turn, a fresh use: the second removal is prevented too, at the cost of
    // the second placed Option.
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === cyberId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId, spareOptionId]);
    expect(battleAreaCardIds(s, 0)).toEqual(["BT23-055"]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    assertNoLoudGap(s);
  });

  it("protects the Digimon carrying it as a digivolution card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-057", as: "host", under: ["BT23-055"] }],
          hand: [{ card: "BT23-100", as: "option" }],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");
    const hostId = s.perm("host").permanentId;

    // No public intent deletes an own Digimon outright, so the effect-driven delete
    // primitive stands in for an opponent removal effect here.
    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);
  });

  it("grants the host exactly one prevention per turn, not one per printed and inherited clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-057", as: "host", under: ["BT23-055"] }],
          hand: [
            { card: "BT23-100", as: "option" },
            { card: "BT23-100", as: "spareOption" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");
    const spareOptionId = await placeNetCafe(s, "spareOption");
    const hostId = s.perm("host").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(0);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([optionId]);

    expect(await advance(s.engine).verb.deletePermanent([hostId], "byEffect")).toBe(1);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === spareOptionId)).toBe(
      true,
    );
  });

  it("does not protect another CS Digimon or the opponent's CS Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-057", as: "host", under: ["BT23-055"] },
            { card: "BT23-053", as: "otherCs" },
          ],
          hand: [{ card: "BT23-100", as: "option" }],
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT23-053", as: "opponentCs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const optionId = await placeNetCafe(s, "option");

    // "When THIS Digimon ... would leave": the inherited clause guards its own host only.
    expect(await advance(s.engine).verb.deletePermanent([s.perm("otherCs").permanentId], "byEffect")).toBe(1);
    expect(await advance(s.engine).verb.deletePermanent([s.perm("opponentCs").permanentId], "byEffect")).toBe(1);

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === optionId)).toBe(true);
    expect(battleAreaCardIds(s, 0)).toEqual(["BT23-057", "BT23-100"]);
    expect(battleAreaCardIds(s, 1)).toEqual([]);
  });

  it("compiles both deletion timings and both prevention clauses", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 5 }, count: 1 },
      });
    }

    const preventionCost = {
      kind: "trash",
      target: {
        filter: { zone: "battleArea", controller: "mine", kind: ["Option"], placedInBattleAreaByEffect: true },
        count: 1,
      },
    };
    const printed = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited !== true);
    expect(printed).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "Replacement", event: "wouldLeavePlay", sourceFilter: { isSelfRef: true }, cost: preventionCost },
      ],
    });

    const inherited = compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.isInherited === true);
    expect(inherited).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Cyberdramon", "Justimon"], match: "name" },
              { tokens: ["CS"], match: "trait" },
            ],
          },
          cost: preventionCost,
        },
      ],
    });
  });
});
