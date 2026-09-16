import { type CardDefinition, CardColor, CardKind, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-050.js";

function nearName(nameEn: string): CardDefinition {
  return {
    cardId: `TEST-${nameEn}`,
    set: "TEST",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: [CardColor.Yellow, CardColor.Black, CardColor.Blue],
    level: 3,
    playCost: 3,
    dp: 3000,
    evoCosts: [],
    forms: ["Rookie"],
    attributes: ["Free"],
    types: ["Mammal"],
    maxCountInDeck: 4,
  };
}

const ONE_PLAY_COST = 5;

describe("BT23-050 Ankylomon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-050")).toMatchObject({
      cardId: "BT23-050",
      nameEn: "Ankylomon",
      colors: ["Black", "Yellow"],
      kinds: ["Digimon"],
      level: 4,
      playCost: ONE_PLAY_COST,
      dp: 5000,
      evoCosts: [
        { color: "Yellow", level: 3, memoryCost: 3 },
        { color: "Blue", level: 3, memoryCost: 3 },
      ],
      forms: ["Champion"],
      attributes: ["Free"],
      types: ["Ankylosaur", "Hudie", "CS"],
    });
    expect(getCardDefinition("BT23-050")?.effectText?.replace(/\u00a0/g, " ")).toBe(
      "[Digivolve] [Armadillomon]/Lv.3 w/[CS] trait: Cost 2 \n\n＜Blocker＞ \n" +
        "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -2000 DP until their turn ends. " +
        "Then, if it's your turn, 2 of your Digimon may DNA digivolve into [Shakkoumon] in the hand.",
    );
    expect(getCardDefinition("BT23-050")?.inheritedEffectText?.replace(/\u00a0/g, " ")).toBe("＜Blocker＞");
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Armadillomon"], cost: 2, isAlternate: true },
      { level: 3, traits: ["CS"], cost: 2, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = compiled.effects.find((entry) => entry.trigger === trigger)!.actions;
      expect(actions).toHaveLength(2);
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: {
          controllerDefault: "mine",
          nameOrTrait: [{ tokens: ["Shakkoumon"], match: "nameExact" }],
          zone: "hand",
        },
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it("exposes Blocker directly and from a realistic inherited stack", async () => {
    const direct = setupEngine({ 0: { battleArea: [{ card: "BT23-050", as: "anky" }] } });
    await direct.ready();
    expect(observe(direct.engine).hasKeyword(direct.perm("anky"), "Blocker")).toBe(true);
    const inherited = setupEngine({ 0: { battleArea: [{ card: "BT23-053", as: "host", under: ["BT23-050"] }] } });
    await inherited.ready();
    expect(observe(inherited.engine).hasKeyword(inherited.perm("host"), "Blocker")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Blocker"]);
  });

  it("publicly plays for 5, reduces exactly one opposing Digimon and may decline the DNA", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-027", as: "partner" }],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT23-027", as: "target" },
            { card: "BT23-053", as: "bystander" },
          ],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const ankyId = s.inst("anky").instanceId;
    const partnerId = s.inst("partner").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.state.memory).toBe(1);
    expect(s.perm("anky").topCard.instanceId).toBe(ankyId);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.perm("bystander").currentDP).toBe(5000);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard.instanceId).sort()).toEqual(
      [ankyId, partnerId].sort(),
    );
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([shakkoumonId]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("publicly DNA digivolves two of your Digimon into an unsuspended Shakkoumon for no extra memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-027", as: "partner", suspended: true }],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "dnaDraw" }, "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-053", as: "target" }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const ankyId = s.inst("anky").instanceId;
    const partnerId = s.inst("partner").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));

    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId)!;
    expect(result.topCard.instanceId).toBe(shakkoumonId);
    expect(result.isSuspended).toBe(false);
    expect(result.stack.map((card) => card.instanceId).sort()).toEqual([ankyId, partnerId].sort());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dnaDraw").instanceId]);
    expect(s.state.memory).toBe(6 - ONE_PLAY_COST);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([
    ["only one own Digimon", [], true, []],
    ["a level-3 partner", [{ card: "BT23-037", as: "partner" }], true, []],
    ["Shakkoumon in the trash instead of the hand", [{ card: "BT23-027", as: "partner" }], false, ["BT23-032"]],
  ])("publicly reduces DP but refuses the DNA with %s", async (_label, ownBattle, shakkoumonInHand, ownTrash) => {
    const s = setupEngine(
      {
        0: {
          battleArea: ownBattle,
          hand: [
            { card: "BT23-050", as: "anky" },
            ...(shakkoumonInHand ? [{ card: "BT23-032", as: "shakkoumon" }] : []),
          ],
          trash: ownTrash,
          deck: ["BT1-009", "BT1-010"],
        },
        1: { battleArea: [{ card: "BT23-053", as: "target" }], deck: ["BT1-011", "BT1-012"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const ankyId = s.inst("anky").instanceId;
    const expectedBoardIds = [ankyId, ...ownBattle.map((entry) => s.inst(entry.as).instanceId)];
    const expectedHandIds = shakkoumonInHand ? [s.inst("shakkoumon").instanceId] : [];

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);

    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.instanceId).sort()).toEqual(expectedBoardIds.sort());
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expectedHandIds);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(ownTrash);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("deletes the Digimon taken to 0 DP only after the DNA digivolution resolves (Q5317)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-027", as: "partner" }],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-053", as: "target", dp: 2000 }],
          deck: ["BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    const ankyId = s.inst("anky").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    const targetCardId = s.inst("target").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === targetCardId));

    const dnaEventIndex = s.events.findIndex(
      (event) => event.kind === "cardPlayed" && event.mechanic === "dna" && event.cardId === "BT23-032",
    );
    const deletionEventIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(targetCardId) && event.to === "trash",
    );
    expect(dnaEventIndex).toBeGreaterThanOrEqual(0);
    expect(deletionEventIndex).toBeGreaterThan(dnaEventIndex);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([targetCardId]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId)).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses the DNA after Betamon's inherited attack play restricts digivolution (Q5318)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-010"],
        },
        1: { security: ["BT1-011", "BT1-012"], deck: Array(8).fill("BT1-013") },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 10;
    const ankyId = s.inst("anky").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ankyId));
    await settle(() => !observe(s.engine).isAttacking());

    const played = s.perm("anky");
    expect(played.topCard.instanceId).toBe(ankyId);
    expect(observe(s.engine).isRestricted(played, "digivolve")).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(shakkoumonId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId)).toBe(false);
    expect(s.state.players[0]!.battleArea).toHaveLength(2);
    expect(s.perm("host").topCard.cardId).toBe("BT23-018");
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
  });

  it("applies the DP reduction but skips the DNA clause when played on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-032", as: "shakkoumon", under: ["BT23-050"] },
            { card: "BT23-018", as: "partner" },
          ],
          hand: [{ card: "BT23-032", as: "spareShakkoumon" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-010", "BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT23-053", as: "attacker", dp: 12000 }],
          deck: Array(8).fill("BT1-011"),
          security: ["BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("shakkoumon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shakkoumon").isSuspended && s.state.pendingDecision === undefined);
    const endResult = s.state.turnSeat === 0 ? s.engine.applyIntent(0, { type: "endPhase" }) : { ok: true };
    expect(endResult).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    const ankyId = s.perm("shakkoumon").stack[0]!.instanceId;
    const spareId = s.inst("spareShakkoumon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("shakkoumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ankyId));
    await settle(() => !observe(s.engine).isAttacking());

    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ankyId)).toBe(true);
    expect(s.perm("attacker").currentDP).toBe(10000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(spareId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === spareId)).toBe(false);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("partner").instanceId)).toBe(
      true,
    );
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("control for Q5318: the same pair DNA digivolves when Ankylomon is played normally", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-018", as: "host", under: ["BT23-017"] }],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: { battleArea: [{ card: "BT23-053", as: "target" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const ankyId = s.inst("anky").instanceId;
    const hostId = s.inst("host").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));

    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId)!;
    expect(result.stack.map((card) => card.instanceId)).toEqual(expect.arrayContaining([ankyId, hostId]));
    expect(observe(s.engine).isRestricted(result, "digivolve")).toBe(false);
  });

  it("leaves the DNA result unsuspended and eligible as an Alliance ally (Q5319)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-101", as: "hudiemon", under: ["BT23-084"] },
            { card: "BT23-027", as: "ally", suspended: true },
          ],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-053", as: "target" }],
          deck: Array(8).fill("BT1-012"),
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    s.state.memory = 6;
    const ankyId = s.inst("anky").instanceId;
    const allyId = s.inst("ally").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;
    preferred.push(allyId, ankyId);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ankyId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));

    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId)!;
    expect(result.isSuspended).toBe(false);
    expect(result.stack.map((card) => card.instanceId).sort()).toEqual([ankyId, allyId].sort());
    expect(result.permanentId).not.toBe(s.perm("hudiemon").permanentId);
    expect(observe(s.engine).hasKeyword(s.perm("hudiemon"), "Alliance")).toBe(true);

    const shakkoumonPermanentId = result.permanentId;
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("hudiemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    const prompt = s.events.find((event) => event.kind === "alliancePrompt");
    expect(prompt?.kind === "alliancePrompt" ? prompt.eligibleAllyIds : []).toContain(shakkoumonPermanentId);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: shakkoumonPermanentId })).toEqual({
      ok: true,
    });
    await settle(
      () => s.state.players[0]!.battleArea.find((p) => p.permanentId === shakkoumonPermanentId)?.isSuspended === true,
    );
    const suspendedResult = s.state.players[0]!.battleArea.find((p) => p.permanentId === shakkoumonPermanentId)!;
    expect(suspendedResult.isSuspended).toBe(true);
    await settle(() => !observe(s.engine).isAttacking());
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it.each([
    ["Armadillomon", "BT1-027", 0, 2],
    ["level-3 CS", "BT23-037", 1, 1],
  ])("publicly digivolves from the %s route and fires the same pair", async (_label, source, index, memoryCost) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: source, as: "source" },
            { card: "BT23-027", as: "partner" },
          ],
          hand: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-032", as: "shakkoumon" },
          ],
          deck: [{ card: "BT1-009", as: "evoDraw" }, { card: "BT1-010", as: "dnaDraw" }, "BT1-011"],
        },
        1: { battleArea: [{ card: "BT23-053", as: "target" }], deck: ["BT1-012", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;
    const sourceId = s.inst("source").instanceId;
    const ankyId = s.inst("anky").instanceId;
    const shakkoumonId = s.inst("shakkoumon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: ankyId,
        useAlternateCost: true,
        alternateRequirementIndex: index,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === shakkoumonId));

    expect(s.state.memory).toBe(4 - memoryCost);
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === shakkoumonId)!;
    expect(result.stack.map((card) => card.instanceId)).toContain(sourceId);
    expect(result.stack.map((card) => card.instanceId)).toContain(ankyId);
    expect(s.perm("target").currentDP).toBe(3000);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("evoDraw").instanceId,
      s.inst("dnaDraw").instanceId,
    ]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("refuses an ineligible level-3 source on both the alternate and the printed routes", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "source" }],
        hand: [{ card: "BT23-050", as: "anky" }],
        deck: ["BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    s.state.memory = 10;
    const ankyId = s.inst("anky").instanceId;
    for (const index of [0, 1]) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("source").permanentId,
          instanceId: ankyId,
          useAlternateCost: true,
          alternateRequirementIndex: index,
        }),
      ).not.toEqual({ ok: true });
    }
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: ankyId,
      }),
    ).not.toEqual({ ok: true });
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([ankyId]);
    expect(s.perm("source").topCard.cardId).toBe("BT1-009");
    expect(s.state.memory).toBe(10);
  });

  it("keeps the -2000 through the opponent's turn and restores it on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-027", as: "partner" }],
          hand: [{ card: "BT23-050", as: "anky" }],
          deck: Array(8).fill("BT1-009"),
          security: ["BT1-010", "BT1-011"],
        },
        1: {
          battleArea: [{ card: "BT23-053", as: "target" }],
          deck: Array(8).fill("BT1-012"),
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("anky").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(3000);

    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("target").currentDP).toBe(5000);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("gates the printed route on the exact base name, not a substring", () => {
    expect(matchingAlternateDigivolutionRequirement("BT23-050", "BT1-027")).toMatchObject({
      namesExact: ["Armadillomon"],
      cost: 2,
    });
    expect(matchingAlternateDigivolutionRequirement("BT23-050", nearName("BlackArmadillomon"))).toBeUndefined();
  });
});
