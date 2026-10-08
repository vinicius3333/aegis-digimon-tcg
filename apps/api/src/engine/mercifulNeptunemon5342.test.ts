import { EffectDuration, Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

const sixColors = ["BT1-009", "BT1-028", "BT1-045", "BT1-064", "BT2-055"];

describe("#5342 Merciful Mode battles Neptunemon", () => {
  for (const seat of [0, 1] as const) {
    const opponent: Seat = seat === 0 ? 1 : 0;
    it.each([false, true])(
      `seat ${seat}: Oracle candidate Divermon grant paid %s survives evolution and expires after the opposing turn`,
      async (payProtection) => {
        // Candidate log Assembly IDs mapped through its initial deck snapshot.
        const materials = ["EX13-077", "AD1-025", "ST20-09", "ST21-10", "ST20-02", "ST20-10"];
        const s = setupEngine(
          {
            [opponent]: {
              battleArea: [{ card: "BT24-022", as: "host", under: ["BT24-002"] }],
              hand: [
                { card: "BT24-028", as: "divermon" },
                { card: "BT24-030", as: "neptunemon" },
                { card: "BT24-020", as: "cost" },
              ],
              deck: Array.from({ length: 20 }, () => "BT1-009"),
              security: 5,
              eggDeck: ["BT1-001"],
            },
            [seat]: {
              battleArea: ["EX13-073"],
              hand: [{ card: "EX13-077", as: "merciful" }],
              trash: materials.map((card, index) => ({ card, as: `material${index}` })),
              deck: Array.from({ length: 20 }, () => "BT1-009"),
              security: 5,
              eggDeck: ["BT1-001"],
            },
          },
          {
            autoAcceptOptional: true,
            autoSelectCards: true,
            autoChooseOption: true,
            declinePrompts: ["By suspending", ...(payProtection ? [] : ["By paying: By placing"])],
          },
        );
        s.state.turnSeat = opponent;
        s.state.memory = 10;
        await s.ready();
        const hostId = s.perm("host").permanentId;
        const loop = s.engine.startTurnLoop();
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(opponent);
        expect(
          s.engine.applyIntent(opponent, { type: "attack", attackerPermanentId: hostId, target: { kind: "player" } }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(() => s.events.some((event) => event.kind === "attackEnded"));
        expect(
          s.engine.applyIntent(opponent, {
            type: "digivolve",
            permanentId: hostId,
            instanceId: s.inst("divermon").instanceId,
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(() =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT24-028"),
        );
        expect(observe(s.engine).isRestricted(s.perm("host"), "beDeletedInBattle")).toBe(payProtection);
        expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
        await settleAcrossTimers(() => s.state.turnSeat === seat && s.state.phase === Phase.Breeding);
        expect(s.perm("host").topCard.cardId).toBe("BT24-030");
        expect(observe(s.engine).isRestricted(s.perm("host"), "beDeletedInBattle")).toBe(payProtection);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        const before = s.events.length;
        expect(
          s.engine.applyIntent(seat, {
            type: "playCard",
            instanceId: s.inst("merciful").instanceId,
            assembly: { materialInstanceIds: materials.map((_, index) => s.inst(`material${index}`).instanceId) },
          }),
        ).toEqual({ ok: true });
        if (payProtection) {
          await settleAcrossTimers(() => observe(s.engine).blockingSeat() === opponent);
          expect(s.engine.applyIntent(opponent, { type: "declareBlock", blockerPermanentId: hostId })).toEqual({
            ok: true,
          });
        }
        await settleAcrossTimers(() => s.state.turnSeat === opponent && s.state.phase === Phase.Breeding);
        const battles = s.events.slice(before).filter((event) => event.kind === "battleCompared");
        expect(battles.filter((event) => event.effectBattle)).toHaveLength(payProtection ? 3 : 1);
        expect(battles.filter((event) => !event.effectBattle)).toHaveLength(payProtection ? 1 : 0);
        expect(battles.map((event) => event.loserPermanentIds)).toEqual(payProtection ? [[], [], [], []] : [[hostId]]);
        expect(s.state.players[opponent]!.battleArea).toHaveLength(payProtection ? 1 : 0);
        const survivingHost = s.state.players[opponent]!.battleArea.find((p) => p.permanentId === hostId);
        expect(survivingHost ? observe(s.engine).isRestricted(survivingHost, "beDeletedInBattle") : false).toBe(false);
        expect(s.state.pendingDecision).toBeUndefined();
        expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(opponent);
        expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
        await loop;
      },
    );

    it(`seat ${seat}: On Play battles Neptunemon despite Merciful Mode being newly played`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: ["BT1-009"],
            hand: [{ card: "EX13-077", as: "merciful" }],
            deck: ["BT1-009"],
            security: 5,
          },
          [opponent]: { battleArea: [{ card: "BT24-030", as: "neptunemon" }], security: 5 },
        },
        { autoAcceptOptional: true, declinePrompts: ["Attack"], autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("merciful").instanceId })).toEqual({
        ok: true,
      });
      await settleAcrossTimers(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"),
      );
      expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(1);
      expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
      expect(s.state.players[opponent]!.battleArea).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it(`seat ${seat}: Battle, Recovery, Battle uses three separately chosen modes`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT1-084", as: "omnimon", under: sixColors }],
            hand: [{ card: "EX13-077", as: "merciful" }],
            deck: ["BT1-009", "BT1-009", "BT1-009"],
            security: 3,
          },
          [opponent]: {
            battleArea: ["BT24-030", "BT24-030"],
            trash: Array.from({ length: 5 }, () => "BT1-009"),
            security: 5,
          },
        },
        { autoAcceptOptional: true, declinePrompts: ["Attack"], autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("omnimon").permanentId,
          instanceId: s.inst("merciful").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      for (const [index, optionIndex] of [0, 1, 0].entries()) {
        await settle(() => s.decisions.filter(({ req }) => req.kind === "chooseOption").length === index + 1);
        const request = s.decisions.filter(({ req }) => req.kind === "chooseOption")[index]!.req;
        expect(
          s.engine.applyIntent(opponent, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response: { kind: "chooseOption", optionIndex },
          }),
        ).toMatchObject({ ok: false });
        expect(
          s.engine.applyIntent(seat, {
            type: "respondDecision",
            decisionId: request.decisionId,
            response: { kind: "chooseOption", optionIndex },
          }),
        ).toEqual({ ok: true });
      }
      await settleAcrossTimers(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"),
      );
      expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(2);
      expect(s.events.filter((event) => event.kind === "effectOptionChosen")).toHaveLength(3);
      expect(s.state.players[seat]!.security).toHaveLength(4);
      expect(s.state.players[opponent]!.battleArea).toHaveLength(0);
      expect(s.state.players[opponent]!.deck).toHaveLength(5);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    for (const suspended of [false, true]) {
      it.each([false, true])(
        `seat ${seat}, Neptunemon suspended ${suspended}, unaffected %s: Battle deletes without invoking effect protection`,
        async (immune) => {
          const s = setupEngine(
            {
              [seat]: {
                battleArea: [{ card: "BT1-084", as: "omnimon", under: ["BT1-009"] }],
                hand: [{ card: "EX13-077", as: "merciful" }],
                deck: ["BT1-009", "BT1-009"],
                security: 5,
              },
              [opponent]: {
                battleArea: [
                  { card: "BT24-030", as: "neptunemon", suspended },
                  { card: "BT1-009", as: "other" },
                ],
                security: 5,
              },
            },
            { autoAcceptOptional: true, declinePrompts: ["Attack"], autoSelectCards: true, autoChooseOption: true },
          );
          s.state.turnSeat = seat;
          s.state.memory = 10;
          await s.ready();
          const neptunemonId = s.perm("neptunemon").permanentId;
          if (immune) {
            await advance(s.engine).verb.restrict(neptunemonId, "beAffected", EffectDuration.Permanent);
          }
          expect(observe(s.engine).isRestricted(s.perm("neptunemon"), "beAffected")).toBe(immune);
          expect(
            s.engine.applyIntent(seat, {
              type: "digivolve",
              permanentId: s.perm("omnimon").permanentId,
              instanceId: s.inst("merciful").instanceId,
              useAlternateCost: true,
            }),
          ).toEqual({ ok: true });
          await settleAcrossTimers(() =>
            s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"),
          );
          expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(1);
          expect(s.events.filter((event) => event.kind === "attackDeclared")).toHaveLength(0);
          expect(s.state.players[opponent]!.battleArea.map((p) => p.permanentId)).toEqual([
            s.perm("other").permanentId,
          ]);
          expect(s.state.players[opponent]!.trash.map((card) => card.cardId)).toContain("BT24-030");
          expect(s.decisions.some(({ req }) => req.options?.candidateInstanceIds?.includes(neptunemonId))).toBe(true);
          expect(s.decisions.filter(({ seat: chooser }) => chooser === opponent)).toHaveLength(0);
          expect(s.perm("omnimon").isSuspended).toBe(false);
          expect(s.state.pendingDecision).toBeUndefined();
        },
      );
    }

    it.each([1, 3])(
      `seat ${seat}: resolves %i color-scaled Battle choices against live Neptunemon targets`,
      async (battles) => {
        const s = setupEngine(
          {
            [seat]: {
              battleArea: [{ card: "BT1-084", as: "omnimon", under: battles === 3 ? sixColors : ["BT1-009"] }],
              hand: [{ card: "EX13-077", as: "merciful" }],
              deck: ["BT1-009", "BT1-009"],
              security: 5,
            },
            [opponent]: { battleArea: Array.from({ length: 3 }, () => ({ card: "BT24-030" })), security: 5 },
          },
          { autoAcceptOptional: true, declinePrompts: ["Attack"], autoSelectCards: true, autoChooseOption: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: s.perm("omnimon").permanentId,
            instanceId: s.inst("merciful").instanceId,
            useAlternateCost: true,
          }),
        ).toEqual({ ok: true });
        await settleAcrossTimers(() =>
          s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"),
        );
        expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(battles);
        expect(s.events.filter((event) => event.kind === "effectOptionChosen")).toHaveLength(battles);
        expect(s.state.players[opponent]!.battleArea).toHaveLength(3 - battles);
        expect(s.decisions.filter(({ seat: chooser }) => chooser === opponent)).toHaveLength(0);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );

    it(`seat ${seat}: may battle the same Neptunemon three times when inherited Barrier preserves it`, async () => {
      const s = setupEngine(
        {
          [seat]: {
            battleArea: [{ card: "BT1-084", as: "omnimon", under: sixColors, suspended: true }],
            hand: [{ card: "EX13-077", as: "merciful" }],
            deck: ["BT1-009", "BT1-009"],
            security: 5,
          },
          [opponent]: { battleArea: [{ card: "BT24-030", as: "neptunemon", under: ["EX13-030"] }], security: 3 },
        },
        { autoAcceptOptional: true, declinePrompts: ["Attack"], autoSelectCards: true, autoChooseOption: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const defenderId = s.perm("neptunemon").permanentId;
      expect(
        s.engine.applyIntent(seat, {
          type: "digivolve",
          permanentId: s.perm("omnimon").permanentId,
          instanceId: s.inst("merciful").instanceId,
          useAlternateCost: true,
        }),
      ).toEqual({ ok: true });
      for (let battle = 1; battle <= 3; battle++) {
        await settle(() => s.events.filter((event) => event.kind === "barrierPrompt").length === battle);
        expect(
          s.engine.applyIntent(seat, { type: "respondBarrier", permanentId: defenderId, accept: true }),
        ).toMatchObject({ ok: false });
        expect(
          s.engine.applyIntent(opponent, { type: "respondBarrier", permanentId: defenderId, accept: true }),
        ).toEqual({ ok: true });
      }
      await settleAcrossTimers(() =>
        s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX13-077"),
      );
      expect(s.events.filter((event) => event.kind === "battleCompared" && event.effectBattle)).toHaveLength(3);
      expect(s.state.players[opponent]!.security).toHaveLength(0);
      expect(s.perm("neptunemon").isSuspended).toBe(false);
      expect(s.state.players[opponent]!.battleArea).toHaveLength(1);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it.each([false, true])(`seat ${seat}: declared attack requires a suspended Neptunemon (%s)`, async (suspended) => {
      const s = setupEngine(
        {
          [seat]: { battleArea: [{ card: "EX13-077", as: "merciful" }], security: 5 },
          [opponent]: { battleArea: [{ card: "BT24-030", as: "neptunemon", suspended }], security: 5 },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.turnSeat = seat;
      s.state.memory = 10;
      await s.ready();
      const result = s.engine.applyIntent(seat, {
        type: "attack",
        attackerPermanentId: s.perm("merciful").permanentId,
        target: { kind: "permanent", permanentId: s.perm("neptunemon").permanentId },
      });
      expect(result.ok).toBe(suspended);
      if (suspended) await settleAcrossTimers(() => s.events.some((event) => event.kind === "attackEnded"));
      expect(s.events.filter((event) => event.kind === "battleCompared" && !event.effectBattle)).toHaveLength(
        suspended ? 1 : 0,
      );
      expect(s.state.players[opponent]!.battleArea).toHaveLength(suspended ? 0 : 1);
      expect(s.state.pendingDecision).toBeUndefined();
    });

    it.each([false, true])(
      `seat ${seat}, Neptunemon suspended %s: protection applies to effect deletion only when suspend cost is payable`,
      async (suspended) => {
        const s = setupEngine(
          {
            [seat]: { battleArea: ["BT1-009"], hand: [{ card: "ST1-16", as: "gaia" }] },
            [opponent]: { battleArea: [{ card: "BT24-030", as: "neptunemon", suspended }] },
          },
          { autoAcceptOptional: true, autoSelectCards: true },
        );
        s.state.turnSeat = seat;
        s.state.memory = 10;
        await s.ready();
        const optionId = s.inst("gaia").instanceId;
        expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: optionId })).toEqual({ ok: true });
        await settleAcrossTimers(() => s.state.players[seat]!.trash.some((card) => card.instanceId === optionId));
        expect(s.state.players[opponent]!.battleArea).toHaveLength(suspended ? 0 : 1);
        expect(s.state.pendingDecision).toBeUndefined();
      },
    );
  }
});
