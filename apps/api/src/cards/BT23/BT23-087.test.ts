import { Phase, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-087.js";

/** Enough neutral cards for the draw phase plus a spare playable card so Main stays open. */
const neutralDeck = Array(12).fill("BT1-009") as string[];

describe("BT23-087 Violet Inboots", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-087")).toMatchObject({
      cardId: "BT23-087",
      nameEn: "Violet Inboots",
      colors: ["Purple"],
      kinds: ["Tamer"],
      playCost: 3,
      dp: 0,
      types: ["LIBERATOR"],
      effectText:
        "[Start of Your Main Phase] By returning this Tamer to the bottom of the deck, you may play 1 [Violet Inboots] from your hand without paying the cost. Then, if you don't have a Digimon, you may play 1 [Ghostmon] from your trash without paying the cost.\n[Your Turn] When any of your Digimon digivolve into a Digimon with the [Ghost]\u00a0trait, by suspending this Tamer, that Digimon gains ＜Rush＞ for the turn.",
      securityEffectText: "[Security] Play this card without paying the cost.",
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("returns this Tamer to play another Violet Inboots and conditionally a Ghostmon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourMainPhase");
    expect(effect?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["hand"],
      payCost: false,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Violet Inboots"], match: "nameExact" }] } },
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
      abortOnDecline: true,
    });
    expect(effect?.actions[1]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Ghostmon"], match: "nameExact" }] } },
      condition: { kind: "youHaveNone", filter: { controllerDefault: "mine", kind: ["Digimon"], zone: "battleArea" } },
      optional: true,
    });
  });

  it("suspends this Tamer to grant Rush to the Ghost-trait Digimon that digivolved", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenOneOfYoursDigivolves",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        zone: "battleArea",
        nameOrTrait: [{ tokens: ["Ghost"], match: "trait" }],
      },
      cost: { kind: "suspend", target: { isSelf: true, filter: { isSelfRef: true } } },
      optional: true,
    });
    expect((watcher as { actions: unknown[] }).actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      target: { filter: { isTriggerSource: true } },
    });
  });

  it("plays itself from security without paying the cost", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    });
  });

  it("matches the bracketed names exactly, not by substring", () => {
    const violet = { tokens: ["Violet Inboots"], match: "nameExact" as const };
    const ghostmon = { tokens: ["Ghostmon"], match: "nameExact" as const };
    expect(matchNameOrTrait({ nameEn: "Violet Inboots" }, violet)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "Violet Inboots ACE" }, violet)).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Ghostmon" }, ghostmon)).toBe(true);
    expect(matchNameOrTrait({ nameEn: "SoulGhostmon" }, ghostmon)).toBe(false);
    expect(matchNameOrTrait({ nameEn: "Ghostmon: X Antibody" }, ghostmon)).toBe(false);
  });

  it("returns itself to the deck bottom, plays a hand copy and a trash Ghostmon in the real Main window", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "fieldViolet" }],
          hand: [
            { card: "BT23-087", as: "handViolet" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldViolet").topCard!.instanceId;
    const handId = s.inst("handViolet").instanceId;
    const ghostId = s.inst("ghostmon").instanceId;
    const deckSize = s.state.players[0]!.deck.length;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const mine = s.state.players[0]!;
    expect(mine.deck.at(-1)?.instanceId).toBe(fieldId);
    expect(mine.deck).toHaveLength(deckSize + 1); // the first turn skips the draw; only the return added a card
    expect(mine.battleArea.map((permanent) => permanent.topCard?.instanceId)).toEqual(
      expect.arrayContaining([handId, ghostId]),
    );
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === fieldId)).toBe(false);
    expect(mine.hand.some((card) => card.instanceId === handId)).toBe(false);
    expect(mine.trash.some((card) => card.instanceId === ghostId)).toBe(false);
    // Both plays are free: a cost-3 Tamer and a cost-3 Ghostmon moved no memory at all.
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5569: the Violet Inboots played by this effect does not activate its own Start of Your Main Phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "fieldViolet" }],
          hand: [
            { card: "BT23-087", as: "handViolet" },
            { card: "BT23-087", as: "thirdViolet" },
            { card: "BT1-009", as: "spare" },
          ],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldViolet").topCard!.instanceId;
    const thirdId = s.inst("thirdViolet").instanceId;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const mine = s.state.players[0]!;
    expect(mine.deck.filter((card) => card.cardId === "BT23-087")).toHaveLength(1);
    expect(mine.deck.at(-1)?.instanceId).toBe(fieldId);
    expect(mine.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT23-087")).toHaveLength(1);
    expect(mine.hand.some((card) => card.instanceId === thirdId)).toBe(true);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Q5362: declining the return cost aborts the Ghostmon tail", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "fieldViolet" }],
          hand: [
            { card: "BT23-087", as: "handViolet" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const fieldId = s.perm("fieldViolet").topCard!.instanceId;
    const handId = s.inst("handViolet").instanceId;
    const ghostId = s.inst("ghostmon").instanceId;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const mine = s.state.players[0]!;
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === fieldId)).toBe(true);
    expect(mine.deck.some((card) => card.instanceId === fieldId)).toBe(false);
    expect(mine.hand.some((card) => card.instanceId === handId)).toBe(true);
    expect(mine.trash.some((card) => card.instanceId === ghostId)).toBe(true);
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("skips the Ghostmon tail while a Digimon is in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-087", as: "fieldViolet" },
            { card: "BT1-009", as: "existing" },
          ],
          hand: [
            { card: "BT23-087", as: "handViolet" },
            { card: "BT1-010", as: "spare" },
          ],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const handId = s.inst("handViolet").instanceId;
    const ghostId = s.inst("ghostmon").instanceId;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    const mine = s.state.players[0]!;
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === handId)).toBe(true);
    expect(mine.trash.some((card) => card.instanceId === ghostId)).toBe(true);
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("still plays the Ghostmon when the only Digimon sits in the breeding area", async () => {
    // Comprehensive rules 3-4-5-8: information on cards in the breeding area can't be
    // referenced, so a breeding Digimon does not satisfy "you have a Digimon".
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "fieldViolet" }],
          breeding: { card: "BT23-061", as: "breedingGhost" },
          hand: [
            { card: "BT23-087", as: "handViolet" },
            { card: "BT1-009", as: "spare" },
          ],
          trash: [{ card: "BT23-061", as: "ghostmon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const ghostId = s.inst("ghostmon").instanceId;

    await s.ready();
    const loop = s.engine.startTurnLoop();
    // A movable breeding Digimon holds the breeding window open; skip it publicly.
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    const mine = s.state.players[0]!;
    expect(s.perm("breedingGhost").inBreeding).toBe(true);
    expect(mine.battleArea.some((permanent) => permanent.topCard?.instanceId === ghostId)).toBe(true);
    expect(mine.trash.some((card) => card.instanceId === ghostId)).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends this Tamer so a freshly played Ghostmon line attacks the turn it digivolves", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          hand: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT4-080", as: "bakemon" },
          ],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ghostId = s.inst("ghostmon").instanceId;
    const bakemonId = s.inst("bakemon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ghostId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));
    // Freshly played: summoning sick, so it cannot attack yet.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === bakemonId && s.perm("violet").isSuspended);

    expect(s.perm("violet").isSuspended).toBe(true);
    expect(s.perm("ghostmon").stack.map((card) => card.instanceId)).toEqual([ghostId]);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("leaves the Tamer unsuspended and the attack illegal when the controller declines", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          hand: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT4-080", as: "bakemon" },
          ],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ghostId = s.inst("ghostmon").instanceId;
    const bakemonId = s.inst("bakemon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ghostId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === bakemonId && !s.state.pendingDecision);

    expect(s.perm("violet").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ghostmon").permanentId,
        target: { kind: "player" },
      }).ok,
    ).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("does not react to a Ghost digivolution inside the breeding area", async () => {
    // Comprehensive rules 3-4-5-3: cards in the breeding area can't be affected by effects,
    // so the Rush grant must not reach a breeding Digimon that digivolves.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          breeding: { card: "BT23-061", as: "breedingGhost" },
          hand: [{ card: "BT4-080", as: "bakemon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    const bakemonId = s.inst("bakemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("breedingGhost").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("breedingGhost").topCard?.instanceId === bakemonId && !s.state.pendingDecision);

    expect(s.perm("breedingGhost").inBreeding).toBe(true);
    expect(s.perm("violet").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("breedingGhost"), "Rush")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("lets the granted Rush expire at the end of the turn it was granted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-087", as: "violet" },
            { card: "BT23-061", as: "ghostmon" },
          ],
          hand: [{ card: "BT4-080", as: "bakemon" }],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    // Keep memory positive so the turn does not end on the digivolve cost and the grant
    // can be observed while its own turn is still running.
    s.state.memory = 5;
    const bakemonId = s.inst("bakemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === bakemonId && s.perm("violet").isSuspended);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(true);
    expect(s.state.memory).toBe(3);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(false);
    expect(s.perm("violet").isSuspended).toBe(true); // the Tamer unsuspends on its own next turn

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not react when the digivolution target lacks the Ghost trait", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          hand: [
            { card: "BT23-061", as: "ghostmon" },
            { card: "BT4-082", as: "dobermon" },
          ],
          deck: neutralDeck,
        },
        1: { deck: neutralDeck, security: 3 },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 6;
    await s.ready();
    const ghostId = s.inst("ghostmon").instanceId;
    const dobermonId = s.inst("dobermon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: ghostId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === ghostId));
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("ghostmon").permanentId,
        instanceId: dobermonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("ghostmon").topCard?.instanceId === dobermonId && !s.state.pendingDecision);

    expect(s.perm("violet").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("ghostmon"), "Rush")).toBe(false);
  });

  it("does not react to the opponent's Ghost digivolution on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT23-087", as: "violet" }],
          deck: neutralDeck,
        },
        1: {
          battleArea: [{ card: "BT23-061", as: "opponentGhost" }],
          hand: [{ card: "BT4-080", as: "bakemon" }],
          deck: neutralDeck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await advance(s.engine).recompute();
    const bakemonId = s.inst("bakemon").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("opponentGhost").permanentId,
        instanceId: bakemonId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("opponentGhost").topCard?.instanceId === bakemonId && !s.state.pendingDecision);

    expect(s.perm("violet").isSuspended).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opponentGhost"), "Rush")).toBe(false);
  });

  it("plays itself onto the field for free when checked from security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "attacker" }],
          deck: neutralDeck,
        },
        1: {
          security: [{ card: "BT23-087", as: "securityViolet" }],
          deck: neutralDeck,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const violetId = s.inst("securityViolet").instanceId;
    const memoryBefore = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === violetId),
    );

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === violetId)).toBe(true);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === violetId)).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(0);
    // Played without paying its cost of 3: attacking and checking security move no memory.
    expect(s.state.memory).toBe(memoryBefore);
  });
});
