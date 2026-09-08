import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-060.js";
import "../index.js";

const CARD_ID = "EX10-060";
const LARVA = "BT18-086"; // Lucemon: Larva — the exact name the On Play / When Digivolving cost demands.
const CHAOS_MODE = "BT7-111"; // Lucemon: Chaos Mode — no inherited text, so the stack stays quiet.
const INERT_DECK = ["BT1-013", "BT1-014", "BT1-009", "BT1-051", "BT1-020"];
const INERT_SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

describe("EX10-060 Lucemon: Satan Mode", () => {
  it("records the exact catalog and alternate evolution", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Lucemon: Satan Mode",
      colors: ["Purple"],
      level: 7,
      playCost: 16,
      dp: 16000,
      evoCosts: [{ color: "Purple", level: 6, memoryCost: 6 }],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Demon God"],
    });
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      digivolutionRequirement: [{ names: ["Lucemon: Chaos Mode"], cost: 6, isAlternate: true }],
    });
  });

  it("gates highest-level deletion on playing Lucemon: Larva to an empty breeding area", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects!.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: {
                controller: "mine",
                zone: "trash",
                nameOrTrait: [{ tokens: ["Lucemon: Larva"], match: "name" }],
              },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            breeding: true,
            requiresEmpty: "breedingArea",
            optional: true,
            abortOnDecline: true,
          },
          {
            kind: "Delete",
            target: {
              filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestLevel" },
              count: "all",
            },
            condition: { kind: "ifThisEffectActed" },
          },
        ],
      });
    }
  });

  it("shares the once-per-turn budget between When Digivolving and When Attacking", () => {
    const reactions = compiled.effects!.filter((entry) => entry.frequency === "OncePerTurn");
    expect(reactions.map((entry) => entry.trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
    expect(new Set(reactions.map((entry) => entry.sharedUseKey))).toEqual(new Set(["ir-shared-0"]));
    for (const effect of reactions)
      expect(effect.actions).toMatchObject([
        { kind: "Delete", controller: "opponent", optional: true },
        { kind: "SecurityManipulation", op: "trashTop", condition: { kind: "ifThisEffectDidNotDelete" } },
        { kind: "Unsuspend", condition: { kind: "ifThisEffectDidNotDelete" } },
      ]);
  });

  // --- [On Play], through the public playCard intent -------------------------------------

  it("On Play from hand: plays Larva to the empty breeding area and deletes only the highest level", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          trash: [{ card: LARVA, as: "larva" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "lv5" },
            { card: "BT1-014", as: "lv4" },
            { card: "BT1-009", as: "lv3" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lv4Id = s.perm("lv4").permanentId;
    const lv3Id = s.perm("lv3").permanentId;
    const larvaId = s.inst("larva").instanceId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard !== undefined && s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.breeding?.topCard?.instanceId).toBe(larvaId);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(LARVA);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(larvaId);
    // Only the Lv.5 is "the highest level"; both lower Digimon survive untouched.
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv4Id, lv3Id]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-020"]);
    // Play cost 16 paid in full from memory 10.
    expect(s.state.memory).toBe(-6);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual([CARD_ID]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(INERT_SECURITY);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("On Play deletes every Digimon tied for the highest level", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          trash: [{ card: LARVA, as: "larva" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-014", as: "lv4a" },
            { card: "BT1-051", as: "lv4b" },
            { card: "BT1-009", as: "lv3" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lv3Id = s.perm("lv3").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv3Id]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-014", "BT1-051"]);
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(LARVA);
  });

  it("On Play does nothing when the breeding area is occupied: the Larva play cannot happen", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          trash: [{ card: LARVA, as: "larva" }],
          breeding: { card: "BT1-001" },
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "BT1-020", as: "lv5" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lv5Id = s.perm("lv5").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe("BT1-001");
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("larva").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv5Id]);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  it("CR 15-7-4: declining the Larva play aborts the deletion", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          trash: [{ card: LARVA, as: "larva" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { battleArea: [{ card: "BT1-020", as: "lv5" }], deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lv5Id = s.perm("lv5").permanentId;
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("satan").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.state.players[0]!.breeding?.topCard).toBeUndefined();
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("larva").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lv5Id]);
  });

  // --- Digivolution routes, through the public digivolve intent ---------------------------

  it("digivolves for 6 from the exactly named Lucemon: Chaos Mode and keeps the source in the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CHAOS_MODE, as: "chaos" }],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const satanId = s.inst("satan").instanceId;
    const chaosInstanceId = s.perm("chaos").topCard!.instanceId;
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: satanId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chaos").topCard?.instanceId === satanId && s.state.pendingDecision === undefined);

    expect(s.perm("chaos").topCard?.cardId).toBe(CARD_ID);
    expect(s.perm("chaos").stack.map((card) => card.instanceId)).toEqual([chaosInstanceId]);
    // Cost 6 paid, plus the digivolution bonus draw.
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand).toHaveLength(handBefore); // -1 played, +1 drawn
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(INERT_DECK.slice(1));
  });

  it("digivolves for 6 from a plain Purple Lv.6 and refuses an illegal source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT3-089", as: "purpleLv6" },
            { card: "BT1-020", as: "redLv5" },
          ],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: INERT_SECURITY },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const satanId = s.inst("satan").instanceId;
    s.state.memory = 10;

    // A Red Lv.5 matches neither the printed Purple Lv.6 route nor the named route.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redLv5").permanentId,
        instanceId: satanId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(satanId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("purpleLv6").permanentId,
        instanceId: satanId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("purpleLv6").topCard?.instanceId === satanId && s.state.pendingDecision === undefined);
    expect(s.perm("purpleLv6").topCard?.cardId).toBe(CARD_ID);
    expect(s.state.memory).toBe(4);
  });

  // --- Q5170: both When Digivolving effects trigger together -----------------------------

  it("Q5170: both When Digivolving effects trigger at once and the controller orders them", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CHAOS_MODE, as: "chaos" }],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          trash: [{ card: LARVA, as: "larva" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "lv5" },
            { card: "BT1-009", as: "lv3" },
          ],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: s.inst("satan").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard !== undefined && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    // The engine offered an ordering decision to the controller (seat 0), which is what
    // Q5170 requires: the two [When Digivolving] effects trigger simultaneously.
    const ordering = s.decisions.filter(({ req, seat }) => req.kind === "orderTriggers" && seat === 0);
    expect(ordering.length).toBeGreaterThan(0);
    expect(ordering[0]!.req.options?.triggerKeys?.length).toBeGreaterThan(1);

    // Both clauses resolved: Larva reached breeding, the Lv.5 died to the highest-level
    // sweep, and the opponent's own deletion took the remaining Lv.3.
    expect(s.state.players[0]!.breeding?.topCard?.cardId).toBe(LARVA);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.map((card) => card.cardId).sort()).toEqual(["BT1-009", "BT1-020"]);
    // The opponent DID delete, so no security card is trashed by the second effect.
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(INERT_SECURITY);
  });

  it("When Digivolving: the opponent may delete a Tamer, and then no security card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CHAOS_MODE, as: "chaos" }],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "EX10-062", as: "tamer" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: s.inst("satan").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0 && s.state.pendingDecision === undefined);

    // A Tamer has no level, so this proves the target kind boundary, not just another Digimon.
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["EX10-062"]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(INERT_SECURITY);
  });

  it("When Digivolving: the opponent declines, so the top security card is trashed", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CHAOS_MODE, as: "chaos" }],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "theirs" }],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const theirsId = s.perm("theirs").permanentId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: s.inst("satan").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([theirsId]);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  // --- Q5171: the attack branch, its unsuspend, and the shared [Once Per Turn] ------------

  it("Q5171: When Attacking with nothing to delete trashes security, unsuspends, and burns the use", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "satan" }],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: ["BT1-009", "BT1-013", "BT1-014", "BT1-051"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    // Effect trashed the top card, then the attack checked the next one: 4 -> 3 -> 2.
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-051"]);
    // "this Digimon unsuspends" — it survives its own attack unsuspended.
    expect(s.perm("satan").isSuspended).toBe(false);

    // Second attack, same turn: the shared [Once Per Turn] use is spent even though the
    // opponent never deleted anything (Q5171), so only the security check happens.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-051"]);
    expect(s.perm("satan").isSuspended).toBe(true);
  });

  it("the [Once Per Turn] use is shared: When Digivolving spends it, the same turn's attack cannot", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CHAOS_MODE, as: "chaos" }],
          hand: [{ card: CARD_ID, as: "satan" }, "BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: { deck: INERT_DECK, security: ["BT1-009", "BT1-013", "BT1-014", "BT1-051"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("chaos").permanentId,
        instanceId: s.inst("satan").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 3 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-013", "BT1-014", "BT1-051"]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);
    await settle(() => false, 30);

    // Only the security check ran: the When Attacking copy shares the spent use.
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-014", "BT1-051"]);
    expect(s.perm("satan").isSuspended).toBe(true);
  });

  it("the shared [Once Per Turn] resets on the next own turn, through the real turn loop", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "satan" }],
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: INERT_SECURITY,
        },
        1: {
          hand: ["BT1-013"],
          deck: INERT_DECK,
          security: ["BT1-009", "BT1-013", "BT1-014", "BT1-051", "BT1-020", "BT1-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 4 && s.state.pendingDecision === undefined);
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual([
      "BT1-014",
      "BT1-051",
      "BT1-020",
      "BT1-027",
    ]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("satan").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 2 && s.state.pendingDecision === undefined);

    // Both the effect trash and the check ran again: the use reset on the new own turn.
    expect(s.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-020", "BT1-027"]);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
