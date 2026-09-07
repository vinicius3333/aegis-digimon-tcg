import { EffectTiming } from "@aegis/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CardSource } from "../effects/CardSource.js";
import type { EffectModule } from "../effects/EffectModule.js";
import { registerCard, unregisterCard } from "../effects/registry.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";
import type { Effect } from "../effects/Effect.js";
import "../../cards/BT18/BT18-086.js";
import "../../cards/BT20/index.js";

/**
 * Internal fixture seam: the two real battle-area cards below temporarily expose one
 * OnSecurityCheck and one OnLoseSecurity effect so the test can inspect the cross-family
 * ordering pool. Their bodies mutate the real memory counter and append to a trace; no
 * production card registration or engine ordering code is replaced by this fixture.
 */
const ATTACKER_ID = "BT20-046";
// BT20-049 has no Blocker; BT20-047 (Solarmon) would intercept the public player attack
// before the Security check and make the intended Security decision unreachable.
const OPPONENT_ID = "BT20-049";
const originalModules = new Map<string, EffectModule | undefined>();
let trace: string[] = [];

function fixtureModule(cardId: string, label: string): EffectModule {
  return {
    cardId,
    effectsForTiming(timing: EffectTiming, _source: CardSource): Effect[] {
      if (timing !== EffectTiming.OnSecurityCheck && timing !== EffectTiming.OnLoseSecurity) return [];
      const family = timing === EffectTiming.OnSecurityCheck ? "check" : "lose";
      return [
        {
          effectKey: `fixture/${label}/${family}`,
          description: `fixture ${label} ${family}`,
          optional: false,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: () => true,
          resolve: async (ctx) => {
            trace.push(`${label}-${family}`);
            ctx.game.state.memory += 1;
          },
        },
      ];
    },
  };
}

beforeAll(() => {
  for (const [cardId, label] of [
    [ATTACKER_ID, "own"],
    [OPPONENT_ID, "opponent"],
  ] as const) {
    originalModules.set(cardId, unregisterCard(cardId));
    registerCard(fixtureModule(cardId, label));
  }
});

afterAll(() => {
  for (const cardId of [ATTACKER_ID, OPPONENT_ID]) {
    unregisterCard(cardId);
    const original = originalModules.get(cardId);
    if (original !== undefined) registerCard(original);
  }
});

describe("simultaneous Security-check trigger families", () => {
  it("orders reveal, OnSecurityCheck, and OnLoseSecurity together after [Security]", async () => {
    trace = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: ATTACKER_ID, as: "attacker" }],
        },
        1: {
          battleArea: [{ card: OPPONENT_ID, as: "opponent" }],
          security: [{ card: "BT18-086", faceUp: true }],
          trash: [{ card: "BT18-034", as: "lucemon" }],
        },
      },
      { autoAcceptOptional: false, autoOrderTriggers: false, autoSelectCards: false },
    );
    const attackerId = s.perm("attacker").permanentId;
    // Two independent subscriptions on the same real attacker keep the fixture entirely
    // inside the synthetic System-B seam; using BT20-048 here would run its real On Play
    // search during harness setup and mask the Security decision with an earlier prompt.
    for (const index of [0, 1]) {
      advance(s.engine).ledgers.subTriggers.subscribe({
        event: "whenCheckedFaceUpSecurity",
        sourcePermanentId: attackerId,
        once: false,
        description: `fixture reveal watcher ${index}`,
        run: async () => {
          trace.push(`reveal-${index}`);
          s.state.memory += 1;
        },
      });
    }

    expect(
      s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    const securityDecisionEntry = s.decisions.find(({ req }) => req.kind === "optional");
    expect(securityDecisionEntry).toBeDefined();
    const securityDecision = securityDecisionEntry!.req;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: securityDecision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
    const firstOrder = s.state.pendingDecision!;
    let decision = s.decisions.find(({ req }) => req.decisionId === firstOrder.decisionId)!;
    const firstRequest = decision.req;
    const firstCardIds = firstRequest.options?.triggerCardIds ?? [];
    // RED before the cross-family fix: the reveal bus has already resolved separately, so this
    // prompt contains only the two reveal watchers. The expected shared pool has both reveal
    // entries plus own OnSecurityCheck and own OnLoseSecurity; opponent entries follow later.
    expect(firstCardIds).toHaveLength(4);
    expect(firstCardIds.filter((cardId) => cardId === ATTACKER_ID)).toHaveLength(4);
    expect(firstCardIds).not.toContain(OPPONENT_ID);

    const chosenCardIds: string[] = [];
    let request = firstRequest;
    while (s.state.pendingDecision?.kind === "orderTriggers") {
      const keys = request.options?.triggerKeys ?? [];
      const cardIds = request.options?.triggerCardIds ?? [];
      expect(keys.length).toBeGreaterThan(0);
      chosenCardIds.push(cardIds[0]!);
      expect(
        s.engine.applyIntent(decision.seat, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "orderTriggers", order: [keys[0]!] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.decisionId !== request.decisionId);
      if (s.state.pendingDecision?.kind !== "orderTriggers") break;
      decision = s.decisions.find(({ req }) => req.decisionId === s.state.pendingDecision!.decisionId)!;
      request = decision.req;
    }

    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.state.memory).toBe(6);
    expect(trace).toHaveLength(6);
    expect(trace.slice(0, 4)).toEqual(expect.arrayContaining(["reveal-0", "reveal-1", "own-check", "own-lose"]));
    expect(trace.indexOf("own-check")).toBeLessThan(trace.indexOf("opponent-check"));
    expect(trace.indexOf("own-lose")).toBeLessThan(trace.indexOf("opponent-lose"));
    expect(chosenCardIds).toContain(OPPONENT_ID);
    expect(s.events).toContainEqual(
      expect.objectContaining({
        kind: "effectResolved",
        effectKey: "fixture/own/lose",
        timing: "OnLoseSecurity",
      }),
    );
  });
});
