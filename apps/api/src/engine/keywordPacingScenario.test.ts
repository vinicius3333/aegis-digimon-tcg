import {
  KEYWORD_PACING_SCENARIOS,
  KEYWORD_TURN_PACING_SCENARIOS,
  KEYWORD_PROTECTION_PACING_SCENARIOS,
  KEYWORD_STACK_PACING_SCENARIOS,
  Phase,
  type KeywordPacingScenario,
} from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("real keyword pacing boards", () => {
  for (const scenario of KEYWORD_STACK_PACING_SCENARIOS) {
    it(`${scenario.id} moves only the chosen physical stack through a public action`, async () => {
      const s = setupEngine({ 0: {}, 1: {} });
      s.engine.stagedDecks[0] = BLUE_DECK;
      s.engine.stagedDecks[1] = RED_DECK;
      s.engine.startDevScenario(scenario.id);
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const seat = scenario.flow === "de-digivolve" ? 1 : 0;
        const host = s.state.players[seat]!.battleArea[0]!;
        const control = s.state.players[seat]!.battleArea[1]!;
        const initial = [host, control].map((permanent) =>
          [...permanent.stack, permanent.topCard].map((card) => card.instanceId),
        );
        if (scenario.flow === "de-digivolve") {
          expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-keyword-stack-option" })).toEqual({
            ok: true,
          });
          await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
          const choice = s.state.pendingDecision!;
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: choice.decisionId,
              response: { kind: "chooseTargets", instanceIds: [host.permanentId] },
            }),
          ).toEqual({ ok: true });
          await settle(() => host.topCard.cardId === scenario.expectedTopCardId);
          expect(host.stack).toHaveLength(4 - scenario.removedCount);
          expect(host.stack[0]!.cardId).toBe("BT1-001");
          const strips = s.events.filter(
            (event) => event.kind === "cardsMoved" && event.strippedStackTops?.reason === "deDigivolve",
          );
          expect(strips.flatMap((event) => event.instanceIds)).toEqual(
            initial[0]!.slice(-scenario.removedCount).reverse(),
          );
          expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(
            initial[0]!.slice(-scenario.removedCount).reverse(),
          );
        } else {
          const effect = observe(s.engine)
            .activatableEffects(host)
            .find((entry) => entry.effectKey.startsWith("BT4-046/"))!;
          expect(
            s.engine.applyIntent(0, {
              type: "activateEffect",
              sourceInstanceId: host.topCard.instanceId,
              effectKey: effect.effectKey,
            }),
          ).toEqual({ ok: true });
          await settle(() => s.state.pendingDecision?.kind === "selectCards");
          const choice = s.state.pendingDecision!;
          expect(s.decisions.at(-1)!.req.options?.purpose).toBe("cost");
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: choice.decisionId,
              response: { kind: "selectCards", instanceIds: initial[0]!.slice(0, 2) },
            }),
          ).toEqual({ ok: true });
          await settle(() =>
            s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT4-046"),
          );
          expect(host.topCard.cardId).toBe("BT4-046");
          expect(host.stack.map((card) => card.instanceId)).toEqual(initial[0]!.slice(2, -1));
          expect(s.state.players[1]!.battleArea).toHaveLength(scenario.deletesTarget ? 0 : 1);
          if (!scenario.deletesTarget) expect(s.state.players[1]!.battleArea[0]!.currentDP).toBe(8000);
          const strips = s.events.filter(
            (event) => event.kind === "cardsMoved" && event.trashedSources?.permanentId === host.permanentId,
          );
          expect(strips.flatMap((event) => event.instanceIds)).toEqual(initial[0]!.slice(0, 2));
        }
        expect([...control.stack, control.topCard].map((card) => card.instanceId)).toEqual(initial[1]);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      }
    });
  }
  for (const scenario of KEYWORD_PROTECTION_PACING_SCENARIOS) {
    it(`${scenario.id} protects or deletes printed cards through a public attack`, async () => {
      const s = setupEngine({ 0: {}, 1: {} });
      s.engine.stagedDecks[0] = BLUE_DECK;
      s.engine.stagedDecks[1] = RED_DECK;
      s.engine.startDevScenario(scenario.id);
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const holder = s.state.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-keyword-protected")!;
        const oldTop = holder.topCard;
        const oldSources = [...holder.stack];
        expect(observe(s.engine).hasKeyword(holder, scenario.keyword)).toBe(true);
        expect(holder.currentDP).toBe(scenario.flow === "evade" ? 2000 : 5000);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: scenario.flow === "evade" ? "dev-perm-0-keyword-attacker" : holder.permanentId,
            target:
              scenario.flow === "evade"
                ? { kind: "player" }
                : { kind: "permanent", permanentId: "dev-perm-1-keyword-defender" },
          }),
        ).toEqual({ ok: true });
        if (scenario.flow === "evade") {
          await settle(() => s.events.some((event) => event.kind === "evadePrompt"));
          expect(holder.isSuspended).toBe(false);
          expect(
            s.engine.applyIntent(0, { type: "respondEvade", permanentId: holder.permanentId, accept: scenario.accept }),
          ).toEqual({ ok: true });
        } else {
          await settle(() => s.state.pendingDecision?.kind === "selectCards");
          const decision = s.state.pendingDecision!;
          expect(s.decisions.at(-1)!.req.options?.candidateInstanceIds).toEqual([oldTop.instanceId]);
          expect(s.events.filter((event) => event.kind === "battleCompared")).toHaveLength(1);
          expect(
            s.engine.applyIntent(0, {
              type: "respondDecision",
              decisionId: decision.decisionId,
              response: { kind: "selectCards", instanceIds: scenario.accept ? [oldTop.instanceId] : [] },
            }),
          ).toEqual({ ok: true });
        }
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === holder.permanentId)).toBe(scenario.accept);
        expect(s.state.players[1]!.security).toHaveLength(scenario.flow === "evade" ? 4 : 5);
        if (scenario.accept) {
          expect(holder.isSuspended).toBe(true);
          if (scenario.flow === "armor-purge") {
            expect(holder.topCard.instanceId).toBe(oldSources[0]!.instanceId);
            expect(holder.topCard.cardId).toBe("BT1-009");
            expect(holder.currentDP).toBe(6000);
            expect(holder.stack).toHaveLength(0);
            expect(
              s.events.filter(
                (event) => event.kind === "cardsMoved" && event.strippedStackTops?.reason === "armorPurge",
              ),
            ).toEqual([
              expect.objectContaining({
                kind: "cardsMoved",
                instanceIds: [oldTop.instanceId],
                cardIds: ["BT8-012"],
                seat: 0,
                from: "battleArea",
                to: "trash",
                strippedStackTops: { permanentId: holder.permanentId, reason: "armorPurge" },
              }),
            ]);
          }
        }
        const trashed = s.state.players[0]!.trash.map((card) => card.instanceId);
        expect(trashed.includes(oldTop.instanceId)).toBe(scenario.flow === "armor-purge" || !scenario.accept);
        for (const source of oldSources) expect(trashed.includes(source.instanceId)).toBe(!scenario.accept);
      } finally {
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      }
    });
  }
  for (const scenario of KEYWORD_TURN_PACING_SCENARIOS) {
    it(`${scenario.id} resolves through public attacks and a turn handoff`, async () => {
      const s = setupEngine({ 0: {}, 1: {} });
      s.engine.stagedDecks[0] = BLUE_DECK;
      s.engine.stagedDecks[1] = RED_DECK;
      s.engine.startDevScenario(scenario.id);
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        if (scenario.flow === "reboot") {
          for (let index = 0; index < 3; index++) {
            const attacker = s.state.players[0]!.battleArea[index]!;
            expect(observe(s.engine).hasKeyword(attacker, "Reboot")).toBe(index < 2);
            expect(
              s.engine.applyIntent(0, {
                type: "attack",
                attackerPermanentId: attacker.permanentId,
                target: { kind: "permanent", permanentId: `dev-perm-1-keyword-reboot-target-${index}` },
              }),
            ).toEqual({ ok: true });
            await settle(() => !observe(s.engine).isAttacking());
            expect(attacker.isSuspended).toBe(true);
          }
          expect(s.state.players[1]!.battleArea).toHaveLength(0);
        }
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 1);
        if (scenario.flow === "reboot") {
          expect(s.state.players[0]!.battleArea.map((permanent) => permanent.isSuspended)).toEqual([
            false,
            false,
            true,
          ]);
          const moves = s.events.filter(
            (event) => event.kind === "cardsMoved" && event.from === "suspended" && event.to === "unsuspended",
          );
          expect(moves.flatMap((event) => event.instanceIds)).toEqual(
            expect.arrayContaining(["dev-perm-0-keyword-reboot-0", "dev-perm-0-keyword-reboot-1"]),
          );
          expect(moves.flatMap((event) => event.instanceIds)).not.toContain("dev-perm-0-keyword-reboot-2");
        } else {
          const blocker = s.state.players[0]!.battleArea[0]!;
          expect(observe(s.engine).hasKeyword(blocker, "Blocker")).toBe(true);
          expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
          await advance(s.engine).waitForMainPhase(1);
          expect(
            s.engine.applyIntent(1, {
              type: "attack",
              attackerPermanentId: "dev-perm-1-keyword-attacker",
              target: { kind: "player" },
            }),
          ).toEqual({ ok: true });
          await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
          expect(
            s.engine.applyIntent(
              0,
              scenario.accept
                ? { type: "declareBlock", blockerPermanentId: blocker.permanentId }
                : { type: "declineBlock" },
            ),
          ).toEqual({ ok: true });
          await settle(() => !observe(s.engine).isAttacking());
          expect(
            s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === blocker.permanentId),
          ).toBe(!scenario.accept);
          expect(s.state.players[0]!.security).toHaveLength(scenario.accept ? 5 : 4);
          expect(s.events.filter((event) => event.kind === "blocked")).toHaveLength(scenario.accept ? 1 : 0);
          expect(s.events.filter((event) => event.kind === "battleCompared")).toHaveLength(scenario.accept ? 1 : 0);
        }
      } finally {
        s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      }
    });
  }
  it("compares a printed tie once before either Barrier payment, then preserves both cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-041", as: "attacker" }], security: ["BT1-010", "BT1-010"] },
      1: { battleArea: [{ card: "BT13-041", as: "defender", suspended: true }], security: ["BT1-010", "BT1-010"] },
    });
    await s.ready();
    const attacker = s.perm("attacker");
    const defender = s.perm("defender");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    for (const [seat, permanent] of [
      [0, attacker],
      [1, defender],
    ] as const) {
      await settle(() =>
        s.events.some((event) => event.kind === "barrierPrompt" && event.permanentId === permanent.permanentId),
      );
      expect(
        s.engine.applyIntent(seat, { type: "respondBarrier", permanentId: permanent.permanentId, accept: true }),
      ).toEqual({ ok: true });
    }
    await settle(() => !observe(s.engine).isAttacking());
    const comparisons = s.events.filter((event) => event.kind === "battleCompared");
    expect(comparisons).toHaveLength(1);
    expect(comparisons[0]).toMatchObject({ loserPermanentIds: [attacker.permanentId, defender.permanentId] });
    expect(s.events.indexOf(comparisons[0]!)).toBeLessThan(
      s.events.findIndex((event) => event.kind === "barrierPrompt"),
    );
    expect(s.state.players[0]!.battleArea.map((p) => p.permanentId)).toEqual([attacker.permanentId]);
    expect(s.state.players[1]!.battleArea.map((p) => p.permanentId)).toEqual([defender.permanentId]);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.events.find((event) => event.kind === "combatResolved")).toMatchObject({ deletedPermanentIds: [] });
  });
  for (const scenario of KEYWORD_PACING_SCENARIOS as readonly KeywordPacingScenario[]) {
    it(`${scenario.id} resolves through a public attack on printed cards`, async () => {
      const s = setupEngine({ 0: {}, 1: {} });
      s.engine.stagedDecks[0] = BLUE_DECK;
      s.engine.stagedDecks[1] = RED_DECK;
      s.engine.startDevScenario(scenario.id);
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        const attacker = s.state.players[0]!.battleArea[0]!;
        const defender = s.state.players[1]!.battleArea[0];
        expect(attacker.topCard.cardId).toBe(scenario.attackerCardId);
        expect(observe(s.engine).hasKeyword(attacker, scenario.keyword)).toBe(true);
        const securityBefore = s.state.players[1]!.security.length;
        const ownSecurityBefore = s.state.players[0]!.security.length;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target:
              scenario.target === "player"
                ? { kind: "player" }
                : { kind: "permanent", permanentId: defender!.permanentId },
          }),
        ).toEqual({ ok: true });
        let reply;
        if (scenario.decision?.kind === "Alliance") {
          await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
          reply = s.engine.applyIntent(0, {
            type: "respondAlliance",
            ...(scenario.decision.accept ? { allyPermanentId: "dev-perm-0-keyword-ally-0" } : {}),
          });
        }
        if (scenario.decision?.kind === "Barrier") {
          await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
          reply = s.engine.applyIntent(0, {
            type: "respondBarrier",
            permanentId: attacker.permanentId,
            accept: scenario.decision.accept,
          });
        }
        expect(reply).toEqual(scenario.decision ? { ok: true } : undefined);
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(
          scenario.attackerRemains,
        );
        expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === defender?.permanentId)).toBe(
          scenario.defenderRemains,
        );
        expect(s.state.players[1]!.security).toHaveLength(securityBefore - scenario.securityRemoved);
        expect(s.state.players[0]!.security).toHaveLength(ownSecurityBefore - (scenario.ownSecurityRemoved ?? 0));
        for (const [index] of (scenario.allies ?? []).entries()) {
          expect(
            s.state.players[0]!.battleArea.find((p) => p.permanentId === `dev-perm-0-keyword-ally-${index}`)
              ?.isSuspended,
          ).toBe(index === 0 && scenario.decision?.accept === true);
        }
        expect(s.events.some((event) => event.kind === "attackDeclared")).toBe(true);
        for (const prompt of s.events.filter((event) => event.kind === "barrierPrompt")) {
          const comparison = s.events.find((event) => event.kind === "battleCompared");
          expect(comparison).toMatchObject({ loserPermanentIds: [prompt.permanentId] });
          expect(s.events.indexOf(comparison!)).toBeLessThan(s.events.indexOf(prompt));
        }
        expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(scenario.securityRemoved);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
      }
    });
  }
});
