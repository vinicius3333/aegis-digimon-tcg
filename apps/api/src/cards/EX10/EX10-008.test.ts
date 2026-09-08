import { EffectDuration, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX10-008.js";

describe("EX10-008 MetalGreymon", () => {
  it("matches the catalog record", () => {
    expect(getCardDefinition("EX10-008")).toMatchObject({
      cardId: "EX10-008",
      nameEn: "MetalGreymon",
      colors: ["Red", "Black"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Red", level: 4, memoryCost: 4 },
        { color: "Black", level: 4, memoryCost: 4 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Cyborg"],
    });
  });

  it("grants the same opponent target Collision and a start-main-phase attack", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, names: ["Greymon"], cost: 3, isAlternate: true }]);

    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "GainKeyword",
            keyword: { keyword: "Collision" },
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          },
          {
            kind: "GainTriggeredEffect",
            gainedTrigger: "StartOfYourMainPhase",
            duration: "untilOpponentTurnEnd",
            target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
            gainedActions: [{ kind: "Attack" }],
          },
        ],
      });
    }
  });

  it("models the inherited once-per-turn target-switch security trash and name gate", () => {
    expect(compiled.effects?.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "trashSecurityTop",
              controller: "opponent",
              count: 1,
              condition: { kind: "selfHasNameContaining", names: ["Greymon"] },
            },
          ],
        },
      ],
    });
  });

  // C1 — public play: the printed play cost, the board move, and both On Play grants landing
  // on the SAME chosen opponent Digimon (natural origin: a `playCard` intent).
  it("publicly plays for 7 and grants Collision plus the forced start-main attack to one target", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "chosen", dp: 20_000 },
            { card: "BT1-014", as: "other" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    s.state.memory = 7;
    const metalId = s.inst("metalGreymon").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: metalId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Collision"));

    const played = s.state.players[0]!.battleArea.find((p) => p.topCard?.instanceId === metalId);
    expect(played).toBeDefined();
    expect(played!.stack.map((card) => card.cardId)).toEqual([]);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-013"]);
    expect(observe(s.engine).hasKeyword(played!, "Reboot")).toBe(true);

    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Collision")).toBe(true);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("chosen").permanentId)).toHaveLength(1);
    // The second action rides `sameTarget`: the untouched Digimon gets neither half.
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Collision")).toBe(false);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("other").permanentId)).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // C1 (behaviour) — the granted "[Start of Your Main Phase] This Digimon attacks." fires from
  // the real turn loop on the grantee's own turn, and both grants expire when that turn ends.
  it("forces the granted opponent Digimon to attack at its own main-phase start, then expires", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "wall" }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "chosen", dp: 20_000 }],
          hand: ["BT1-013"],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoAcceptOptional: true },
    );
    await s.ready();
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Collision"));
    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    const wallId = s.perm("wall").topCard!.instanceId;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    // No player intent declares this attack: the granted trigger fires at seat 1's own main
    // phase start, and the ＜Collision＞ half then forces seat 0 into the block window.
    await settle(() => observe(s.engine).blockingSeat() === 0, 4000);
    expect(s.perm("chosen").isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("chosen"))).toBe(true);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wall").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === wallId), 4000);
    expect(s.state.players[0]!.security).toHaveLength(1);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Collision")).toBe(false);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("chosen").permanentId)).toHaveLength(0);
  });

  // C1 — Collision's own effect: while the grant is live the defending player must block.
  it("forces the defending player to block the granted Digimon's attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "wall" }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "chosen" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Collision"));

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("chosen").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);

    // ＜Collision＞ (§16-30): seat 0's plain Digimon is an eligible blocker and cannot decline.
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toMatchObject({ ok: false });
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wall").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  // C0 — the printed alternate digivolution route.
  it("digivolves from a Greymon-named Lv.4 for 3 and exposes Reboot", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-007", as: "greymon", under: ["EX10-006", "EX10-002"] }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }],
          deck: [{ card: "BT1-013", as: "drawn" }, "BT1-014"],
        },
        1: { battleArea: [{ card: "BT1-014", as: "target" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("target").permanentId, s.perm("target").topCard!.instanceId);
    s.state.memory = 3;
    const sourceId = s.inst("greymon").instanceId;
    const metalId = s.inst("metalGreymon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("greymon").permanentId,
        instanceId: metalId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("greymon").topCard?.instanceId === metalId &&
        observe(s.engine).hasKeyword(s.perm("target"), "Collision"),
    );

    expect(s.perm("greymon").topCard?.cardId).toBe("EX10-008");
    expect(
      s
        .perm("greymon")
        .stack.map((card) => card.instanceId)
        .at(-1),
    ).toBe(sourceId);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("target"), "Collision")).toBe(true);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("target").permanentId)).toHaveLength(1);
  });

  it("refuses the reduced route from a Lv.4 without Greymon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "kokatorimon" }],
        hand: [{ card: "EX10-008", as: "metalGreymon" }],
        deck: ["BT1-013"],
      },
    });
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("kokatorimon").permanentId,
        instanceId: s.inst("metalGreymon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(3);
    expect(s.perm("kokatorimon").topCard?.cardId).toBe("BT1-014");
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  // C2 — the inherited clause, driven by a real ＜Blocker＞ declaration (the production origin
  // of `whenAttackTargetSwitched`, combat/controller.ts switchDefenderToBlocker).
  it("trashes the opponent's top security when a real block switches the attack target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX10-010", as: "host", under: ["EX10-008"] }], security: ["BT1-013"] },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009", "BT1-014"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const topId = s.state.players[1]!.security[0]!.instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 1);

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).not.toContain(topId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(topId);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("trashes security only once across two real target switches in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-010", as: "host", under: ["EX10-008"] },
          { card: "BT2-058", as: "spareBlocker" },
        ],
        security: ["BT1-013"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "first" },
          { card: "BT1-014", as: "second" },
        ],
        security: ["BT1-009", "BT1-014", "BT1-013"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("first").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("host").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.security.length === 2);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("second").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("spareBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("does not trash security when the inherited host lacks Greymon in its name", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-009", as: "host", under: ["EX10-008"], dp: 20_000 },
          { card: "BT2-058", as: "blocker" },
        ],
        security: ["BT1-013"],
      },
      1: { battleArea: [{ card: "BT1-013", as: "attacker" }], security: ["BT1-009", "BT1-014"] },
    });
    await s.ready();
    s.state.turnSeat = 1;
    const securityIds = s.state.players[1]!.security.map((card) => card.instanceId);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    expect(s.state.players[1]!.security.map((card) => card.instanceId)).toEqual(securityIds);
  });

  it("does not trash security on the controller's own turn ([Opponent's Turn] window)", async () => {
    // FAILS-WHEN-REVERTED: widening the inherited clause to AllTurns lets a Greymon host
    // strip security on both turns.
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-010", as: "host", under: ["EX10-008"] },
          { card: "BT1-013", as: "attacker" },
        ],
        security: ["BT1-013"],
      },
      1: { battleArea: [{ card: "BT2-058", as: "blocker" }], security: ["BT1-009", "BT1-014"] },
    });
    await s.ready();
    s.state.turnSeat = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.state.players[1]!.trash).toHaveLength(0);
  });

  // KB Q5015: BT16-048 [TyrantKabuterimon] is not affected by opponent Digimon effects while
  // suspended, so the ＜Collision＞ it gained stops applying the moment its own attack suspends it.
  it("Q5015: the granted Collision stops applying once TyrantKabuterimon suspends to attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "wall" }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT16-048", as: "tyrant" }] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("tyrant").permanentId, s.perm("tyrant").topCard!.instanceId);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("tyrant"), "Collision"));
    expect(observe(s.engine).hasKeyword(s.perm("tyrant"), "Collision")).toBe(true);

    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("tyrant").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tyrant").isSuspended);

    // The grant is inactive, so no forced-block window opens and the attack reaches security.
    expect(observe(s.engine).hasKeyword(s.perm("tyrant"), "Collision")).toBe(false);
    expect(observe(s.engine).blockingSeat()).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "declineBlock" })).toMatchObject({ ok: false });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  // KB Q5014: the grant may be given to a Digimon that is not affected by effects, but the
  // gained "[Start of Your Main Phase] This Digimon attacks." must NOT trigger while the
  // grantee is unaffected at the trigger timing.
  it("Q5014: the gained start-main attack does not trigger while the grantee is unaffected", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-013", as: "chosen", dp: 20_000 }], hand: ["BT1-013"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoAcceptOptional: true },
    );
    await s.ready();
    preferred.push(s.perm("chosen").permanentId, s.perm("chosen").topCard!.instanceId);
    s.state.memory = 7;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("chosen"), "Collision"));

    // Blanket immunity to the opponent's effects, arriving after the grant was given.
    await advance(s.engine).verb.restrict(s.perm("chosen").permanentId, "beAffected", EffectDuration.Permanent);
    expect(observe(s.engine).hasKeyword(s.perm("chosen"), "Collision")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("chosen").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("chosen"))).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(observe(s.engine).blockingSeat()).toBeUndefined();

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
  // Peer / stack — Round 3 seam 5: this card prints the UNSCOPED "When attack targets change",
  // so its watcher fires for a switch caused by two other Digimon entirely. The peer BT11-008
  // prints "when THIS Digimon's attack target is switched" and carries `triggerAttackerIsSelf`;
  // on the very same board, in the same turn, with its [Your Turn] window open, it stays silent
  // for that switch and only pays out when it is itself the attacker.
  it("peer contrast: the unscoped watcher fires for another Digimon's switch, BT11-008's self-scoped one does not", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-010", as: "greymonHost", under: ["EX10-008"] },
          { card: "BT2-058", as: "blockerOne" },
        ],
        security: ["BT1-013"],
      },
      1: {
        battleArea: [
          { card: "BT1-013", as: "attacker" },
          { card: "BT1-013", as: "bearHost", under: ["BT11-008"] },
        ],
        security: ["BT1-009", "BT1-014"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(s.perm("bearHost").currentDP).toBe(5000);

    // Switch 1: neither watcher's host is involved — a third Digimon attacks and a fourth blocks.
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blockerOne").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    // EX10-008 (unscoped) fired even though its host neither attacked nor blocked.
    expect(s.state.players[1]!.security).toHaveLength(1);
    // BT11-008 (self-scoped) saw the same switch inside its own open [Your Turn] window and
    // stayed silent, because its host was not the attacker.
    expect(s.perm("bearHost").currentDP).toBe(5000);
  });

  // Live-watcher control for the contrast above, and the other half of the seam-5 reading: on a
  // board where the BT11-008 host IS the attacker, its self-scoped watcher pays out for the same
  // single switch that the unscoped EX10-008 watcher also answers.
  it("peer contrast control: BT11-008 pays out when its own host is the attacker, and EX10-008 still fires", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX10-010", as: "greymonHost", under: ["EX10-008"] },
          { card: "BT2-058", as: "blocker", dp: 1000 },
        ],
        security: ["BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-013", as: "bearHost", under: ["BT11-008"] }],
        security: ["BT1-009", "BT1-014"],
      },
    });
    await s.ready();
    s.state.turnSeat = 1;
    expect(s.perm("bearHost").currentDP).toBe(5000);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("bearHost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);

    expect(s.perm("bearHost").currentDP).toBe(8000);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  // KB Q5014, mirror positive — the grant works normally while the grantee's immunity gate is
  // shut. Public route throughout: `playCard`, then the real turn loop drives the gained attack.
  it("Q5014 mirror: the granted attack fires while BlackWarGreymon's immunity gate is shut", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "wall" }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX10-010", as: "black" }], hand: ["BT1-013"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoAcceptOptional: true },
    );
    await s.ready();
    preferred.push(s.perm("black").permanentId, s.perm("black").topCard!.instanceId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("black"), "Collision"));
    // Gate shut: seat 0's biggest Digimon is the 7000 DP MetalGreymon.
    expect(s.perm("black").currentDP).toBe(12000);
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("black").permanentId)).toHaveLength(1);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const opponentTurn = s.engine.runOneTurn();
    await settle(() => observe(s.engine).blockingSeat() === 0, 4000);
    expect(s.perm("black").isSuspended).toBe(true);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("black"))).toBe(true);

    expect(s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("wall").permanentId })).toEqual({
      ok: true,
    });
    await settle(() => !observe(s.engine).isAttacking(), 4000);
    expect(s.state.players[0]!.security).toHaveLength(1);

    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });

  // KB Q5014, end to end through public play — no `advance.verb.restrict`. The grantee's
  // immunity is opened by seat 0 publicly playing a printed 13000 DP Digimon, which arms
  // EX10-010's "[All Turns] While your opponent has a Digimon with 13000 DP or more, your
  // opponent's Digimon's effects don't affect this Digimon". Both granted halves must stop.
  it("Q5014: opening BlackWarGreymon's immunity gate through public play stops both granted halves", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-013", as: "wall" }],
          hand: [{ card: "EX10-008", as: "metalGreymon" }, { card: "BT8-030", as: "titan" }, "BT1-013"],
          security: ["BT1-009"],
        },
        1: { battleArea: [{ card: "EX10-010", as: "black" }], hand: ["BT1-013"] },
      },
      { autoSelectCards: true, preferInstanceIds: preferred, autoAcceptOptional: true },
    );
    await s.ready();
    preferred.push(s.perm("black").permanentId, s.perm("black").topCard!.instanceId);
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("metalGreymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).hasKeyword(s.perm("black"), "Collision"));
    expect(observe(s.engine).subscriptions("startOfYourMainPhase", s.perm("black").permanentId)).toHaveLength(1);

    // Public route to immunity: seat 0 plays a printed 13000 DP Digimon.
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("titan").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("black").currentDP === 15000);
    expect(s.perm("black").currentDP).toBe(15000);
    // The ＜Collision＞ half deactivates immediately (continuous.ts keywordGrantIsActive).
    expect(observe(s.engine).hasKeyword(s.perm("black"), "Collision")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = -Math.abs(s.state.memory);
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);

    // The gained "[Start of Your Main Phase] This Digimon attacks." must not apply either.
    expect(s.perm("black").isSuspended).toBe(false);
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("black"))).toBe(false);
    expect(observe(s.engine).blockingSeat()).toBeUndefined();
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);

    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
  });
});
