import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { irNode } from "../../engine/testkit/irNode.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-073.js";
import "./index.js";

// BT17-073 DexDorugoramon (Digimon, Lv6, Purple/Black)
//   [Digivolve][Dorugoramon]: Cost 2  (no "in name" -> exact-name alternate route)
//   [Trash] [All Turns] When one of your [Dorugoramon] would be deleted, by digivolving it into
//     this card without paying the cost, prevent that deletion.
//   [When Digivolving] <De-Digivolve3> 1 of your opponent's Digimon. Then, if [Dorugoramon] is in
//     this Digimon's digivolution cards or this card is digivolving from the trash, delete all of
//     your opponent's Digimon with the lowest level.
//   [All Turns] [Once Per Turn] When another Digimon is deleted, you may unsuspend this Digimon.
// Q&A: Q2838 (the [Trash] effect triggers while this card is in the trash and your Dorugoramon
//   would be deleted); Q2839 (using it against a DP-becoming-0 deletion prevents that deletion,
//   but the DP reduction carries over and re-deletes if DexDorugoramon is still at 0 DP).
describe("BT17-073 DexDorugoramon", () => {
  it("matches the catalog printed text, evolution costs and the exact-name route", () => {
    expect(getCardDefinition("BT17-073")).toMatchObject({
      cardId: "BT17-073",
      nameEn: "DexDorugoramon",
      colors: ["Purple", "Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 13,
      dp: 13000,
      types: ["Undead", "X Antibody", "SoC"],
      evoCosts: [
        { color: "Purple", level: 5, memoryCost: 5 },
        { color: "Black", level: 5, memoryCost: 5 },
      ],
    });
    const printed = getCardDefinition("BT17-073")!.effectText!;
    expect(printed).toContain("[Digivolve][Dorugoramon]: Cost 2");
    expect(printed).toContain(
      "[Trash] [All Turns] When one of your [Dorugoramon] would be deleted, by digivolving it into this card without paying the cost, prevent that deletion.",
    );
    expect(printed).toContain(
      "[When Digivolving] ＜De-Digivolve3＞ 1 of your opponent's Digimon (Trash up to 3 cards from the top. You can't trash past level 3 cards). Then, if [Dorugoramon] is in this Digimon's digivolution cards or this card is digivolving from the trash, delete all of your opponent's Digimon with the lowest level.",
    );
    expect(printed).toContain(
      "[All Turns] [Once Per Turn] When another Digimon is deleted, you may unsuspend this Digimon.",
    );
    // The printed route carries no "in name", so it is modelled as an exact-name alternate.
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Dorugoramon"], cost: 2, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("replaces deletion of your Dorugoramon (exact name) with optional self digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.isFromTrash);
    expect(effect?.trigger).toBe("AllTurns");
    expect(effect?.actions).toEqual([
      expect.objectContaining({
        kind: "Replacement",
        event: "wouldBeDeleted",
        sourceFilter: { zone: "trash", controller: "mine" },
        target: {
          filter: expect.objectContaining({
            controller: "mine",
            nameOrTrait: [{ tokens: ["Dorugoramon"], match: "nameExact" }],
          }),
          count: 1,
        },
        mode: "prevent",
        digivolveFromTrash: true,
        optional: true,
        abortOnDecline: true,
      }),
    ]);
  });

  it("de-digivolves three levels and conditionally deletes lowest-level Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 3,
      stopAtLevel: 3,
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "Delete",
      target: { filter: { controller: "opponent", superlative: "lowestLevel" }, count: "all" },
      condition: {
        kind: "anyOf",
        conditions: [
          { kind: "selfHasInDigivolutionCards", nameOrTrait: [{ tokens: ["Dorugoramon"], match: "nameExact" }] },
          { kind: "digivolvedFromZone", zone: "trash" },
        ],
      },
    });
  });

  it("unsuspends itself once per turn when another Digimon is deleted", () => {
    const effect = compiled.effects.find((entry) => entry.frequency === "OncePerTurn");
    expect(effect).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn" });
    expect(effect?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
      actions: [{ kind: "Unsuspend", target: { isSelf: true } }],
    });
    expect(irNode(effect?.actions[0])?.sourceFilter).not.toHaveProperty("controller");
    expect(irNode(effect?.actions[0])?.sourceFilter).not.toHaveProperty("controllerDefault");
  });

  it("digivolves from a Dorugoramon base for 2, de-digivolves and deletes the lowest level", async () => {
    const bias: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-064", dp: 12000, as: "base" }],
          hand: [
            { card: "BT17-073", as: "dexDorugoramon" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "AD1-004", dp: 12000, as: "deTarget", under: [{ card: "AD1-002", as: "deSource" }] },
            { card: "BT1-009", dp: 3000, as: "lowLevel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: bias },
    );
    s.state.memory = 2;
    await s.ready();
    bias.push(s.perm("deTarget").topCard.instanceId);
    const dexId = s.inst("dexDorugoramon").instanceId;
    const drawnId = s.inst("drawn").instanceId;
    const lowLevelId = s.perm("lowLevel").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: dexId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === lowLevelId));

    // Alternate exact-name route paid 2 (2 -> 0), Dorugoramon sits beneath, bonus draw landed.
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.instanceId).toBe(dexId);
    expect(s.perm("base").stack.some((card) => card.cardId === "BT16-064")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    // De-Digivolve3 peeled the L6 top off deTarget, promoting the L5 source.
    expect(s.perm("deTarget").topCard.cardId).toBe("AD1-002");
    // Dorugoramon in the digivolution cards satisfies the condition; the lowest-level (L3) died.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowLevelId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("de-digivolves but does not delete when neither Dorugoramon underneath nor from trash", async () => {
    const bias: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-081", dp: 7000, as: "base" }],
          hand: [
            { card: "BT17-073", as: "dexDorugoramon" },
            { card: "BT1-011", as: "spare" },
          ],
          deck: [{ card: "BT1-012", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "AD1-004", dp: 12000, as: "deTarget", under: [{ card: "AD1-002", as: "deSource" }] },
            { card: "BT1-009", dp: 3000, as: "lowLevel" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: bias },
    );
    s.state.memory = 5;
    await s.ready();
    bias.push(s.perm("deTarget").topCard.instanceId);
    const dexId = s.inst("dexDorugoramon").instanceId;
    const lowLevelId = s.perm("lowLevel").permanentId;

    // Normal Lv5-Purple evoCost route (memory 5), from the battle area, base is not Dorugoramon.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: dexId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "AD1-002" || s.perm("deTarget").topCard.cardId === "AD1-002");

    expect(s.state.memory).toBe(0);
    // De-Digivolve still fired.
    expect(s.perm("deTarget").topCard.cardId).toBe("AD1-002");
    // Condition unmet -> the lowest-level Digimon survives.
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === lowLevelId)).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses a near-name DexDorugoramon base and an off-route Lv3 base on both routes", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT9-081", dp: 13000, as: "nearName" },
          { card: "BT1-013", dp: 5000, as: "offRoute" },
        ],
        hand: [{ card: "BT17-073", as: "dexDorugoramon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();
    const dexId = s.inst("dexDorugoramon").instanceId;
    const nearId = s.perm("nearName").topCard.instanceId;

    // "DexDorugoramon" contains "Dorugoramon" as a substring but is not the exact name, and it is
    // Lv6, so it satisfies neither the exact-name route nor the Lv5 evoCost. Under the substring
    // `names` form it would wrongly pass the cost-2 route.
    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("nearName").permanentId,
          instanceId: dexId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }
    // An off-route Lv3 base is refused on both routes too.
    for (const useAlternateCost of [true, false]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("offRoute").permanentId,
          instanceId: dexId,
          useAlternateCost,
        }),
      ).not.toEqual({ ok: true });
    }

    expect(s.perm("nearName").topCard.instanceId).toBe(nearId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([dexId]);
    expect(s.state.memory).toBe(5);
  });

  it("unsuspends after an opponent's Digimon is deleted in a natural battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-073", suspended: true, as: "dexDorugoramon" }] },
        1: {
          battleArea: [{ card: "BT1-009", dp: 1000, as: "opposingDigimon" }],
          hand: [{ card: "BT1-011", as: "spare" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("opposingDigimon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dexDorugoramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("dexDorugoramon").isSuspended);

    expect(s.perm("dexDorugoramon").isSuspended).toBe(false);
  });

  it("does not unsuspend a second time in the same turn (once per turn)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT17-073", suspended: true, as: "dexDorugoramon" }] },
        1: {
          battleArea: [
            { card: "BT1-011", dp: 1000, as: "attackerOne" },
            { card: "BT1-013", dp: 5000, as: "attackerTwo" },
          ],
          hand: [{ card: "BT1-012", as: "spare" }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    const dexPermId = s.perm("dexDorugoramon").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerOne").permanentId,
        target: { kind: "permanent", permanentId: dexPermId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("dexDorugoramon").isSuspended);
    expect(s.perm("dexDorugoramon").isSuspended).toBe(false);

    // Plumbing: re-suspend between two real battles so the second attack has a legal target.
    await advance(s.engine).verb.suspend([dexPermId]);
    expect(s.perm("dexDorugoramon").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attackerTwo").permanentId,
        target: { kind: "permanent", permanentId: dexPermId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.topCard.cardId === "BT1-013"));

    // The once-per-turn allowance is spent, so the second deletion leaves it suspended.
    expect(s.perm("dexDorugoramon").isSuspended).toBe(true);
  });

  it("digivolves from trash to prevent a natural Dorugoramon deletion (Q2838)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT16-064", dp: 10000, suspended: true, as: "dorugoramon" }],
          trash: [{ card: "BT17-073", as: "dexDorugoramon" }],
        },
        1: { battleArea: [{ card: "BT17-072", dp: 13000, as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("dorugoramon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT17-073"));

    expect(s.perm("dorugoramon").topCard.cardId).toBe("BT17-073");
    expect(s.perm("dorugoramon").stack.some((card) => card.cardId === "BT16-064")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT17-073")).toBe(false);
  });
});
