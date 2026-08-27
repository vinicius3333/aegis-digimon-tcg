import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-060.js";

const CARD_ID = "BT25-060";
const VALID_LINK = "BT25-072";
const VALID_ALT_LINK = "BT26-063";
const NO_LINK_APPMON = "BT25-004";

describe("BT25-060 Rebootmon", () => {
  it("matches the complete catalog identity and every printed surface", () => {
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Rebootmon",
      colors: ["Green", "White"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 4 }],
      forms: ["God", "Appmon"],
      attributes: ["God"],
      types: ["Reboot"],
      maxCountInDeck: 4,
      dualEffect: "Rebootmon",
    });
    expect(getCardDefinition(CARD_ID)?.effectText).toContain("By linking 1 [Appmon]");
    expect(getCardDefinition(CARD_ID)?.effectText).toContain("your opponent's Digimon effects don't affect it");

    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "WhenDigivolving", frequency: "OncePerTurn" }),
        expect.objectContaining({ trigger: "WhenAttacking", frequency: "OncePerTurn" }),
        expect.objectContaining({
          trigger: "AllTurns",
          frequency: "OncePerTurn",
          actions: expect.arrayContaining([
            expect.objectContaining({
              kind: "SubTrigger",
              event: "whenLinked",
              sourceFilter: { isSelfRef: true },
            }),
            expect.objectContaining({ kind: "SubTrigger", event: "whenUnsuspended" }),
          ]),
        }),
      ]),
    );
  });

  it("exposes Security Attack +1, Reboot, Link +1, and the exact Appmon evolution stack", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "reboot" }] } });
    await s.ready();

    expect(observe(s.engine).keywordAmount(s.perm("reboot"), "SecurityAttack")).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Reboot")).toBe(true);
    expect(observe(s.engine).linkMaxDelta(s.perm("reboot"))).toBe(1);
    expect(observe(s.engine).effectiveColors(s.perm("reboot"))).toEqual(["Green", "White"]);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("reboot"), "Appmon")).toBe(true);
  });

  it("links exactly one legal Appmon link card from hand, then grants the linked face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("reboot").linked.length === 1 &&
        observe(s.engine).hasPierce(s.perm("reboot")) &&
        observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker") &&
        observe(s.engine).hasRestriction(s.perm("reboot"), "beAffected", "Digimon"),
    );

    expect(s.perm("reboot").linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(s.state.memory).toBe(0); // player link cost 3 is paid; the linked face itself has no cost.
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("reboot"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("reboot"), "beAffected", "Option")).toBe(false);
  });

  it("prevents an opponent Digimon effect from suspending Rebootmon while its reaction is active", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("reboot"), "beAffected", "Digimon"));

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    await advance(s.engine).verb.suspend([s.perm("reboot").permanentId], 1);
    advance(s.engine).verb.leaveEffectResolution();
    expect(s.perm("reboot").isSuspended).toBe(false);
  });

  it("does not arm the linked reaction for another Rebootmon's link event", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "watcher" },
            { card: CARD_ID, as: "otherHost" },
          ],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("otherHost").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("otherHost").linked.length === 1);

    expect(s.perm("watcher").linked).toHaveLength(0);
    expect(observe(s.engine).hasPierce(s.perm("watcher"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("watcher"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("watcher"), "beAffected", "Digimon")).toBe(false);
  });

  it("fires the All Turns reaction on a genuine unsuspend and not on a no-op unsuspend", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "reboot", suspended: true }] } });
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("reboot").permanentId]);
    await settle(() => observe(s.engine).hasPierce(s.perm("reboot")));
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker")).toBe(true);

    await advance(s.engine).verb.unsuspend([s.perm("reboot").permanentId]);
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);

    advance(s.engine).ledgers.modifiers.sweep(s.state, "ownerTurnEnd", 0 as Seat);
    advance(s.engine).ledgers.continuous.sweep(s.state, "ownerTurnEnd", 0 as Seat);
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(false);
    await advance(s.engine).verb.suspend([s.perm("reboot").permanentId]);
    await advance(s.engine).verb.unsuspend([s.perm("reboot").permanentId]);
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(false); // shared Once Per Turn is consumed
  });

  it("When Digivolving links only this Digimon's stack, then unsuspends this suspended Rebootmon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-055", as: "base", suspended: true, under: [VALID_LINK] },
            { card: "BT25-055", as: "other", under: [VALID_ALT_LINK] },
          ],
          hand: [{ card: CARD_ID, as: "reboot" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 4;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("reboot").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard?.cardId === CARD_ID &&
        s.perm("base").linked.some((card) => card.cardId === VALID_LINK) &&
        !s.perm("base").isSuspended,
    );

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-055"]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual([VALID_ALT_LINK]);
    expect(s.perm("base").linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(s.state.memory).toBe(0);
  });

  it("When Attacking links for free once, and optional refusal leaves the attack suspended and unlinked", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await accepted.ready();
    expect(
      accepted.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: accepted.perm("reboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        accepted.perm("reboot").linked.length === 1 &&
        !accepted.perm("reboot").isSuspended &&
        observe(accepted.engine).hasPierce(accepted.perm("reboot")),
    );
    expect(accepted.perm("reboot").isSuspended).toBe(false);
    expect(accepted.perm("reboot").linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(observe(accepted.engine).hasKeyword(accepted.perm("reboot"), "Blocker")).toBe(true);
    expect(observe(accepted.engine).hasRestriction(accepted.perm("reboot"), "beAffected", "Digimon")).toBe(true);

    advance(accepted.engine).ledgers.modifiers.sweep(accepted.state, "ownerTurnEnd", 0 as Seat);
    advance(accepted.engine).ledgers.continuous.sweep(accepted.state, "ownerTurnEnd", 0 as Seat);
    expect(observe(accepted.engine).hasPierce(accepted.perm("reboot"))).toBe(false);
    expect(observe(accepted.engine).hasKeyword(accepted.perm("reboot"), "Blocker")).toBe(false);
    expect(observe(accepted.engine).hasRestriction(accepted.perm("reboot"), "beAffected", "Digimon")).toBe(false);

    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: declined.perm("reboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.state.pendingDecision === undefined && declined.perm("reboot").isSuspended);
    expect(declined.perm("reboot").linked).toHaveLength(0);
    expect(declined.perm("reboot").isSuspended).toBe(true);
  });

  it("does not unsuspend when no legal Appmon Link card is available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "reboot" }], hand: [{ card: NO_LINK_APPMON, as: "noLink" }] },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("reboot").isSuspended);

    expect(s.perm("reboot").isSuspended).toBe(true);
    expect(s.perm("reboot").linked).toHaveLength(0);
  });

  it("does not treat a pre-existing link card as payment for the current effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot", linked: [{ card: VALID_LINK, as: "oldLink" }] }],
          hand: [{ card: NO_LINK_APPMON, as: "noLink" }],
        },
        1: { security: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("reboot").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("reboot").isSuspended);

    expect(s.perm("reboot").isSuspended).toBe(true);
    expect(s.perm("reboot").linked.map((card) => card.instanceId)).toEqual([s.inst("oldLink").instanceId]);
  });

  it("rejects a no-Link Appmon near-match while accepting a different legal Appmon Link card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [
            { card: NO_LINK_APPMON, as: "noLink" },
            { card: VALID_ALT_LINK, as: "valid" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("noLink").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toMatchObject({ ok: false });
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("valid").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reboot").linked.length === 1);
    expect(s.perm("reboot").linked.map((card) => card.cardId)).toEqual([VALID_ALT_LINK]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual([NO_LINK_APPMON]);
  });
});
