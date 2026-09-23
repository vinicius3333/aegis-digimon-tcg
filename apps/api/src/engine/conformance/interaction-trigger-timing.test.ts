import { EffectTiming, Zone, type ServerEvent } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { extractCardById, insertCard } from "../state/access.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine, type EngineSetup } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import { cite } from "./_kb.js";
import "../../cards/index.js";

/**
 * Trigger timing and ordering between real cards (interaction coverage plan, workstream A).
 *
 * Each describe block proves one rule with real card IDs. Seed cases from player reports
 * that already have a behavioral regression elsewhere are listed here instead of copied:
 * - EX13 Magnamon end-of-turn timing and Reboot: `ex13MagnamonEndTurnScenario.test.ts`.
 * - KingSukamon ordering inside an Option body: `cards/EX13/EX13-031.test.ts`.
 * - Analogman against every redirect card: `opponentAttackRedirectOrdering.test.ts`.
 */

type TriggeredEvent = Extract<ServerEvent, { kind: "effectTriggered" }>;

function triggeredEvents(s: EngineSetup): TriggeredEvent[] {
  return s.events.filter((event): event is TriggeredEvent => event.kind === "effectTriggered");
}

function eventIndex(s: EngineSetup, matches: (event: ServerEvent) => boolean): number {
  return s.events.findIndex(matches);
}

describe("rule 1: the turn player's triggered effects resolve before the non-turn player's (§15-4-3-5)", () => {
  it("resolves the turn player's EX13-028 On Deletion before the opponent's after a mutual battle deletion", async () => {
    cite(
      "comprehensive-0164",
      "§15-4-3-5-1/2 turn player activates all own pending effects first",
      "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-028", as: "turnSukamon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "EX13-028", as: "otherSukamon", suspended: true }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const turnSource = s.perm("turnSukamon").topCard.instanceId;
    const otherSource = s.perm("otherSukamon").topCard.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("turnSukamon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("otherSukamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    const onDeletion = triggeredEvents(s).filter(({ sourceCardId }) => sourceCardId === "EX13-028");
    expect(onDeletion.map(({ seat, sourceInstanceId }) => ({ seat, sourceInstanceId }))).toEqual([
      { seat: 0, sourceInstanceId: turnSource },
      { seat: 1, sourceInstanceId: otherSource },
    ]);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    assertNoLoudGap(s);
  });

  const proveBattleDeletionOrder = async (turnSeat: 0 | 1) => {
    cite(
      "comprehensive-0164",
      "§15-4-3-2/4/5-1/5-2 each player chooses pending effects one at a time, turn player first",
      "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494",
    );
    const otherSeat = turnSeat === 0 ? 1 : 0;
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST3-10", as: "firstHost", under: ["EX13-031"] },
            { card: "EX13-028", as: "firstSukamon", suspended: turnSeat === 1 },
          ],
          deck: [{ card: "BT11-036", as: "firstDeclined" }, "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST3-10", as: "secondHost", under: ["EX13-031"] },
            { card: "EX13-028", as: "secondSukamon", suspended: turnSeat === 0 },
          ],
          deck: [{ card: "BT11-036", as: "secondDeclined" }, "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoOrderTriggers: false },
    );
    s.state.turnSeat = turnSeat;
    await s.ready();

    expect(
      s.engine.applyIntent(turnSeat, {
        type: "attack",
        attackerPermanentId: s.perm(turnSeat === 0 ? "firstSukamon" : "secondSukamon").permanentId,
        target: {
          kind: "permanent",
          permanentId: s.perm(turnSeat === 0 ? "secondSukamon" : "firstSukamon").permanentId,
        },
      }),
    ).toEqual({ ok: true });

    const choose = async (seat: 0 | 1, cardId: string) => {
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers" && s.state.pendingDecision.seat === seat);
      const req = s.decisions.findLast((entry) => entry.req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      const cardIds = req.options?.triggerCardIds ?? [];
      const keys = req.options?.triggerKeys ?? [];
      expect([...cardIds].sort()).toEqual(["EX13-028", "EX13-031"]);
      expect(keys).toHaveLength(2);
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "orderTriggers", order: [keys[cardIds.indexOf(cardId)]!] },
        }),
      ).toEqual({ ok: true });
    };

    const declineRevealedPlay = async (seat: 0 | 1, instanceId: string) => {
      await settle(() => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.seat === seat);
      const req = s.decisions.findLast((entry) => entry.req.decisionId === s.state.pendingDecision!.decisionId)!.req;
      expect(req.options?.candidateInstanceIds).toContain(instanceId);
      expect(req.options?.min).toBe(0);
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }),
      ).toEqual({ ok: true });
    };

    await choose(turnSeat, "EX13-031");
    await declineRevealedPlay(turnSeat, s.inst(turnSeat === 0 ? "firstDeclined" : "secondDeclined").instanceId);
    await choose(otherSeat, "EX13-028");
    await declineRevealedPlay(otherSeat, s.inst(otherSeat === 0 ? "firstDeclined" : "secondDeclined").instanceId);
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers").map(({ seat }) => seat)).toEqual([
      turnSeat,
      otherSeat,
    ]);
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST3-10"]);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["ST3-10"]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("firstDeclined").instanceId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("secondDeclined").instanceId,
    );
    assertNoLoudGap(s);
    return triggeredEvents(s)
      .filter(({ sourceCardId }) => sourceCardId === "EX13-028" || sourceCardId === "EX13-031")
      .map(({ seat, sourceCardId }) => ({ seat, sourceCardId }));
  };

  it("lets seat 0 order simultaneous deletion effects and decline play before seat 1 chooses", async () => {
    expect(await proveBattleDeletionOrder(0)).toEqual([
      { seat: 0, sourceCardId: "EX13-031" },
      { seat: 0, sourceCardId: "EX13-028" },
      { seat: 1, sourceCardId: "EX13-028" },
      { seat: 1, sourceCardId: "EX13-031" },
    ]);
  });

  it("lets seat 1 order simultaneous deletion effects and decline play before seat 0 chooses", async () => {
    expect(await proveBattleDeletionOrder(1)).toEqual([
      { seat: 1, sourceCardId: "EX13-031" },
      { seat: 1, sourceCardId: "EX13-028" },
      { seat: 0, sourceCardId: "EX13-028" },
      { seat: 0, sourceCardId: "EX13-031" },
    ]);
  });

  it("drops a pending battle deletion watcher when an earlier On Deletion removes its surviving source", async () => {
    cite(
      "comprehensive-0165",
      "§15-4-4-3/5 a pending watcher cannot activate after its source card leaves",
      "137ce0b5cdb62243311b56cff2421d30b78d421a36fdab4d09672961629897f3",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX13-063", as: "princeMamemon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "ST3-10", as: "watcherHost", under: ["EX13-031"] },
            { card: "EX13-028", as: "sukamon", dp: 12_000, suspended: true },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("princeMamemon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("sukamon").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(triggeredEvents(s).filter(({ sourceCardId }) => sourceCardId === "EX13-063")).toHaveLength(2);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(triggeredEvents(s).filter(({ sourceCardId }) => sourceCardId === "EX13-031")).toHaveLength(0);
    assertNoLoudGap(s);
  });
});

describe("rules 2 and 3: On Deletion and deletion watchers trigger together; the owner orders them (§15-4-3-2, §15-4-3-4)", () => {
  // KB Q7299: KingSukamon's inherited watcher triggers on the deletion of any other [Sukamon].
  it.each([
    ["KingSukamon watcher first", "EX13-031", "EX13-028"],
    ["Sukamon On Deletion first", "EX13-028", "EX13-031"],
  ])("offers both in one order request and resolves them as chosen (%s)", async (_label, first, second) => {
    cite(
      "comprehensive-0164",
      "§15-4-3-2 and §15-4-3-4 simultaneous triggers; the player picks each next",
      "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX13-035", as: "kingEtemon", under: ["EX13-031"] },
            { card: "EX13-028", as: "deletedSukamon" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: { security: ["BT1-009"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: false },
    );
    await s.ready();

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    const deletion = advance(s.engine).verb.deletePermanent([s.perm("deletedSukamon").permanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const order = s.decisions.findLast(({ req }) => req.kind === "orderTriggers")!.req;
    expect(order.seat).toBe(0);
    const cardIds = order.options?.triggerCardIds ?? [];
    const keys = order.options?.triggerKeys ?? [];
    expect([...cardIds].sort()).toEqual(["EX13-028", "EX13-031"]);
    expect(keys).toHaveLength(2);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderTriggers", order: [keys[cardIds.indexOf(first)]!] },
      }),
    ).toEqual({ ok: true });
    await deletion;
    await settle(() => s.state.pendingDecision === undefined);

    const activated = triggeredEvents(s)
      .map(({ sourceCardId }) => sourceCardId)
      .filter((cardId) => cardId === first || cardId === second);
    expect(activated).toEqual([first, second]);
  });
});

describe("rule 4: When Attacking and opponent-attack watchers trigger together; the turn player goes first (§15-4-3-5)", () => {
  // KB Q1976/Q1993: a [When Attacking] effect and an [Opponent's Turn] "when an opponent's
  // Digimon attacks" effect trigger simultaneously off one declaration.
  it("resolves EX6 Shoutmon's Alliance and When Attacking before MetalEtemon and the inherited EX5 Etemon", async () => {
    cite(
      "comprehensive-0164",
      "§15-4-3-5 turn player's attack triggers before the non-turn player's watchers",
      "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX5-054", as: "metalEtemon", under: ["BT12-067", "EX5-048"] },
            { card: "BT1-009", as: "deleteTarget" },
          ],
          hand: [{ card: "BT11-040", as: "securityFodder" }],
          deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT19-014", as: "shoutmon" },
            { card: "BT1-012", as: "ally" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("shoutmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
    expect(s.engine.applyIntent(1, { type: "respondAlliance", allyPermanentId: s.perm("ally").permanentId })).toEqual({
      ok: true,
    });
    await advance(s.engine).finishAttack();

    const triggered = triggeredEvents(s);
    const whenAttacking = triggered.findIndex(
      ({ seat, sourceCardId, timing }) => seat === 1 && sourceCardId === "BT19-014" && timing === "OnUseAttack",
    );
    const firstOpponentWatcher = triggered.findIndex(({ seat }) => seat === 0);
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(firstOpponentWatcher).toBeGreaterThan(whenAttacking);
    expect(triggered.slice(firstOpponentWatcher).every(({ seat }) => seat === 0)).toBe(true);
    expect(triggered.filter(({ seat }) => seat === 0).map(({ sourceCardId }) => sourceCardId)).toEqual(
      expect.arrayContaining(["EX5-054", "EX5-048"]),
    );
    const alliancePrompt = eventIndex(s, (event) => event.kind === "alliancePrompt");
    const firstOpponentEvent = eventIndex(s, (event) => event.kind === "effectTriggered" && event.seat === 0);
    expect(alliancePrompt).toBeGreaterThanOrEqual(0);
    expect(firstOpponentEvent).toBeGreaterThan(alliancePrompt);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("deleteTarget").instanceId);
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("resolves BT13-021's When Attacking before BT11 Analogman's redirect on an effect-driven attack", async () => {
    cite(
      "comprehensive-0164",
      "§15-4-3-5 turn player's When Attacking before the opponent's redirect",
      "8d2bf2fd50af6a37b28b64a0db252f4d9d0a9f033e72539337b25d6d330e5494",
    );
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT11-092", as: "analogman" },
            { card: "BT15-066", as: "machine" },
          ],
          security: ["BT1-009", "BT1-010"],
          deck: ["BT1-011", "BT1-012"],
        },
        1: {
          battleArea: [{ card: "BT13-021", as: "attacker", dp: 13_000 }],
          hand: [{ card: "BT25-016", as: "grapLeomon" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          security: ["BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("attacker").permanentId);

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("grapLeomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.events.some((event) => event.kind === "attackDeclared") && !observe(s.engine).isAttacking());

    const timings = triggeredEvents(s).map(({ sourceCardId, timing }) => `${sourceCardId}:${String(timing)}`);
    const whenAttacking = timings.indexOf("BT13-021:OnUseAttack");
    const redirect = timings.indexOf("BT11-092:whenOpponentAttacks");
    expect(whenAttacking).toBeGreaterThanOrEqual(0);
    expect(redirect).toBeGreaterThan(whenAttacking);
    expect(s.perm("analogman").isSuspended).toBe(true);
  });
});

describe("rule 5: effects triggered during resolution wait until the current effect finishes (§15-4-5)", () => {
  // KB Q7396 and Q4721: Grademon played by Alphamon's effect resolves its pending [On Play]
  // during the attack that Alphamon's watcher starts, so "if during an attack" is met.
  it.each(["BT20-053", "EX13-057"])(
    "holds %s's On Play until EX13 Alphamon's End of Turn effect ends, then resolves it inside the attack",
    async (grademonCardId) => {
      cite(
        "comprehensive-0166",
        "§15-4-5 an effect triggered while another resolves activates after it",
        "1222c92563620dadf3270b392417786f0fc452b6860684d806c4934a21d69632",
      );
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX13-060", as: "alphamon", under: ["BT1-010"], dp: 13_000 }],
            hand: [{ card: grademonCardId, as: "grademon" }],
            deck: ["BT1-011", "BT1-012"],
            security: ["BT1-013"],
          },
          1: {
            battleArea: [{ card: "BT1-009", as: "victim", dp: 12_000 }],
            deck: ["BT1-013"],
            security: ["BT1-014"],
          },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          preferTriggerKeys: ["EX13-060"],
          preferInstanceIds: preferred,
        },
      );
      preferred.push(s.inst("grademon").instanceId);
      s.state.memory = 8;
      await s.ready();

      await advance(s.engine).fire(EffectTiming.EndOfYourTurn, s.perm("alphamon"));
      await settle(() => s.state.pendingDecision === undefined);

      const played = eventIndex(
        s,
        (event) => event.kind === "cardsMoved" && event.instanceIds.includes(s.inst("grademon").instanceId),
      );
      const endOfTurnResolved = eventIndex(
        s,
        (event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-060",
      );
      const attackDeclared = eventIndex(s, (event) => event.kind === "attackDeclared");
      const onPlay = eventIndex(
        s,
        (event) => event.kind === "effectTriggered" && event.sourceCardId === grademonCardId,
      );
      const securityChecked = eventIndex(s, (event) => event.kind === "securityChecked");
      expect(played).toBeGreaterThanOrEqual(0);
      expect(endOfTurnResolved).toBeGreaterThan(played);
      expect(onPlay).toBeGreaterThan(endOfTurnResolved);
      expect(onPlay).toBeGreaterThan(attackDeclared);
      expect(securityChecked).toBeGreaterThan(onPlay);
      expect(s.perm("grademon").currentDP).toBe(12_000);
      assertNoLoudGap(s);
    },
  );
});

describe("rule 6: Once Per Turn resets for a new Digimon (§8-2-2-1-6, §15-14-1-5-2)", () => {
  it("lets BT12-002's inherited When Attacking draw again after Paildramon DNA digivolves in the same turn", async () => {
    cite(
      "comprehensive-0128",
      "§8-2-2-1-6 any [X Per Turn] uses on a DNA digivolved card are reset",
      "02b80dca372bc98ad0cc8f7d5ba591813794fc7b1bddef565b6b83b8f28daf58",
    );
    cite(
      "comprehensive-0193",
      "§15-14-1-5-2 uses reset when the card becomes a new card",
      "b18368c15408ced59ec2cebcf84779b30e851cc34973ebf428203c4f4295e8cf",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-037", as: "lighdramon", under: ["BT12-002", "BT12-021"] },
            { card: "BT12-022", as: "exveemon" },
          ],
          hand: [{ card: "BT12-028", as: "paildramon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009"],
        },
        1: {
          deck: ["BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-010", "BT1-010", "BT1-010", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const demiVeemon = s.perm("lighdramon").stack[0]!.instanceId;
    const inheritedDraws = () =>
      triggeredEvents(s).filter(({ sourceInstanceId }) => sourceInstanceId === demiVeemon).length;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lighdramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(inheritedDraws()).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("exveemon").permanentId, s.perm("lighdramon").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    const paildramon = s.state.players[0]!.battleArea.find(({ topCard }) => topCard.cardId === "BT12-028");
    expect(paildramon?.stack.map(({ instanceId }) => instanceId)).toContain(demiVeemon);
    expect(paildramon?.isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: paildramon!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(inheritedDraws()).toBe(2);
  });

  it("lets BT13-021 use its Once Per Turn When Attacking again after it leaves and is played again", async () => {
    cite(
      "comprehensive-0193",
      "§15-14-1-5-2 uses reset when the card becomes a new card",
      "b18368c15408ced59ec2cebcf84779b30e851cc34973ebf428203c4f4295e8cf",
    );
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT13-021", as: "gaomon" }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: { deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    const gaomon = s.perm("gaomon").topCard;
    const own = s.state.players[0]!;
    const uses = () => triggeredEvents(s).filter(({ sourceInstanceId }) => sourceInstanceId === gaomon.instanceId);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gaomon"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("gaomon"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(uses()).toHaveLength(1);

    advance(s.engine).verb.enterEffectResolution(0, ["Digimon"]);
    await advance(s.engine).verb.deletePermanent([s.perm("gaomon").permanentId], "byEffect");
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);
    const card = extractCardById(own, Zone.Trash, gaomon.instanceId);
    expect(card).toBeDefined();
    insertCard(own, Zone.Hand, card!);

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: gaomon.instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    const replayed = own.battleArea.find(({ topCard }) => topCard.instanceId === gaomon.instanceId);
    expect(replayed).toBeDefined();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, replayed!);
    await settle(() => s.state.pendingDecision === undefined);
    expect(uses()).toHaveLength(2);
  });
});
