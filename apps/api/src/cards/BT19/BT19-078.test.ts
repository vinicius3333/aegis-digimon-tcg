import { describe, expect, it } from "vitest";
import type { DecisionRequest, Seat } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import "./BT19-078.js";

// BT19-078 ADR-01 Jeri — White / Lv.- (no level) / play cost 5 / DP 2000 / [Espionage Agent].
// Printed clauses:
//   1. [On Play] For each digivolution card of 1 of your [Mother D-Reaper]s, 1 of your
//      opponent's Digimon gets -1000 for the turn.
//   2. [Main] Place this Digimon as the bottom digivolution card of 1 of your
//      [Mother D-Reaper] without [ADR-01 Jeri] in its digivolution cards.
//   Inherited: [Opponent's Turn] When any of your opponent's Digimon attack, you may play
//      1 [ADR-01 Jeri] from this Digimon's digivolution cards without paying the cost. If
//      you played, you may change the attack target to the Digimon played by this effect.
//
// KB (`node tools/kb/query.mjs card BT19-078`): Q3137 — after playing [ADR-01 Jeri] from the
// digivolution cards for free, the controller MAY decline to change the attack target.
//
// White / level-less rules read for this lane (comprehensive 2-4-2, 2-9-2): White carries no
// special play rule. BT19-078 and its host EX2-007 [Mother D-Reaper] both print no level, so
// they are treated as having no level — which is what lets EX2-007, a Digi-Egg card with a
// printed DP, sit in the BATTLE area without the level-2-or-lower rule sweep removing it.
// That host claim from the prior audit is verified explicitly below.

/** Inert main-deck filler and security; BT1-009/013/014 print no effect text and no Digi-Egg. */
const FILLER = ["BT1-009", "BT1-013", "BT1-014", "BT1-009"];
const SECURITY = ["BT1-009", "BT1-013", "BT1-014"];

/**
 * Answer each `optional` prompt in arrival order. The inherited clause raises TWO optionals
 * (the free play, then the target change), so the blanket `autoAcceptOptional` /
 * `autoDeclineOptional` flags cannot express Q3137's "accept the play, decline the change".
 */
function optionalScript(answers: boolean[]): { prompts: string[]; drive(s: ReturnType<typeof setupEngine>): void } {
  const prompts: string[] = [];
  const answered = new Set<string>();
  let next = 0;
  return {
    prompts,
    drive(s) {
      for (const { seat, req } of s.decisions as { seat: Seat; req: DecisionRequest }[]) {
        if (req.kind !== "optional" || answered.has(req.decisionId)) continue;
        answered.add(req.decisionId);
        prompts.push(req.promptText);
        const accept = answers[next] ?? false;
        next += 1;
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "optional", accept },
        });
      }
    },
  };
}

describe("BT19-078 ADR-01 Jeri", () => {
  it("compiles exact-name [Mother D-Reaper]/[ADR-01 Jeri] gates, the scaled debuff, and the optional redirect", () => {
    const card = runtimeCompiledCard("BT19-078");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    // Both bracketed refs are EXACT names, never the `name` substring mode.
    expect(card?.effects.find((e) => e.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "ModifyDP",
      amount: -1000,
      duration: "forTheTurn",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      scaling: {
        per: 1,
        unit: "digivolutionCardsOfFiltered",
        filter: { controller: "mine", nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }] },
      },
    });
    expect(card?.effects.find((e) => e.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlaceUnder",
      targetIsPermanent: true,
      position: "bottom",
      target: { isSelf: true },
      underFilter: {
        controller: "mine",
        nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
        excludeCardsNamed: ["ADR-01 Jeri"],
      },
    });
    const inherited = card?.effects.find((e) => e.trigger === "OpponentsTurn");
    expect(inherited?.isInherited).toBe(true);
    expect(inherited?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      // "any of YOUR OPPONENT'S Digimon attack": the attack subject is filtered to the
      // opposing seat, so the carrier's own forced attacks never arm it.
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        {
          kind: "PlayWithoutCost",
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
          bindResultAs: "playedJeri",
          target: { filter: { nameOrTrait: [{ tokens: ["ADR-01 Jeri"], match: "nameExact" }] } },
        },
        { kind: "RedirectAttack", optional: true, target: { filter: { boundRef: "playedJeri" } } },
      ],
    });
  });

  it("keeps the DP-bearing, level-less [Mother D-Reaper] Digi-Egg host on the battle area (CR 2-9-2)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-007", as: "mother" }], deck: FILLER, security: SECURITY },
      1: { deck: FILLER, security: SECURITY },
    });
    s.state.memory = 3;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    // The rule sweep for level-2-or-lower Digimon never reaches it: it has no level at all.
    expect(s.perm("mother").topCard?.cardId).toBe("EX2-007");
    expect(s.perm("mother").currentDP).toBe(15000);
    drive.endMainPhaseIfOpen(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  // ---------------------------------------------------------------------------
  // [On Play] For each digivolution card of 1 of your [Mother D-Reaper]s ...
  // ---------------------------------------------------------------------------

  it("subtracts 1000 per digivolution card of its own controller's [Mother D-Reaper]", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046"] },
            // Near miss on the exact-name gate: a same-controller permanent with a deeper
            // digivolution stack that is NOT named [Mother D-Reaper] contributes nothing.
            { card: "BT1-014", as: "decoy", under: ["BT1-009", "BT1-009", "BT1-009"] },
          ],
          hand: [{ card: "BT19-078", as: "jeri" }],
          deck: FILLER,
          security: SECURITY,
        },
        1: {
          // "1 of YOUR [Mother D-Reaper]s": the opponent's own copy must not be counted.
          battleArea: [
            { card: "BT1-009", as: "victim", dp: 6000 },
            { card: "EX2-007", as: "opponentMother", under: ["EX2-046", "EX2-046", "EX2-046", "EX2-046"] },
          ],
          deck: FILLER,
          security: SECURITY,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("victim").currentDP === 4000);
    await settle(() => false, 30);

    // 2 digivolution cards under the controller's Mother -> exactly -2000, not -3000
    // (the decoy stack) and not -6000 (the opponent's Mother).
    expect(s.perm("victim").currentDP).toBe(4000);
    expect(s.perm("opponentMother").currentDP).toBe(15000);
    // Realistic stack interaction: BT19-078 prints the [D-Reaper] form, so the host
    // EX2-007's own "[Your Turn][Once Per Turn] ... reduce its play cost by 1 for each of
    // this Digimon's digivolution cards" pays 2 of the 5 play cost (10 - 3 = 7).
    expect(s.state.memory).toBe(7);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("changes nothing when the controller's [Mother D-Reaper] has no digivolution cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother" }],
          hand: [{ card: "BT19-078", as: "jeri" }],
          deck: FILLER,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim", dp: 6000 }], deck: FILLER, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jeri").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-078"));
    await settle(() => false, 30);

    expect(s.perm("victim").currentDP).toBe(6000);
    expect(s.state.memory).toBe(5);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // [Main] Place this Digimon as the bottom digivolution card of 1 of your
  // [Mother D-Reaper] without [ADR-01 Jeri] in its digivolution cards.
  // ---------------------------------------------------------------------------

  it("places itself at the stack bottom of the Mother that has no [ADR-01 Jeri] under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            // EX2-049 is a DIFFERENT printing whose printed name is also exactly
            // [ADR-01 Jeri], so `excludeCardsNamed` (an exact name compare) rules this host
            // out — the clause is about the NAME, not the card number.
            { card: "EX2-007", as: "blockedMother", under: [{ card: "EX2-049", as: "otherJeri" }] },
            { card: "EX2-007", as: "openMother", under: [{ card: "EX2-046", as: "searcher" }] },
            { card: "BT19-078", as: "jeri" },
          ],
          deck: FILLER,
          security: SECURITY,
        },
        1: { deck: FILLER, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const jeriInstanceId = s.inst("jeri").instanceId;
    const searcherInstanceId = s.inst("searcher").instanceId;
    const jeriPermanentId = s.perm("jeri").permanentId;

    const entries = JSON.parse(s.perm("jeri").activatableEffectsJson || "[]") as { effectKey: string }[];
    expect(entries).toHaveLength(1);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("jeri").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("openMother").stack.length === 2);
    await settle(() => false, 30);

    // Bottom digivolution card: `Permanent.stack` is bottom-first.
    expect(s.perm("openMother").stack.map((card) => card.instanceId)).toEqual([jeriInstanceId, searcherInstanceId]);
    expect(s.perm("blockedMother").stack.map((card) => card.cardId)).toEqual(["EX2-049"]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === jeriPermanentId)).toBe(false);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("stays on the battle area when every [Mother D-Reaper] already has an [ADR-01 Jeri] under it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "blockedMother", under: [{ card: "EX2-049", as: "otherJeri" }] },
            { card: "BT19-078", as: "jeri" },
          ],
          deck: FILLER,
          security: SECURITY,
        },
        1: { deck: FILLER, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const jeriPermanentId = s.perm("jeri").permanentId;

    const entries = JSON.parse(s.perm("jeri").activatableEffectsJson || "[]") as { effectKey: string }[];
    if (entries.length > 0) {
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("jeri").topCard!.instanceId,
        effectKey: entries[0]!.effectKey,
      });
    }
    await settle(() => false, 60);

    expect(s.perm("blockedMother").stack.map((card) => card.cardId)).toEqual(["EX2-049"]);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.permanentId === jeriPermanentId)).toBe(true);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Inherited [Opponent's Turn] ... — Q3137
  // ---------------------------------------------------------------------------

  it("installs the watcher under its [Mother D-Reaper] host and redirects a real opponent attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: [{ card: "BT19-078", as: "buried" }] }],
          deck: FILLER,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: FILLER, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const buriedInstanceId = s.inst("buried").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    // [Opponent's Turn] scopes the watcher: it is installed from inside the host's
    // digivolution cards only while the opponent's turn is the live one.
    expect(observe(s.engine).subscriptions("whenOpponentAttacks", s.perm("mother").permanentId)).toHaveLength(1);
    const securityBefore = s.state.players[0]!.security.length;
    const memoryBeforeAttack = s.state.memory;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    // The exact buried card was played for free out of the host's digivolution cards ...
    const played = s.events.find((event) => event.kind === "cardPlayed" && event.cardId === "BT19-078");
    if (played?.kind !== "cardPlayed") throw new Error("BT19-078 was never played from the Mother D-Reaper");
    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.state.memory).toBe(memoryBeforeAttack);
    // ... and the attack landed on it instead of on the player, so security is untouched.
    expect(s.state.players[0]!.security).toHaveLength(securityBefore);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "attackDeclared",
        target: { kind: "permanent", permanentId: played.permanentId },
      }),
    );
    // 2000 DP Jeri vs a 3000 DP attacker: it takes the hit and is deleted, not the player.
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === buriedInstanceId)).toBe(false);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(buriedInstanceId);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may play Jeri and still decline the attack-target change (Q3137)", async () => {
    // Accept the free play, decline the redirect: two optionals in one effect, so the
    // blanket flags cannot express it.
    const script = optionalScript([true, false]);
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-007", as: "mother", under: [{ card: "BT19-078", as: "buried" }] }],
          deck: FILLER,
          security: SECURITY,
        },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: FILLER, security: SECURITY },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const buriedInstanceId = s.inst("buried").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);
    drive.endMainPhaseIfOpen(0);
    await drive.waitForMainPhase(1);
    const securityBefore = s.state.players[0]!.security.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      script.drive(s);
      return !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined && script.prompts.length >= 2;
    }, 800);

    // Jeri was played ...
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === buriedInstanceId)).toBe(true);
    expect(s.perm("mother").stack).toHaveLength(0);
    // ... but the attack stayed on the player, so a security card was checked.
    expect(s.state.players[0]!.security.length).toBe(securityBefore - 1);
    expect(script.prompts.length).toBeGreaterThanOrEqual(2);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not fire for its own controller's attack on its own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-007", as: "mother", under: [{ card: "BT19-078", as: "buried" }] },
            { card: "BT1-009", as: "ownAttacker" },
          ],
          deck: FILLER,
          security: SECURITY,
        },
        1: { deck: FILLER, security: SECURITY },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();
    const buriedInstanceId = s.inst("buried").instanceId;

    const loop = s.engine.startTurnLoop();
    const drive = advance(s.engine);
    await drive.waitForMainPhase(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("ownAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    await settle(() => false, 30);

    // [Opponent's Turn] + "your opponent's Digimon": neither condition holds here.
    expect(s.perm("mother").stack.map((card) => card.instanceId)).toEqual([buriedInstanceId]);
    expect(s.events.some((event) => event.kind === "cardPlayed" && event.cardId === "BT19-078")).toBe(false);
    drive.endMainPhaseIfOpen(0);

    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
