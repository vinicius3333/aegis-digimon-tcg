import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-077.js";

// BT19-077 Calumon — White / Lv.- (no level) / play cost 3 / DP 1000.
// Printed clauses:
//   1. [Security] You may play 1 Digimon card with 2000 DP or less from your hand without
//      paying the cost.
//   2. [Main] By suspending this Digimon, 1 of your Digimon may digivolve into a Digimon
//      card in the hand with the digivolution cost reduced by 2.
//   3. [All Turns] This Digimon can't attack or block.
//   4. [On Deletion] Place this card on top of your security stack.
//
// KB (`node tools/kb/query.mjs card BT19-077`): Q3136, Q6243.
//   Q3136 — the [Main] effect cannot be activated at the same time as another digivolving
//     effect (P-103 [Offense Training]), because no two [Main] effects may be activated
//     simultaneously. There is no intent that even expresses "activate two [Main] effects at
//     once": `activateEffect` names one effectKey on one source and the engine resolves it
//     to completion before another is accepted. The ruling is a restatement of that
//     one-at-a-time model rather than card behaviour, so it is covered structurally below —
//     each activation is a separate intent and the second is refused once the cost is spent.
//   Q6243 — a security check of this card activates its [Security] effect and THEN it
//     battles the attacker. Proved end to end in the security test.
//
// Level-less rules (comprehensive 2-9-2): a card with no level printed is treated as having
// no level. It is not a level-2-or-lower Digimon, so the battle-area rule sweep never
// removes it, and no ordinary digivolution route reaches it (nothing is "one level higher"
// than no level). Both facts are asserted below.

describe("BT19-077 Calumon", () => {
  it("compiles the security play, the suspend-cost reduced digivolve, the [All Turns] lock, and security recovery", () => {
    const card = runtimeCompiledCard("BT19-077");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Security",
        actions: [
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            // A hand card is matched by `definitionMatches`, which reads the `dp` object form
            // against the PRINTED DP (matching/definition.ts:207) — this is not the dropped
            // `playCost: {op,value}` loose-card form.
            target: { filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte", value: 2000 } } },
          },
        ],
      },
      {
        trigger: "Main",
        actions: [
          {
            kind: "Digivolve",
            from: ["hand"],
            payCost: true,
            reduceCost: 2,
            cost: { kind: "suspend", target: { isSelf: true } },
          },
        ],
      },
      // The printed marker is [All Turns], so the trigger must be `AllTurns`, never `Static`.
      { trigger: "AllTurns", actions: [{ kind: "Restrict", restriction: "attackOrBlock", duration: "permanent" }] },
      // No `source`: the self form of placeAsSecurity, which is the only one that still
      // resolves once the permanent has left the board (actions/security.ts:363-370).
      { trigger: "OnDeletion", actions: [{ kind: "SecurityManipulation", op: "placeAsSecurity", toTop: true }] },
    ]);
  });

  it("is treated as having no level, so the battle-area rule sweep leaves it alone (CR 2-9-2)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT19-077", as: "calumon" }], deck: ["BT1-010"], security: ["BT1-009", "BT1-013"] },
      1: { deck: ["BT1-010", "BT1-011"], security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    // Still on the board after a full production entry + rule-check pass.
    expect(s.perm("calumon").topCard?.cardId).toBe("BT19-077");
    expect(s.perm("calumon").currentDP).toBe(1000);
    drive.endMainPhaseIfOpen(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [Security] — Q6243
  // ---------------------------------------------------------------------------

  it("plays a 2000-DP-or-less Digimon free from the security check, then battles the attacker (Q6243)", async () => {
    let memoryAtPlay: number | undefined;
    let memoryBeforeCheck: number | undefined;
    const s = setupEngine(
      {
        0: {
          // Top of the stack first: the attack checks BT19-077.
          security: [{ card: "BT19-077", as: "calumon" }, "BT1-009", "BT1-013"],
          hand: [
            { card: "BT1-012", as: "eligible" },
            { card: "BT1-009", as: "tooBig" },
          ],
          deck: ["BT1-010"],
        },
        // A 1000 DP attacker ties the 1000 DP Security Digimon, so both are deleted.
        1: {
          battleArea: [{ card: "BT1-011", as: "attacker" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        onEvent(event) {
          if (event.kind === "cardPlayed" && event.cardId === "BT1-012") memoryAtPlay = s.state.memory;
        },
      },
    );
    s.state.memory = 0;
    await s.ready();
    const calumonInstanceId = s.inst("calumon").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    memoryBeforeCheck = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 40);

    // The [Security] effect resolved: the 2000 DP Biyomon is on the board for free, and the
    // 3000 DP Monodramon was never an eligible candidate.
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-012"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    // "without paying the cost": no memory moved for the 3-cost Biyomon at the instant it
    // was played (memory afterwards belongs to the turn hand-off, not to this play).
    expect(memoryAtPlay).toBe(memoryBeforeCheck);
    // ... and THEN it battled: the 1000 DP attacker traded with the 1000 DP Security Digimon.
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    // CR 14-2-3: a Security Digimon is NOT deleted even when it loses its battle, so its
    // [On Deletion] never fires; CR 13-1-8-4 puts the checked card in the trash instead.
    // The two untouched security cards remain, and Calumon does NOT come back on top.
    expect(s.state.players[0]!.security.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-013"]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([calumonInstanceId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [Main] By suspending this Digimon, ... digivolve ... cost reduced by 2 — Q3136
  // ---------------------------------------------------------------------------

  it("suspends itself to digivolve another Digimon from hand for 2 less, keeping the base stack", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-014", as: "base", under: [{ card: "BT1-009", as: "older" }] },
          ],
          hand: [{ card: "BT1-024", as: "metal" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
        1: { security: ["BT1-009", "BT1-013"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    // "1 of your Digimon" also offers Calumon itself; pin the intended base.
    preferInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("metal").instanceId);
    const baseInstanceId = s.inst("base").instanceId;
    const olderInstanceId = s.inst("older").instanceId;

    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(entries).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT1-024");
    await settle(() => false, 30);

    // The cost was paid: Calumon is suspended.
    expect(s.perm("calumon").isSuspended).toBe(true);
    // MetalTyrannomon's printed Lv.4 route costs 3; reduced by 2 it costs 1 (3 - 1 = 2).
    expect(s.state.memory).toBe(2);
    expect(s.perm("base").currentDP).toBe(10000);
    expect(s.perm("base").stack.map((card) => card.instanceId)).toEqual([olderInstanceId, baseInstanceId]);
    // Digivolution bonus draw.
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);

    // Q3136's model in this engine: one activation, one intent. With the suspend cost spent,
    // the effect can no longer be activated again in the same window.
    const again = s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: s.perm("calumon").topCard!.instanceId,
      effectKey: entries[0]!.effectKey,
    });
    expect(again.ok).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] This Digimon can't attack or block.
  // ---------------------------------------------------------------------------

  it("refuses a real attack declaration while an unrestricted peer of the same board may attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-077", as: "calumon" },
          { card: "BT1-009", as: "peer" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-009", "BT1-013"],
      },
      1: { security: ["BT1-009", "BT1-013"] },
    });
    s.state.memory = 3;
    await s.ready();
    // `attackOrBlock` is expanded by the interpreter into the two enforced restrictions
    // (interpreter/actions/restrictions.ts:108).
    expect(observe(s.engine).isRestricted(s.perm("calumon"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("calumon"), "block")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "attack")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("peer"), "block")).toBe(false);

    const refused = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("calumon").permanentId,
      target: { kind: "player" },
    });
    expect(refused.ok).toBe(false);
    expect(s.state.players[1]!.security).toHaveLength(2);
    expect(s.perm("calumon").isSuspended).toBe(false);

    // The near-miss control: the same board's ordinary Digimon attacks normally.
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("peer").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });

  it("refuses a real block declaration in the opponent's open block window", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT19-077", as: "calumon" },
          // A real ＜Blocker＞ peer, so the block window genuinely opens and the refusal
          // below is about Calumon rather than about an empty window.
          { card: "EX6-012", as: "blocker" },
        ],
        deck: ["BT1-010"],
        security: ["BT1-009", "BT1-013"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker" }],
        deck: ["BT1-010", "BT1-011"],
        security: ["BT1-009", "BT1-013"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));

    const refused = s.engine.applyIntent(0, {
      type: "declareBlock",
      blockerPermanentId: s.perm("calumon").permanentId,
    });
    expect(refused.ok).toBe(false);

    // The same window accepts the unrestricted blocker, so the window was really open.
    expect(
      s.engine.applyIntent(0, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    // Security untouched: the block redirected the attack away from it.
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.perm("calumon").topCard?.cardId).toBe("BT19-077");
    expect(s.perm("calumon").isSuspended).toBe(false);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [On Deletion] Place this card on top of your security stack.
  // ---------------------------------------------------------------------------

  it("returns to the top of its owner's security stack when deleted in a real opponent-turn battle", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-077", as: "calumon" },
            { card: "BT1-014", as: "base" },
          ],
          hand: [{ card: "BT1-024", as: "metal" }],
          deck: ["BT1-010", "BT1-011"],
          security: [{ card: "BT1-009", as: "topSecurity" }, "BT1-013"],
        },
        1: {
          battleArea: [{ card: "BT1-013", as: "killer" }],
          deck: ["BT1-010", "BT1-011"],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    s.state.memory = 3;
    await s.ready();
    preferInstanceIds.push(s.perm("base").topCard!.instanceId, s.inst("metal").instanceId);
    const calumonInstanceId = s.inst("calumon").instanceId;
    const topSecurityId = s.inst("topSecurity").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);

    // Suspend Calumon the only way the card allows — by paying its own [Main] cost — so it
    // is a legal attack target on the opponent's turn.
    const entries = JSON.parse(s.perm("calumon").activatableEffectsJson ?? "[]") as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("calumon").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("calumon").isSuspended);
    drive.endMainPhaseIfOpen(0);

    await drive.waitForMainPhase(1);
    // It is still suspended on the opponent's turn: only ITS controller's unsuspend phase
    // would stand it up, and that has not come round again.
    expect(s.perm("calumon").isSuspended).toBe(true);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("killer").permanentId,
        target: { kind: "permanent", permanentId: s.perm("calumon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === calumonInstanceId));
    await settle(() => false, 30);

    // On TOP of the stack (index 0), above the security cards that were already there, and
    // never in the trash.
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([
      calumonInstanceId,
      topSecurityId,
      expect.any(String),
    ]);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).not.toContain(calumonInstanceId);
    expect(s.state.players[0]!.battleArea.map((perm) => perm.topCard?.cardId)).toEqual(["BT1-024"]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
