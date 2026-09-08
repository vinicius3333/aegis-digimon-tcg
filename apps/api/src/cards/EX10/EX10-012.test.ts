import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance, type Permanent } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-012.js";
import "../index.js"; // register compiled cards so the real activate / turn-loop paths run

/**
 * Fixture vocabulary.
 *
 * BT15-072 Vilemon: level 4, trait "Evil", carries "[Dark Masters]" only in its EFFECT TEXT.
 * It is the KB Q5030 lever — "with [Dark Masters] in its text" must match it even though no
 * trait or name does.
 * BT15-031 MetalSeadramon: carries the [Dark Masters] TRAIT.
 * BT1-009..BT1-014: inert main-deck Digimon with no effects, so they can neither open a
 * decision nor change a result.
 */

/** The OnDeclaration effectKey for the card's [Hand][Main] reduced-cost play. */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance): string {
  const found = ownEffectKeys(s, instance, EffectTiming.OnDeclaration)[0];
  if (found === undefined) throw new Error("EX10-012 surfaces no [Hand][Main] activated effect");
  return found;
}

/** EX10-012's own effect keys at a timing, read through the testkit's `cardSource` seam. */
function ownEffectKeys(s: EngineSetup, card: CardInstance | Permanent, timing: EffectTiming): string[] {
  const source = observe(s.engine).cardSource(card);
  return effectsOf(timing, source)
    .map(({ effectKey }) => effectKey)
    .filter((key) => key.startsWith("EX10-012/"));
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

describe("EX10-012 MetalSeadramon — catalog and compiled clauses", () => {
  it("records the exact catalog facts and every printed executable clause", () => {
    expect(getCardDefinition("EX10-012")).toMatchObject({
      cardId: "EX10-012",
      nameEn: "MetalSeadramon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Cyborg", "Dark Masters"],
    });
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX10-012")).toEqual(compiled);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual([
      "Main",
      "OnPlay",
      "WhenAttacking",
      "AllTurns",
      "OnDeletion",
      "Security",
    ]);
  });
});

describe("EX10-012 — [Hand] [Main] reduced-cost play", () => {
  it("plays this card from hand for 11 − 5 with only [Dark Masters]-text Digimon out", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }],
          // Q5030: Vilemon has [Dark Masters] only in its text, so it does not break the gate.
          battleArea: [{ card: "BT15-072", as: "textOnly" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const metalId = s.inst("metal").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: metalId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, metalId));

    expect(onField(s, metalId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
  });

  it("activates with no Digimon at all (KB Q5035)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX10-012", as: "metal" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const metalId = s.inst("metal").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: metalId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, metalId));

    expect(onField(s, metalId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not play for the reduced cost while a non-[Dark Masters] Digimon is out", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }],
          battleArea: [{ card: "BT1-009", as: "plain" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const metalId = s.inst("metal").instanceId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: metalId,
      effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
    });
    await settle();

    expect(onField(s, metalId)).toBe(false);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([metalId]);
    expect(s.state.memory).toBe(6);
  });

  it("reads [Dark Masters] across trait and text alike in a mixed board pool", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }],
          battleArea: [
            // Trait-only match, text-only match (KB Q5030): `match: "any"` is the union, so
            // neither closes the gate.
            { card: "BT15-031", as: "traitOnly" },
            { card: "BT15-072", as: "textOnly" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const metalId = s.inst("metal").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: metalId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, metalId));

    expect(onField(s, metalId)).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("closes the gate when a non-matching Digimon joins the same mixed pool", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }],
          battleArea: [
            { card: "BT15-031", as: "traitOnly" },
            { card: "BT15-072", as: "textOnly" },
            // Neither name, trait nor text mentions [Dark Masters].
            { card: "BT1-013", as: "noMatch" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const metalId = s.inst("metal").instanceId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: metalId,
      effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
    });
    await settle();

    expect(onField(s, metalId)).toBe(false);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([metalId]);
    expect(s.state.memory).toBe(6);
  });

  it("deletes the Digimon this effect played at its own turn end, sparing the rest (KB Q5732)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }, "BT1-014"],
          battleArea: [{ card: "BT15-031", as: "bystander" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const metalId = s.inst("metal").instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: metalId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, metalId));
    expect(onField(s, metalId)).toBe(true);

    // The real turn loop closes the turn: no injected OnEndTurn.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, metalId)).toBe(false);
    // It left the battle area by its own delete, so its [On Deletion] clause runs too: with no
    // blue face-up security card of its own it is placed face up at the bottom of security.
    const security = s.state.players[0]!.security;
    expect(security.map((c) => c.instanceId).at(-1)).toBe(metalId);
    expect(security.at(-1)!.faceUp).toBe(true);
    expect(onField(s, bystanderId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves a normally played copy alive through its own turn end", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "victim" },
            { card: "BT1-085", as: "tamer" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const metalId = s.inst("metal").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: metalId })).toEqual({ ok: true });
    await settle(() => onField(s, metalId));
    expect(s.state.memory).toBe(0);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, metalId)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-012 — [On Play] / [When Attacking] suspend lock", () => {
  it("locks exactly 1 opposing Digimon and 1 Tamer when played, and stops that Digimon attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          // Security so the opponent's legal attack does not end the game mid-test.
          security: ["BT1-009", "BT1-012", "BT1-013"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lockedDigimon" },
            { card: "BT1-014", as: "freeDigimon" },
            { card: "BT1-085", as: "lockedTamer" },
            { card: "BT1-085", as: "freeTamer" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("lockedDigimon").topCard!.instanceId, s.perm("lockedTamer").topCard!.instanceId);
    const metalId = s.inst("metal").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: metalId })).toEqual({ ok: true });
    await settle(() => onField(s, metalId) && s.state.pendingDecision === undefined);

    const seen = observe(s.engine);
    expect(seen.hasRestriction(s.perm("lockedDigimon"), "beSuspended")).toBe(true);
    expect(seen.hasRestriction(s.perm("lockedTamer"), "beSuspended")).toBe(true);
    expect(seen.hasRestriction(s.perm("freeDigimon"), "beSuspended")).toBe(false);
    expect(seen.hasRestriction(s.perm("freeTamer"), "beSuspended")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // "Can't suspend" (comprehensive §4-23) also blocks the self-suspension of an attack.
    // The interpreter records the printed "can't suspend" as `beSuspended`; the continuous
    // ledger reads that spelling and `suspend` as the same prohibition, so the attack gate in
    // engine/combat/legality.ts sees it (comprehensive §4-23).
    expect(observe(s.engine).hasRestriction(s.perm("lockedDigimon"), "suspend")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("freeDigimon"), "suspend")).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lockedDigimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("lockedDigimon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("freeDigimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    // The lock ends with the opponent's turn.
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(observe(s.engine).hasRestriction(s.perm("lockedDigimon"), "beSuspended")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("lockedTamer"), "beSuspended")).toBe(false);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("locks 1 opposing Digimon and 1 Tamer again on a real attack declaration", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-012", as: "metal" }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "lockedDigimon" },
            { card: "BT1-014", as: "freeDigimon" },
            { card: "BT1-085", as: "lockedTamer" },
            { card: "BT1-085", as: "freeTamer" },
          ],
          security: ["BT1-009", "BT1-012"],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("lockedDigimon").topCard!.instanceId, s.perm("lockedTamer").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const seen = observe(s.engine);
    expect(seen.hasRestriction(s.perm("lockedDigimon"), "beSuspended")).toBe(true);
    expect(seen.hasRestriction(s.perm("lockedTamer"), "beSuspended")).toBe(true);
    expect(seen.hasRestriction(s.perm("freeDigimon"), "beSuspended")).toBe(false);
    expect(seen.hasRestriction(s.perm("freeTamer"), "beSuspended")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});

describe("EX10-012 — [All Turns] digivolution lock", () => {
  it("allows [Apocalymon] and refuses another otherwise legal level 7", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-012", as: "metal" }],
          hand: [
            { card: "BT15-102", as: "apocalymon" },
            { card: "BT5-086", as: "omnimon" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 8;
    const host = s.perm("metal");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("omnimon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("metal").topCard!.cardId).toBe("EX10-012");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard!.cardId === "BT15-102");
    expect(s.perm("metal").stack.map((c) => c.cardId)).toEqual(["EX10-012"]);
  });

  it("goes silent as a digivolution card once [Apocalymon] sits on top of it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-012", as: "metal" }],
          hand: [{ card: "BT15-102", as: "apocalymon" }],
          security: [{ card: "BT1-009", as: "secTop" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "wall", dp: 20_000, suspended: true },
            { card: "BT1-014", as: "otherDigimon" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 8;
    const metalId = s.perm("metal").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("metal").permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard!.cardId === "BT15-102");

    // Stack identity: EX10-012 is now the only digivolution card, and the host is Apocalymon.
    const host = s.perm("metal");
    expect(host.topCard!.cardId).toBe("BT15-102");
    expect(host.stack.map((c) => c.cardId)).toEqual(["EX10-012"]);
    expect(host.stack.map((c) => c.instanceId)).toEqual([metalId]);

    // Its own main-text clauses stop being offered: the permanent surfaces no EX10-012 effect.
    expect(ownEffectKeys(s, host, EffectTiming.OnDeclaration)).toEqual([]);
    expect(ownEffectKeys(s, host, EffectTiming.OnPlay)).toEqual([]);
    expect(
      observe(s.engine)
        .activatableEffects(host)
        .map(({ effectKey }) => effectKey),
    ).toEqual(expect.not.arrayContaining([expect.stringContaining("EX10-012/")]));

    // [When Attacking] is silent as well: attacking locks nobody.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: host.permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const seen = observe(s.engine);
    expect(seen.hasRestriction(s.perm("otherDigimon"), "beSuspended")).toBe(false);
    expect(seen.hasRestriction(s.perm("tamer"), "beSuspended")).toBe(false);

    // The 20000 DP wall wins, so the whole stack leaves: [On Deletion] is silent too — the
    // digivolution card goes to the trash, not face up under security.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(metalId);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("secTop").instanceId);
    expect(s.state.players[0]!.security.map((c) => c.instanceId)).not.toContain(metalId);
    expect(s.state.players[0]!.security.every((c) => c.faceUp !== true)).toBe(true);
  });

  it("still deletes the played host at turn end after it digivolved into [Apocalymon] (KB Q5036/Q5733)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-012", as: "metal" }, { card: "BT15-102", as: "apocalymon" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          trash: ["BT1-013"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const metalId = s.inst("metal").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: metalId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("metal")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, metalId));
    const host = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === metalId)!;
    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("metal").topCard!.cardId === "BT15-102");

    // Both end-of-turn processings (the delayed delete and Apocalymon's own [End of Your
    // Turn]) belong to the turn player, who orders them: the harness answers that
    // orderTriggers decision. The stack still leaves the battle area.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT15-102", "EX10-012"]));
    // Q5036/Q5733: the delayed delete and Apocalymon's [End of Your Turn] are simultaneous
    // pending processing, so the turn player is asked for the order rather than the engine
    // fixing one.
    const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(orderPrompts.length).toBeGreaterThan(0);
    expect(orderPrompts.every(({ seat }) => seat === 0)).toBe(true);
    expect(orderPrompts.some(({ req }) => (req.options?.triggerKeys ?? []).length > 1)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-012 — [On Deletion] face-up security placement", () => {
  it("places itself face up as the BOTTOM security card after losing a real battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-012", as: "metal" }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-014", as: "secSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const metalId = s.perm("metal").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === metalId));

    const security = s.state.players[0]!.security;
    expect(security.map((c) => c.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secSecond").instanceId,
      metalId,
    ]);
    expect(security[2]!.faceUp).toBe(true);
    // KB Q5031: the other cards stay face down.
    expect(security.slice(0, 2).every((c) => c.faceUp !== true)).toBe(true);
  });

  it("goes to the trash instead when a blue face-up security card already exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-012", as: "metal" }],
          security: [{ card: "EX10-012", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const metalId = s.perm("metal").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("metal").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === metalId));

    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(metalId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });
});

describe("EX10-012 — [Security] free play", () => {
  it("plays a level 5 or lower [Dark Masters]-text card from hand and then battles (KB Q5033/Q6510)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-012", as: "guard", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const guardId = s.inst("guard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // The [Security] effect resolved from hand.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT15-072");
    expect(s.state.players[1]!.hand).toHaveLength(0);
    // Q6510: the checked Digimon then battles the attacker — 11000 DP beats 3000.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(guardId);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("offers only the [Dark Masters]-text card out of a mixed hand pool", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [
            // Text-only match at level 4 — the only legal candidate.
            { card: "BT15-072", as: "textOnly" },
            // Trait match, but level 6: over the "level 5 or lower" bound.
            { card: "BT15-031", as: "traitOnlyTooHigh" },
            // No [Dark Masters] anywhere.
            { card: "BT1-013", as: "noMatch" },
          ],
          security: [{ card: "EX10-012", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-072"));

    // Exactly one of the three is eligible, so the engine never asks: it resolves the single
    // legal candidate and the two distractors stay in hand untouched.
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.instanceId)).toEqual([
      s.inst("textOnly").instanceId,
    ]);
    expect(s.state.players[1]!.hand.map((c) => c.instanceId).sort()).toEqual(
      [s.inst("traitOnlyTooHigh").instanceId, s.inst("noMatch").instanceId].sort(),
    );
    expect(s.decisions.filter(({ seat, req }) => seat === 1 && req.kind === "selectCards")).toHaveLength(0);
  });

  it("plays the same card from the trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          trash: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-012", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-072"));

    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT15-072");
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(s.inst("freePlay").instanceId);
  });

  it("does nothing when the card was checked face down (KB Q5037)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-012", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([s.inst("freePlay").instanceId]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard?.cardId)).not.toContain("BT15-072");
  });

  it("refuses a level 6 [Dark Masters] card and a low-level card with no [Dark Masters] text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          // BT15-031 is level 6 (over the bound); BT1-013 carries no [Dark Masters] text at all.
          hand: [
            { card: "BT15-031", as: "tooHigh" },
            { card: "BT1-013", as: "noText" },
          ],
          security: [{ card: "EX10-012", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand.map((c) => c.cardId).sort()).toEqual(["BT1-013", "BT15-031"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
