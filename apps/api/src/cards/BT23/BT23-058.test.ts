import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, settleAcrossTimers, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./BT23-058.js";

/**
 * BT23-058 Craniamon. The knowledge base carries no Q&A for this card
 * (`node tools/kb/query.mjs card BT23-058` -> no entries), so every assertion below is
 * anchored on the printed text and the comprehensive rules.
 */
/** Fixtures, named so each board reads as the rules situation it sets up. */
const CRANIAMON = "BT23-058";
const FILLER = "BT1-009"; // Monodramon Lv.3 Red, cost 2, 3000 DP — inert main-deck body.
const CHEAP = "BT1-009"; // The opponent's lowest play cost (2) for the suspend sweep.
const MID = "BT3-060"; // Black Lv.3, cost 3, 5000 DP — inert, above the lowest play cost.
const HIGH = "BT4-065"; // Black Lv.3, cost 4, 6000 DP — inert, the opponent's attacker.
const ALLY = "BT1-027"; // Armadillomon Lv.3 Blue, 4000 DP — inside Volcanic Flare's 4000 DP band.
const ALLY_TIED = "BT1-050"; // Liollmon Lv.3 Yellow, 4000 DP — ties ALLY for lowest DP.
const PURPLE_ALLY = "BT2-067"; // Purple Lv.3, 3000 DP — the colour requirement for SELF_DELETE.
const RED_TAMER = "ST1-12"; // Tai Kamiya — the opponent's red colour requirement; a Tamer, so the
// lowest-play-cost Digimon sweep never removes the enabler mid-test.
const FLARE = "BT2-091"; // Volcanic Flare — [Main] Delete 1 of your opponent's Digimon with 4000 DP or less.
const SWEEP = "BT6-095"; // Happy Bullet Showering — [Main] Delete all of your opponent's Digimon with the lowest DP.
const SELF_DELETE = "BT7-107"; // [Main] Delete 1 of your Digimon. Then, return up to 2 purple Digimon cards to hand.

/** Hand the turn to seat 1 through the production turn loop and open its Main phase. */
async function openOpponentMain(s: ReturnType<typeof setupEngine>): Promise<void> {
  advance(s.engine).endMainPhaseIfOpen(0);
  await advance(s.engine).waitForMainPhase(1);
}

describe("BT23-058 Craniamon", () => {
  it("matches every catalog field and complete compiled clause", () => {
    expect(getCardDefinition("BT23-058")).toMatchObject({
      cardId: "BT23-058",
      nameEn: "Craniamon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [{ color: "Black", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Vaccine"],
      types: ["Holy Warrior", "Royal Knight", "CS"],
      rarity: "R",
      maxCountInDeck: 4,
    });
    expect(getCardDefinition("BT23-058")?.inheritedEffectText).toBeUndefined();
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("exposes Reboot and Blocker through the live keyword seam", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT23-058", as: "craniamon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("craniamon"), "Blocker")).toBe(true);
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Reboot", "Blocker"]);
  });

  it("Reboot unsuspends this Digimon during the opponent's Active phase", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CRANIAMON, as: "craniamon" }],
        hand: [{ card: FILLER, as: "spare0" }],
        deck: Array(10).fill(FILLER),
        security: [FILLER, FILLER, FILLER],
      },
      1: {
        battleArea: [{ card: MID, as: "bystander" }],
        hand: [{ card: FILLER, as: "spare1" }],
        deck: Array(10).fill(FILLER),
        security: [FILLER, FILLER, FILLER],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    // Attacking is the public way to suspend on the own turn: the own Active phase has already
    // run, so the next unsuspension can only come from the OPPONENT's Active phase, which is
    // exactly what Reboot changes.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.perm("craniamon").isSuspended).toBe(true);
    // The attack's suspension also consumed this turn's once-per-turn sweep.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);

    await openOpponentMain(s);
    expect(s.perm("craniamon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("Blocker redirects an opposing attack and the block suspension deletes the lowest-cost opponents", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: CRANIAMON, as: "craniamon" }],
        hand: [{ card: FILLER, as: "spare0" }],
        deck: Array(10).fill(FILLER),
        security: [FILLER, FILLER, FILLER],
      },
      1: {
        battleArea: [
          { card: RED_TAMER, as: "tamer" },
          { card: CHEAP, as: "cheap" },
          { card: MID, as: "mid" },
          { card: HIGH, as: "attacker" },
        ],
        hand: [{ card: FILLER, as: "spare1" }],
        deck: Array(10).fill(FILLER),
        security: [FILLER, FILLER, FILLER],
      },
    });
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const securityBefore = s.state.players[0]!.security.length;
    const cheapId = s.perm("cheap").permanentId;
    const midId = s.perm("mid").permanentId;
    const attackerId = s.perm("attacker").permanentId;
    await openOpponentMain(s);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    const opened = s.events.find((event) => event.kind === "blockWindowOpened");
    expect(opened).toMatchObject({ eligibleBlockerIds: [s.perm("craniamon").permanentId] });
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("craniamon").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();

    // The block kept security intact and 11000 DP beat the 6000 + 1000 DP attacker.
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([CRANIAMON]);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    // Blocking suspended Craniamon, so the deletion removed the cost-2 Digimon and spared the
    // cost-3 and cost-4 ones (the blocked attacker died to the battle, not to the sweep).
    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(remaining).not.toContain(cheapId);
    expect(remaining).not.toContain(attackerId);
    expect(remaining).toContain(midId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual([CHEAP, HIGH].sort());

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  it("deletes every tied lowest-play-cost opponent in the battle area and spares breeding", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-058", as: "craniamon" }],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-010", as: "low1" },
          { card: "BT1-011", as: "low2" },
          { card: "BT1-039", as: "mid" },
          { card: "BT23-068", as: "high" },
        ],
        // Play cost 2 — strictly cheaper than every battle-area Digimon. If the deletion
        // filter leaked into the raising area this card would be the sole "lowest" and the
        // cost-3 pair below would survive.
        breeding: { card: "BT1-009", as: "breeder" },
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
    });
    await s.ready();
    const midId = s.perm("mid").permanentId;
    const highId = s.perm("high").permanentId;
    const breederId = s.perm("breeder").permanentId;
    const low1 = s.perm("low1").permanentId;
    const low2 = s.perm("low2").permanentId;
    const low1InstanceId = s.inst("low1").instanceId;
    const low2InstanceId = s.inst("low2").instanceId;
    const breederInstanceId = s.inst("breeder").instanceId;
    const securityBefore = s.state.players[1]!.security.length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(remaining).not.toContain(low1);
    expect(remaining).not.toContain(low2);
    expect(remaining).toEqual(expect.arrayContaining([midId, highId]));
    expect(remaining).toHaveLength(2);
    expect(s.state.players[1]!.breeding?.permanentId).toBe(breederId);
    expect(s.state.players[1]!.breeding?.topCard?.cardId).toBe("BT1-009");
    const trashedIds = s.state.players[1]!.trash.map((card) => card.instanceId);
    expect(trashedIds).toContain(low1InstanceId);
    expect(trashedIds).toContain(low2InstanceId);
    expect(trashedIds).not.toContain(breederInstanceId);
    // One trashed card is the checked security card; the two deletions are the rest.
    expect(s.state.players[1]!.trash).toHaveLength(3);
    expect(s.state.players[1]!.security).toHaveLength(securityBefore - 1);
    expect(s.perm("craniamon").isSuspended).toBe(true);
  });

  it("fires the suspend deletion once per turn and re-arms it on the next own turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT23-058", as: "craniamon" }],
        hand: [{ card: "BT23-049", as: "spare" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
          { card: "BT23-068", as: "survivor" },
        ],
        hand: [{ card: "BT23-049", as: "opponentSpare" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
      },
    });
    const attackPlayer = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("craniamon").permanentId,
        target: { kind: "player" },
      });

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const firstId = s.perm("first").permanentId;
    const secondId = s.perm("second").permanentId;
    const survivorId = s.perm("survivor").permanentId;

    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([secondId, survivorId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(firstId);

    // A second suspend in the SAME turn must not delete again: the cost-3 Digimon survives.
    await advance(s.engine).verb.unsuspend([s.perm("craniamon").permanentId]);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([secondId, survivorId]);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);

    // The own Active phase unsuspended Craniamon and the once-per-turn counter reset.
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(attackPlayer()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toEqual([survivorId]);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(secondId);

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("suspends to save an ally from an opposing Option and chains into the lowest-cost deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CRANIAMON, as: "craniamon" },
            { card: ALLY, as: "ally" },
          ],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: RED_TAMER, as: "tamer" },
            { card: CHEAP, as: "cheap" },
            { card: HIGH, as: "high" },
          ],
          hand: [{ card: FLARE, as: "flare" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const allyId = s.perm("ally").permanentId;
    const cheapId = s.perm("cheap").permanentId;
    const highId = s.perm("high").permanentId;
    await openOpponentMain(s);

    // The opponent's own Option is the effect that would make the ally leave: no verb, no
    // injected timing.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).toContain(allyId);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.perm("craniamon").isSuspended).toBe(true);
    // Suspending chained into "delete all of your opponent's Digimon with the lowest play cost".
    const remaining = s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId);
    expect(remaining).not.toContain(cheapId);
    expect(remaining).toContain(highId);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual([CHEAP, FLARE].sort());

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("saves only one of two allies threatened by one opposing Option", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CRANIAMON, as: "craniamon" },
            { card: ALLY, as: "allyA" },
            { card: ALLY_TIED, as: "allyB" },
          ],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: RED_TAMER, as: "tamer" },
            { card: CHEAP, as: "cheap" },
            { card: HIGH, as: "high" },
          ],
          hand: [{ card: SWEEP, as: "sweep" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const allyA = s.perm("allyA").permanentId;
    const allyB = s.perm("allyB").permanentId;
    await openOpponentMain(s);
    s.state.memory = 7;

    // "Delete all of your opponent's Digimon with the lowest DP" threatens both 4000 DP allies
    // at once; Craniamon saves exactly 1 of them.
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("sweep").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    const survivors = s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId);
    expect(survivors).toContain(s.perm("craniamon").permanentId);
    expect([allyA, allyB].filter((id) => survivors.includes(id))).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
    expect(s.perm("craniamon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not protect against your own effects", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CRANIAMON, as: "craniamon" },
            { card: PURPLE_ALLY, as: "ally" },
          ],
          hand: [{ card: SELF_DELETE, as: "option" }],
          deck: Array(10).fill(FILLER),
        },
        1: { battleArea: [{ card: CHEAP, as: "cheap" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    const allyId = s.perm("ally").permanentId;
    const cheapId = s.perm("cheap").permanentId;
    s.state.memory = 1;

    // Seat 0's own Option deletes its own Digimon: "by your opponent's effects" does not match.
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(allyId);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(cheapId);
  });

  it("may decline the protection and lets the ally leave with this Digimon unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CRANIAMON, as: "craniamon" },
            { card: ALLY, as: "ally" },
          ],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: RED_TAMER, as: "tamer" },
            { card: CHEAP, as: "cheap" },
          ],
          hand: [{ card: FLARE, as: "flare" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const allyId = s.perm("ally").permanentId;
    const cheapId = s.perm("cheap").permanentId;
    await openOpponentMain(s);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(allyId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([ALLY]);
    expect(s.perm("craniamon").isSuspended).toBe(false);
    // Declining also means the suspend never happened, so nothing was swept.
    expect(s.state.players[1]!.battleArea.map((permanent) => permanent.permanentId)).toContain(cheapId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("cannot pay the protection cost once a block has already suspended it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CRANIAMON, as: "craniamon" },
            { card: ALLY, as: "ally" },
          ],
          hand: [{ card: FILLER, as: "spare0" }],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
        1: {
          battleArea: [
            { card: RED_TAMER, as: "tamer" },
            { card: CHEAP, as: "cheap" },
            { card: HIGH, as: "attacker" },
          ],
          hand: [{ card: FLARE, as: "flare" }, FILLER],
          deck: Array(10).fill(FILLER),
          security: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const allyId = s.perm("ally").permanentId;
    await openOpponentMain(s);

    // Block the opponent's attack: Craniamon suspends, so its protection cost is unpayable.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("craniamon").permanentId }),
    ).toEqual({ ok: true });
    await settleAcrossTimers(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    await settle();
    expect(s.perm("craniamon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("flare").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    await settle();

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.permanentId)).not.toContain(allyId);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual([ALLY]);
    expect(s.perm("craniamon").isSuspended).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
  it("takes the alternate Lv.5 [CS] route for 3 and draws, and refuses non-CS or wrong-level sources", async () => {
    const alternate = setupEngine({
      0: {
        battleArea: [{ card: "BT23-044", as: "base" }],
        hand: [{ card: "BT23-058", as: "craniamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await alternate.ready();
    alternate.state.memory = 0;
    const baseInstanceId = alternate.inst("base").instanceId;
    const basePermanentId = alternate.perm("base").permanentId;
    const craniamonInstanceId = alternate.inst("craniamon").instanceId;
    expect(
      alternate.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: basePermanentId,
        instanceId: craniamonInstanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => alternate.state.players[0]!.hand.length === 1);
    expect(alternate.state.memory).toBe(-3);
    expect(alternate.perm("base").permanentId).toBe(basePermanentId);
    expect(alternate.perm("base").topCard?.instanceId).toBe(craniamonInstanceId);
    expect(alternate.perm("base").stack[0]?.instanceId).toBe(baseInstanceId);
    expect(alternate.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(alternate.state.players[0]!.deck).toHaveLength(1);

    const printed = setupEngine({
      0: {
        battleArea: [{ card: "BT2-060", as: "base" }],
        hand: [{ card: "BT23-058", as: "craniamon" }],
        deck: ["BT1-009", "BT1-010"],
      },
    });
    await printed.ready();
    printed.state.memory = 0;
    expect(
      printed.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: printed.perm("base").permanentId,
        instanceId: printed.inst("craniamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => printed.state.players[0]!.hand.length === 1);
    expect(printed.state.memory).toBe(-3);

    for (const base of ["BT1-039", "BT22-031"]) {
      const illegal = setupEngine({
        0: { battleArea: [{ card: base, as: "base" }], hand: [{ card: "BT23-058", as: "craniamon" }] },
      });
      await illegal.ready();
      illegal.state.memory = 0;
      expect(
        illegal.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: illegal.perm("base").permanentId,
          instanceId: illegal.inst("craniamon").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect(illegal.state.memory).toBe(0);
      expect(illegal.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT23-058"]);
    }
  });

  it("compiles the leave-play replacement and the once-per-turn suspend deletion", () => {
    const replacement = (
      compiled.effects.find(
        (entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "Replacement",
      ) as unknown as { actions: unknown[] }
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      leaveCause: "byOpponentEffect",
      sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
      target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });

    const deletion = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "SubTrigger",
    ) as unknown as { frequency: string; actions: unknown[] };
    expect(deletion.frequency).toBe("OncePerTurn");
    expect(deletion.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestPlayCost" },
            count: "all",
          },
        },
      ],
    });
  });
});
