import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-035.js";

describe("BT23-035 Dynasmon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-035")).toMatchObject({
      cardId: "BT23-035",
      nameEn: "Dynasmon",
      colors: ["Yellow", "Red"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Yellow", level: 5, memoryCost: 4 },
        { color: "Red", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
    });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Witchelny", "CS"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("evolves publicly from a Yellow Lv.5 for 4 and from a Red Lv.5 for 4, drawing 1 each time", async () => {
    for (const [source, alias] of [
      ["BT1-057", "yellowSource"],
      ["BT1-020", "redSource"],
    ] as const) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: source, as: alias }],
            hand: [{ card: "BT23-035", as: "dynasmon" }],
            security: [{ card: "BT1-009", as: "cost" }],
            deck: [{ card: "BT1-010", as: "bonusDraw" }],
          },
        },
        { autoDeclineOptional: true, autoSelectCards: true },
      );
      await s.ready();
      s.state.memory = 10;
      const sourceInstanceId = s.inst(alias).instanceId;

      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm(alias).permanentId,
          instanceId: s.inst("dynasmon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm(alias).topCard.cardId === "BT23-035" && s.state.pendingDecision === undefined);

      expect(s.state.memory).toBe(6);
      expect(s.perm(alias).stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
      expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
      expect(s.state.players[0]!.deck).toHaveLength(0);
      expect(s.perm(alias).currentDP).toBe(12000);
    }
  });

  it("evolves publicly from a Witchelny Lv.5 for the alternate cost of 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-039", as: "mistymon" }],
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
          deck: [{ card: "BT1-010", as: "bonusDraw" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    const sourceInstanceId = s.inst("mistymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("mistymon").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("mistymon").topCard.cardId === "BT23-035" && s.state.pendingDecision === undefined);

    expect(s.state.memory).toBe(7);
    expect(s.perm("mistymon").stack.map((card) => card.instanceId)).toEqual([sourceInstanceId]);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
  });

  it("refuses a Lv.5 source that is neither Yellow/Red nor a Witchelny/CS trait holder", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "greenSource" }],
        hand: [{ card: "BT23-035", as: "dynasmon" }],
        deck: ["BT1-010"],
      },
    });
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenSource").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("greenSource").topCard.cardId).toBe("BT1-076");
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("dynasmon").instanceId]);
  });

  it("reduces current and later-played opposing Digimon for the turn", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "current" }],
          hand: [{ card: "BT1-019", as: "future" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    const currentPermanentId = s.perm("current").permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === currentPermanentId),
    );
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("current").instanceId)).toBe(true);

    await advance(s.engine).verb.playInstances([s.inst("future").instanceId]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("future").instanceId)).toBe(true);
  });

  // Q5293: a Digimon reduced to 0 DP is deleted by the rule check that runs BEFORE its
  // pending [On Play] effect activates, so that effect never resolves. The opponent can only
  // play a Digimon during the turn player's turn through an effect, so the play is driven
  // through the effect-play verb rather than a `playCard` intent.
  it("deletes a later-played 0-DP opposing Digimon before its On Play effect can activate", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    const dynasmonPermanentId = s.perm("dynasmon").permanentId;
    expect(s.perm("dynasmon").isSuspended).toBe(false);

    // BT1-070 Kuwagamon is a 4000 DP Lv.4 whose [On Play] suspends 1 of its controller's
    // opponent's Digimon. With -6000 DP it is at 0 and the rule check deletes it first.
    await advance(s.engine).verb.playInstances([s.inst("kuwagamon").instanceId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([s.inst("kuwagamon").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([dynasmonPermanentId]);
    expect(s.perm("dynasmon").isSuspended).toBe(false);
  });

  it("does not reduce DP when its security-trash cost cannot be paid", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT23-035", as: "dynasmon" }] },
      1: { battleArea: [{ card: "BT1-020", as: "target" }] },
    });
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("applies the same -6000 DP through a public evolution and restores it at the real turn end", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-057", as: "source" }],
          hand: [
            { card: "BT23-035", as: "dynasmon" },
            { card: "BT1-009", as: "filler" },
          ],
          security: [{ card: "BT1-010", as: "cost" }],
          deck: [{ card: "BT1-011", as: "bonusDraw" }],
        },
        1: { battleArea: [{ card: "BT1-024", as: "target" }], deck: Array(10).fill("BT1-009") },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("dynasmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "BT23-035" && s.perm("target").currentDP === 4000);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(4000);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("exposes Barrier through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-035", as: "dynasmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("dynasmon"), "Barrier")).toBe(true);
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("requires trashing the top security card to reduce all opposing Digimon by 6000", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[0];
      expect(action).toMatchObject({
        kind: "ModifyDP",
        playerWide: true,
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: "all" },
        amount: -6000,
        duration: "forTheTurn",
        cost: {
          kind: "trash",
          target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
        },
      });
      expect(action.optional).toBe(true);
      expect(action.abortOnDecline).toBe(true);
    }
  });

  it("may decline the top-security processing condition before trashing or reducing DP", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 20;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dynasmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT23-035"));
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.perm("target").currentDP).toBe(6000);
  });

  it("ignores opposing security removal, then buffs and recovers the deck TOP card from its own removal", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "dynasmon" }],
        security: [
          { card: "BT1-009", as: "ownTop" },
          { card: "BT1-010", as: "ownBottom" },
        ],
        deck: [
          { card: "BT1-013", as: "deckTop" },
          { card: "BT1-014", as: "deckSecond" },
        ],
      },
      1: { security: [{ card: "BT1-011", as: "opposingSecurity" }] },
    });

    // The opponent's stack losing a card is not "your security stack is removed from".
    await advance(s.engine).verb.trashFromSecurity(1, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.security).toHaveLength(2);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      s.inst("deckTop").instanceId,
      s.inst("ownBottom").instanceId,
    ]);
    expect(s.state.players[0]!.security[0]!.faceUp).toBe(false);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckSecond").instanceId]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("ownTop").instanceId]);
  });

  it("skips Recovery while more than 3 security cards remain but still grants Security Attack +1", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "dynasmon" }],
        security: [
          { card: "BT1-009", as: "one" },
          { card: "BT1-010", as: "two" },
          { card: "BT1-011", as: "three" },
          { card: "BT1-012", as: "four" },
          { card: "BT1-013", as: "five" },
        ],
        deck: [{ card: "BT1-014", as: "deckTop" }],
      },
    });

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });

    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
  });

  // Q5295: the [Once Per Turn] cap is per turn. A gain taken on the opponent's turn does
  // not block a second gain on the controller's own next turn, and the earlier grant is
  // still live then because "until your turn ends" means the controller's own turn end.
  it("caps the security-removal trigger per turn and re-arms it on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-035", as: "dynasmon" }],
        security: [
          { card: "BT1-009", as: "one" },
          { card: "BT1-012", as: "two" },
          { card: "BT1-013", as: "three" },
          { card: "BT1-014", as: "four" },
          { card: "BT1-009", as: "five" },
        ],
        deck: [
          { card: "BT1-012", as: "turnDraw" },
          { card: "BT1-013", as: "recoveryTarget" },
          { card: "BT1-014", as: "deckTail" },
        ],
      },
      1: { deck: Array(10).fill("BT1-009") },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    // Opponent's turn, first removal: 5 security cards become 4, so Recovery's
    // "3 or fewer" condition is false and only the keyword lands.
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(3);

    // Second removal in the same turn: capped. Neither the keyword nor Recovery repeats,
    // even though the stack is now at 3 cards and would otherwise qualify.
    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("turnDraw").instanceId,
      s.inst("recoveryTarget").instanceId,
      s.inst("deckTail").instanceId,
    ]);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    // The opponent-turn grant survives into the controller's own turn (it expires at the
    // END of that turn), and the per-turn cap has reset.
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("turnDraw").instanceId]);

    await advance(s.engine).verb.trashFromSecurity(0, 1, { fromTop: true });
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(2);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("recoveryTarget").instanceId });
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTail").instanceId]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // Q5294: on a security check a [Security] effect activates immediately, ahead of the
  // "when a card is removed from the security stack" watchers that triggered at the same
  // time. ST22-08's [Security] effect deletes the attacker; Dynasmon's own removal trigger
  // must still resolve afterwards.
  it("resolves the checked Security effect before its own security-removal trigger", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-035", as: "dynasmon" }],
          security: [
            { card: "ST22-08", as: "securityOption" },
            { card: "BT1-010", as: "second" },
            { card: "BT1-011", as: "third" },
          ],
          deck: [{ card: "BT1-014", as: "deckTop" }],
        },
        1: { battleArea: [{ card: "BT1-020", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.turnSeat = 1;
    const attackerInstanceId = s.inst("attacker").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === attackerInstanceId));

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security[0]).toMatchObject({ instanceId: s.inst("deckTop").instanceId });

    const attackerTrashedIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(attackerInstanceId),
    );
    const recoveredIndex = s.events.findIndex(
      (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("deckTop").instanceId),
    );
    expect(attackerTrashedIndex).toBeGreaterThanOrEqual(0);
    expect(recoveredIndex).toBeGreaterThan(attackerTrashedIndex);
  });

  // Q5296: ＜Barrier＞ trashes the controller's top security card to prevent a battle
  // deletion, including a battle against a Security Digimon. That trash removes a card from
  // the controller's own security stack, so the [All Turns] trigger fires and the extra
  // ＜Security A. +1＞ is read before the check loop decides on the next card.
  // RETAINED RED. Suspected engine seam: `CombatController` pays ＜Barrier＞ through
  // `access.flipTopSecurityToTrash` (apps/api/src/engine/state/access.ts:639), a bare zone
  // move that never publishes `whenSecurityRemoved` / `whenCardTrashedFromSecurity`. Observed
  // end state: Dynasmon survives and its own top security card is trashed, but it gains no
  // ＜Security A. +1＞, performs no Recovery, and the check loop stops after one card.
  it("checks an extra security card after Barrier trashes its own security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-035", as: "dynasmon" }],
          security: [{ card: "BT1-009", as: "barrierCost" }],
          deck: [{ card: "BT1-014", as: "deckTop" }],
        },
        1: {
          security: [
            { card: "BT10-055", as: "bigSecurity" },
            { card: "BT1-012", as: "secondSecurity" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const dynasmonPermanentId = s.perm("dynasmon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: dynasmonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // BT10-055 Gryphonmon is a 13000 DP Security Digimon: the 12000 DP attacker would be
    // deleted, which opens the ＜Barrier＞ prompt.
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(s.engine.applyIntent(0, { type: "respondBarrier", permanentId: dynasmonPermanentId, accept: true })).toEqual(
      { ok: true },
    );
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));

    // Barrier paid: the top own security card is trashed and Dynasmon survives.
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("barrierCost").instanceId]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([dynasmonPermanentId]);
    // The Barrier trash removed a card from the controller's own security stack, so the
    // [All Turns] trigger granted ＜Security A. +1＞ and, at 0 security cards, Recovery.
    expect(observe(s.engine).keywordAmount(s.perm("dynasmon"), "SecurityAttack")).toBe(1);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    // The extra check consumed the opponent's second security card too.
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual([
      s.inst("bigSecurity").instanceId,
      s.inst("secondSecurity").instanceId,
    ]);
  });

  it("gains Security Attack +1 and conditionally recovers at end of the security-removal trigger", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "AllTurns") as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSecurityRemoved",
      sourceFilter: { controller: "mine" },
    });
    expect(effect.actions[0].actions).toMatchObject([
      { kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: 1 }, duration: "untilYourTurnEnd" },
      {
        kind: "SecurityManipulation",
        op: "addTop",
        controller: "mine",
        source: "deck",
        amount: 1,
        condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
      },
    ]);
  });
});
