import { getCardDefinition, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT25-060.js";
import "../index.js";

const CARD_ID = "BT25-060";
const VALID_LINK = "BT25-072";
const VALID_ALT_LINK = "BT26-063";
const NO_LINK_APPMON = "BT25-060";

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

  it("uses the ordinary green Lv.5 evolution for cost 4 and rejects an off-color source", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-075", as: "greenBase" }], hand: [{ card: CARD_ID, as: "reboot" }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greenBase").permanentId,
        instanceId: s.inst("reboot").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("greenBase").topCard?.cardId === CARD_ID);
    expect(s.state.memory).toBe(1);
    expect(s.perm("greenBase").stack.map((card) => card.cardId)).toEqual(["BT1-075"]);

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "redBase" }], hand: [{ card: CARD_ID, as: "reboot" }] },
    });
    invalid.state.memory = 5;
    await invalid.ready();
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("redBase").permanentId,
        instanceId: invalid.inst("reboot").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(invalid.state.memory).toBe(5);
    expect(invalid.state.players[0]!.hand.map((card) => card.cardId)).toContain(CARD_ID);
  });

  it("publicly App Fuses Bootmon into Rebootmon and moves the selected Shutmon link onto the stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-056", as: "bootmon", linked: [{ card: "BT25-072", as: "shutmon" }] }],
          hand: [{ card: CARD_ID, as: "reboot" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bootmon").permanentId,
        instanceId: s.inst("reboot").instanceId,
        appFusionLinkInstanceId: s.inst("shutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bootmon").topCard?.cardId === CARD_ID);
    expect(s.perm("bootmon").topCard?.cardId).toBe(CARD_ID);
    expect(s.perm("bootmon").stack.map((card) => card.cardId)).toEqual(["BT25-072"]);
    expect(s.perm("bootmon").linked.map((card) => card.cardId)).toEqual(["BT25-056"]);
    expect(s.state.memory).toBe(0);
  });

  it("publicly App Fuses Shutmon into Rebootmon and selects the Bootmon link", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-072", as: "shutmon", linked: [{ card: "BT25-056", as: "bootmon" }] }],
          hand: [{ card: CARD_ID, as: "reboot" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("shutmon").permanentId,
        instanceId: s.inst("reboot").instanceId,
        appFusionLinkInstanceId: s.inst("bootmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("shutmon").topCard?.cardId === CARD_ID);
    expect(s.perm("shutmon").stack.map((card) => card.cardId)).toEqual(["BT25-056"]);
    expect(s.perm("shutmon").linked.map((card) => card.cardId)).toEqual(["BT25-072"]);
    expect(s.state.memory).toBe(0);
  });

  it("preserves the App Fusion stack and draws when the entering When Digivolving link is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-056", as: "bootmon", linked: [{ card: "BT25-072", as: "shutmon" }] }],
          hand: [{ card: CARD_ID, as: "reboot" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("bootmon").permanentId,
        instanceId: s.inst("reboot").instanceId,
        appFusionLinkInstanceId: s.inst("shutmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("bootmon").topCard?.cardId === CARD_ID);
    expect(s.perm("bootmon").stack.map((card) => card.cardId)).toEqual(["BT25-056", "BT25-072"]);
    expect(s.perm("bootmon").linked).toHaveLength(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-001"]);
  });

  it("links exactly one legal Appmon link card from hand, then grants the linked face", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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

  it("uses Link +1 as an observable two-link capacity, retaining both legal links", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [
            { card: VALID_LINK, as: "firstLink" },
            { card: VALID_ALT_LINK, as: "secondLink" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("firstLink").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reboot").linked.length === 1);
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("secondLink").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reboot").linked.length === 2);
    expect(s.perm("reboot").linked.map((card) => card.cardId)).toEqual([VALID_ALT_LINK, VALID_LINK]);
    expect(observe(s.engine).linkMaxDelta(s.perm("reboot"))).toBe(1);
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

  it("publicly protects the linked Rebootmon from BT25-011 while a non-Appmon control is affected", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: CARD_ID, as: "reboot" },
            { card: "BT1-013", as: "control" },
          ],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
        1: {
          hand: [
            { card: "BT25-011", as: "opponentEffect" },
            { card: "BT25-011", as: "opponentEffect2" },
          ],
          deck: ["BT1-001", "BT1-002"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("reboot"), "beAffected", "Digimon"));
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateIds?: string[]; candidateInstanceIds?: string[] };
    const candidates = payload.candidateIds ?? payload.candidateInstanceIds ?? [];
    expect(candidates).toEqual(expect.arrayContaining([s.perm("reboot").permanentId, s.perm("control").permanentId]));
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("reboot").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(s.perm("control").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("opponentEffect2").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const controlDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: controlDecision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("control").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("control").isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
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

  it("keeps linked/unsuspended keywords through the opponent turn, then expires at own turn end", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "reboot", suspended: true }], deck: ["BT1-004", "BT1-005"] },
      1: { deck: ["BT1-001", "BT1-002"], security: ["BT1-003"] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("reboot").permanentId]);
    await settle(() => observe(s.engine).hasPierce(s.perm("reboot")));
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await opponentTurn;
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker")).toBe(true);

    s.state.turnSeat = 0;
    s.state.memory = 10;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker")).toBe(false);
  });

  it("uses Reboot at an actual turn start, while a suspended control stays suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: CARD_ID, as: "reboot", suspended: true },
          { card: "BT1-087", as: "control", suspended: true },
        ],
      },
      1: {
        deck: ["BT1-004"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();
    const control = s.perm("control");
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("reboot").isSuspended).toBe(false);
    expect(control.isSuspended).toBe(true);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("uses the granted Blocker in a public incoming battle", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: CARD_ID, as: "reboot", suspended: true }], security: ["BT1-001"], deck: ["BT1-004"] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }], security: ["BT1-001"], deck: ["BT1-005"] },
    });
    await s.ready();
    await advance(s.engine).verb.unsuspend([s.perm("reboot").permanentId]);
    await settle(() => observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker"));
    expect(observe(s.engine).hasKeyword(s.perm("reboot"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("reboot"))).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-010")).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  it("uses granted Piercing to check security after winning a public Digimon battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "reboot" }], hand: [{ card: VALID_LINK, as: "linked" }] },
        1: {
          battleArea: [{ card: "BT1-009", as: "victim", suspended: true, dp: 1000 }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const victimId = s.perm("victim").permanentId;
    const attackerId = s.perm("reboot").permanentId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("reboot")));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: victimId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-009")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("does not use Piercing when linked Rebootmon loses its public battle", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "reboot", dp: 1000 }], hand: [{ card: VALID_LINK, as: "linked" }] },
        1: { battleArea: [{ card: "BT25-041", as: "winner", suspended: true, dp: 12000 }], security: ["BT1-010"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const attackerId = s.perm("reboot").permanentId;
    const winnerId = s.perm("winner").permanentId;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "linkCard",
        instanceId: s.inst("linked").instanceId,
        targetPermanentId: s.perm("reboot").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasPierce(s.perm("reboot")));
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "permanent", permanentId: winnerId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === CARD_ID)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === winnerId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(false);
  });

  it("When Digivolving publicly links the chosen legal hand source and unsuspends only this host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-057", as: "base", suspended: true },
            { card: "BT25-057", as: "other" },
          ],
          hand: [
            { card: CARD_ID, as: "reboot" },
            { card: VALID_LINK, as: "linked" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: false },
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
    await settle(() => s.perm("base").topCard?.cardId === CARD_ID);
    await settle(
      () =>
        s.perm("base").topCard?.cardId === CARD_ID &&
        s.perm("base").linked.some((card) => card.cardId === VALID_LINK) &&
        !s.perm("base").isSuspended,
    );

    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-057"]);
    expect(s.perm("other").stack.map((card) => card.cardId)).toEqual([]);
    expect(s.perm("other").linked).toHaveLength(0);
    expect(s.perm("base").linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(s.state.memory).toBe(0);
  });

  it("links an Appmon evolution-card source produced by public Scopemon placement", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-057", as: "base", suspended: true }],
          hand: [
            { card: "BT21-071", as: "scopemon" },
            { card: VALID_LINK, as: "source" },
            { card: CARD_ID, as: "reboot" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("scopemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("base").stack.some((card) => card.cardId === VALID_LINK));
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
        s.perm("base").topCard?.cardId === CARD_ID && s.perm("base").linked.some((card) => card.cardId === VALID_LINK),
    );
    expect(s.perm("base").linked.map((card) => card.cardId)).toEqual([VALID_LINK]);
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("When Attacking links for free once, and optional refusal leaves the attack suspended and unlinked", async () => {
    const accepted = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "reboot" }],
          hand: [{ card: VALID_LINK, as: "linked" }],
        },
        1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
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
    expect(accepted.state.players[1]!.security).toHaveLength(1);
    expect(accepted.state.players[1]!.security.map((card) => card.cardId)).toEqual(["BT1-011"]);
    expect(accepted.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
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
