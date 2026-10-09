import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { setupEngine, settle } from "../testkit/harness.js";
import { observe } from "../testkit/observe.js";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";

// Production c6fc72b8: Diggy96 used Tesla Main with EX8-068, evolved
// EX8-024 -> BT20-026 -> EX8-027, then played the same Tesla from sources.
describe("#5333 TeslaJellymon source replay", () => {
  it.each([
    { seat: 0, route: "Plesiomon" },
    { seat: 1, route: "Plesiomon" },
    { seat: 0, route: "Kaiser Nail" },
  ] as const)(
    "reopens Main on a new host for the same physical instance, seat $seat via $route",
    async ({ seat, route }) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [
              { card: "EX12-027", as: "tesla" },
              { card: "EX12-027", as: "copy" },
            ],
            hand: [
              { card: "EX8-068", as: "option1" },
              { card: "EX8-068", as: "option2" },
              { card: "EX8-068", as: "option3" },
              { card: "EX8-024", as: "mega" },
              { card: "BT20-026", as: "megaX" },
              { card: "EX8-027", as: "plesi" },
              ...(route === "Kaiser Nail" ? [{ card: "ST2-15", as: "nail" }] : []),
            ],
            deck: Array.from({ length: 10 }, () => "BT1-009"),
            security: 5,
          },
        },
        {
          autoAcceptOptional: true,
          autoChooseOption: true,
          preferOptionIndex: 1,
          autoSelectCards: true,
          preferInstanceIds: preferred,
        },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const id = s.perm("tesla").topCard.instanceId;
      const originalHost = s.perm("tesla").permanentId;
      const key = observe(s.engine)
        .activatableEffects(s.perm("tesla"))
        .find((e) => e.effectKey.startsWith("EX12-027/"))!.effectKey;
      const activate = (instanceId: string) =>
        s.engine.applyIntent(seat, { type: "activateEffect", sourceInstanceId: instanceId, effectKey: key });
      const projected = (instanceId: string) => {
        const permanent = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === instanceId)!;
        return observe(s.engine)
          .activatableEffects(permanent)
          .map((e) => e.effectKey);
      };
      const optionIds = ["option1", "option2", "option3"].map((alias) => s.inst(alias).instanceId);
      preferred.push(optionIds[0]!, id);
      expect(projected(id)).toContain(key);
      expect(activate(id)).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.security.some((c) => c.instanceId === optionIds[0]));
      expect(s.state.pendingDecision).toBeUndefined();
      expect(projected(id)).not.toContain(key);
      expect(activate(id)).toEqual({ ok: false, reason: "illegal-target" });

      // Another physical copy keeps its own use; the first host remains spent.
      const copyId = s.perm("copy").topCard.instanceId;
      expect(projected(copyId)).toContain(key);
      expect(activate(copyId)).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.security.some((c) => c.instanceId === optionIds[1]));
      expect(projected(copyId)).not.toContain(key);
      expect(projected(id)).not.toContain(key);

      for (const [alias, alternate] of route === "Plesiomon"
        ? ([
            ["mega", false],
            ["megaX", true],
            ["plesi", false],
          ] as const)
        : ([
            ["mega", false],
            ["megaX", true],
          ] as const)) {
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: originalHost,
            instanceId: s.inst(alias).instanceId,
            useAlternateCost: alternate,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[seat]!.battleArea.find((p) => p.permanentId === originalHost)?.topCard.instanceId ===
              s.inst(alias).instanceId && !s.state.pendingDecision,
        );
      }
      for (const nailId of route === "Kaiser Nail" ? [s.inst("nail").instanceId] : []) {
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: nailId })).toEqual({
          ok: true,
        });
        await settle(
          () => s.state.players[seat]!.battleArea.some((p) => p.topCard.instanceId === id) && !s.state.pendingDecision,
        );
      }
      const replay = s.state.players[seat]!.battleArea.find((p) => p.topCard.instanceId === id)!;
      expect(replay).toBeDefined();
      expect(replay.permanentId).not.toBe(originalHost);
      expect(replay.enterFieldTurnCount).toBe(s.state.turnCount);
      expect(
        s.state.players[seat]!.battleArea.find((p) => p.permanentId === originalHost)!.stack.some(
          (c) => c.instanceId === id,
        ),
      ).toBe(false);
      preferred.splice(0, preferred.length, optionIds[2]!, id);
      const replayProjection = projected(id);

      // Assert the full public intent first: a hidden UI flag alone cannot prove rejection.
      expect(activate(id)).toEqual({ ok: true });
      await settle(() => s.state.players[seat]!.security.some((c) => c.instanceId === optionIds[2]));
      expect(replayProjection).toContain(key);
      expect(projected(id)).not.toContain(key);
      expect(activate(id)).toEqual({ ok: false, reason: "illegal-target" });
      expect(projected(copyId)).not.toContain(key);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );

  it.each([false, true])(
    "preserves inherited OPT through host evolution or blocked source play (blocked: %s)",
    async (blocked) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              { card: "EX8-024", as: "host", under: [{ card: "EX12-027", as: "source" }] },
              { card: "BT1-088", as: "green" },
            ],
            hand: [
              { card: "BT1-112", as: "unsuspend" },
              { card: "BT20-026", as: "evo" },
              { card: "ST2-15", as: "nail" },
              { card: "EX8-068", as: "option" },
            ],
            deck: Array.from({ length: 10 }, () => "BT1-009"),
            security: 5,
          },
          1: {
            battleArea: [
              { card: "BT1-023", as: "target1", dp: 1000, suspended: true },
              { card: "BT1-023", as: "target2", dp: 1000, suspended: true },
              ...(blocked ? [{ card: "BT9-047", as: "pomumon" }] : []),
            ],
          },
        },
        {
          autoAcceptOptional: true,
          autoChooseOption: true,
          preferOptionIndex: 1,
          autoSelectCards: true,
          preferInstanceIds: preferred,
        },
      );
      s.state.memory = 10;
      await s.ready();
      const sourceId = s.inst("source").instanceId;
      const optionId = s.inst("option").instanceId;
      const hostId = s.perm("host").permanentId;
      const inheritedActivations = () =>
        s.events.filter((e) => e.kind === "effectResolved" && e.sourceCardId === "EX12-027" && e.isInherited === true)
          .length;
      preferred.push(sourceId);
      const attack = async (alias: string) => {
        const targetId = s.perm(alias).permanentId;
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: hostId,
            target: { kind: "permanent", permanentId: targetId },
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            !observe(s.engine).isAttacking() && !s.state.players[1]!.battleArea.some((p) => p.permanentId === targetId),
        );
      };
      const unsuspendId = s.inst("unsuspend").instanceId;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: unsuspendId })).toEqual({ ok: true });
      await settle(
        () => s.state.players[0]!.trash.some((c) => c.instanceId === unsuspendId) && !s.state.pendingDecision,
      );
      await attack("target1");
      expect(inheritedActivations()).toBe(1);
      expect(s.state.players[0]!.hand).toHaveLength(4);
      expect(s.perm("host").isSuspended).toBe(false);
      const tryBlockedPlay = async () => {
        const nailId = s.inst("nail").instanceId;
        expect(s.engine.applyIntent(0, { type: "playCard", instanceId: nailId })).toEqual({ ok: true });
        await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === nailId) && !s.state.pendingDecision);
        // Pomumon blocks the actual source play, so the source and its spent use stay on this host.
        expect(s.perm("host").stack.some((c) => c.instanceId === sourceId)).toBe(true);
        expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sourceId)).toBe(false);
        expect(s.events.filter((e) => e.kind === "cardPlayed" && e.cardId === "EX12-027")).toEqual([]);
      };
      const evolveHost = async () => {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: hostId,
            instanceId: s.inst("evo").instanceId,
            useAlternateCost: true,
          }),
        ).toEqual({ ok: true });
        await settle(() => s.perm("host").topCard.cardId === "BT20-026" && !s.state.pendingDecision);
      };
      await (blocked ? tryBlockedPlay : evolveHost)();
      const handBeforeSecondAttack = s.state.players[0]!.hand.length;
      await attack("target2");
      expect(inheritedActivations()).toBe(1);
      expect(s.state.players[0]!.hand).toHaveLength(handBeforeSecondAttack);
      if (blocked) return;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nail").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === sourceId) && !s.state.pendingDecision,
      );
      const replay = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === sourceId)!;
      expect(replay.permanentId).not.toBe(hostId);
      const main = observe(s.engine)
        .activatableEffects(replay)
        .find((e) => e.effectKey.startsWith("EX12-027/"))!;
      expect(main).toBeDefined();
      expect(
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: sourceId, effectKey: main.effectKey }),
      ).toEqual({ ok: true });
      await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === optionId));
      expect(observe(s.engine).activatableEffects(replay)).toEqual([]);
    },
  );

  it("plays the #5333 arena setup through the real turn loop", async () => {
    const preferred = ["tesla5333-option1"];
    const s = setupEngine(
      { 0: {}, 1: {} },
      {
        autoAcceptOptional: true,
        autoChooseOption: true,
        preferOptionIndex: 1,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    layDevScenario("arena-github5333-tesla-source-replay", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const original = s.state.players[0]!.battleArea[0]!;
      const id = original.topCard.instanceId;
      const hostId = original.permanentId;
      preferred.push(id);
      const main = observe(s.engine)
        .activatableEffects(original)
        .find((e) => e.effectKey.startsWith("EX12-027/"))!;
      expect(main).toBeDefined();
      const activate = () =>
        s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: id, effectKey: main.effectKey });
      expect(activate()).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.security.some((c) => c.instanceId === "tesla5333-option1") && !s.state.pendingDecision,
      );
      expect(observe(s.engine).activatableEffects(original)).toEqual([]);
      expect(activate()).toEqual({ ok: false, reason: "illegal-target" });
      for (const [alias, alternate] of [
        ["mega", false],
        ["megaX", true],
        ["plesi", false],
      ] as const) {
        expect(
          s.engine.applyIntent(0, {
            type: "digivolve",
            permanentId: hostId,
            instanceId: `tesla5333-${alias}`,
            useAlternateCost: alternate,
          }),
        ).toEqual({ ok: true });
        await settle(() => original.topCard.instanceId === `tesla5333-${alias}` && !s.state.pendingDecision);
      }
      const replay = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === id)!;
      expect(replay).toBeDefined();
      expect(replay.permanentId).not.toBe(hostId);
      expect(
        observe(s.engine)
          .activatableEffects(replay)
          .map((e) => e.effectKey),
      ).toContain(main.effectKey);
      preferred.splice(0, preferred.length, "tesla5333-option2", id);
      expect(activate()).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.security.some((c) => c.instanceId === "tesla5333-option2") && !s.state.pendingDecision,
      );
      expect(observe(s.engine).activatableEffects(replay)).toEqual([]);
      expect(activate()).toEqual({ ok: false, reason: "illegal-target" });
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
