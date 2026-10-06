import { EffectDuration, Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { setupEngine, settle } from "./testkit/harness.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";

describe("October 6 Discord timing regressions", () => {
  it.each(["EX13-041", "EX13-021"])(
    "Discord 1556989618258321418: %s is deleted at 0 DP before its On Play activates",
    async (card) => {
      const s = setupEngine(
        {
          0: { hand: [{ card, as: "played" }] },
          1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-009", "BT1-009"] }] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      // Seed the already-resolved, player-wide reduction from the reported game.
      advance(s.engine).ledgers.modifiers.addPlayerDpModifier(s.state, 0, -18000, EffectDuration.UntilOpponentTurnEnd);
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("played").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      expect(
        s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === card && e.timing === "OnPlay"),
      ).toBe(false);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(s.perm("target").stack).toHaveLength(2);
    },
  );

  it.each(["EX13-041", "EX13-021"])(
    "Discord 1556989618258321418: effect-played %s cannot resolve On Play at 0 DP",
    async (card) => {
      const s = setupEngine(
        {
          0: {
            battleArea: ["BT1-009"],
            hand: [
              { card: "BT20-093", as: "gene" },
              { card, as: "played" },
            ],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-009", "BT1-009"] }] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      advance(s.engine).ledgers.modifiers.addPlayerDpModifier(s.state, 0, -18000, EffectDuration.UntilOpponentTurnEnd, {
        matches: (id) => id !== s.state.players[0]!.battleArea[0]!.permanentId,
      });
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gene").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () =>
          s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("played").instanceId) &&
          s.state.pendingDecision === undefined,
      );
      expect(
        s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === card && e.timing === "OnPlay"),
      ).toBe(false);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(s.perm("target").stack).toHaveLength(2);
    },
  );

  it.each(["EX13-041", "BT20-042"])(
    "Discord 1556989618258321418: rule-check Partition replay %s is deleted before On Play",
    async (groundramon) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT23-047", as: "examon", under: [groundramon, "EX13-021"] }],
            hand: [{ card: "EX2-056", as: "play" }],
          },
          1: { battleArea: [{ card: "BT1-010", as: "target", under: ["BT1-009", "BT1-009"] }] },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      advance(s.engine).ledgers.modifiers.addPlayerDpModifier(s.state, 0, -18000, EffectDuration.UntilOpponentTurnEnd, {
        ownerSeat: 1,
      });
      s.state.memory = 10;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("play").instanceId })).toEqual({
        ok: true,
      });
      await settle(
        () => s.state.players[0]!.trash.some((c) => c.cardId === "EX13-021") && s.state.pendingDecision === undefined,
      );
      expect(
        s.events.some(
          (e) =>
            e.kind === "effectTriggered" && [groundramon, "EX13-021"].includes(e.sourceCardId) && e.timing === "OnPlay",
        ),
      ).toBe(false);
      expect(s.perm("target").isSuspended).toBe(false);
      expect(s.perm("target").stack).toHaveLength(2);
    },
  );

  it.each([
    ["BT21-079", -3],
    ["EX13-015", -1],
  ] as const)(
    "Discord 1556939406642913291: Takato played by WarGrowlmon grants Blitz to nested %s",
    async (mega, memory) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "EX2-009", as: "base", under: ["EX13-001"] }],
            hand: [
              { card: "AD1-003", as: "war" },
              { card: "EX2-056", as: "takato" },
              { card: mega, as: "mega" },
            ],
            deck: Array(12).fill("BT1-009"),
          },
          1: { security: 3, deck: Array(12).fill("BT1-009") },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("war").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === mega && s.state.pendingDecision === undefined);
      expect(s.state.memory).toBe(memory);
      expect(observe(s.engine).hasKeyword(s.perm("base").permanentId, "Blitz")).toBe(true);
    },
  );

  it.each([true, false])(
    "Discord 1556885028401844324: inherited battle trigger requires its source role (De-Digivolve: %s)",
    async (deDigivolve) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: deDigivolve ? "BT13-065" : "BT1-009", as: "attacker" }], security: 3 },
          1: { battleArea: [{ card: "BT23-047", as: "examon", under: ["EX13-041"], suspended: true }], security: 3 },
        },
        { autoSelectCards: true, autoAcceptOptional: true },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("examon").permanentId },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.perm("examon").topCard.cardId).toBe(deDigivolve ? "EX13-041" : "BT23-047");
      expect(s.state.players[0]!.security).toHaveLength(deDigivolve ? 3 : 2);
      expect(s.events.some((e) => e.kind === "effectTriggered" && e.sourceCardId === "EX13-041")).toBe(!deDigivolve);
    },
  );
  it("Discord 1556992097352032276: ACE Overflow at turn start ends the turn before unsuspend, draw or breeding", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-010", as: "play" }], deck: Array(8).fill("BT1-009") },
        1: { battleArea: [{ card: "BT20-021", as: "ace" }], breeding: "BT1-009", deck: Array(8).fill("BT1-009") },
      },
      { autoDeclineOptional: true },
    );
    // These ledgers model effects that already resolved before the reported pass.
    const l = advance(s.engine).ledgers;
    l.continuous.addRestriction(s.perm("ace").permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
      byOpponentEffectsOnly: true,
    });
    l.modifiers.addPlayerDpModifier(s.state, 1, -18000, EffectDuration.UntilOpponentTurnEnd, {
      ownerSeat: 0,
      sourceSeat: 0,
      sourceKinds: ["Digimon"],
    });
    s.state.memory = 3;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await settle(
      () => s.state.players[1]!.trash.some((c) => c.cardId === "BT20-021") && s.state.pendingDecision === undefined,
    );
    await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Main);
    // CR 6-2-1-2: the new turn ends in Active when Overflow crosses memory.
    expect(s.state.turnSeat).toBe(0);
    expect(s.state.memory).toBe(2);
    expect(s.events.filter((e) => e.kind === "turnEnded")).toHaveLength(2);
    expect(s.events.some((e) => e.kind === "phaseChanged" && e.turnSeat === 1 && e.phase !== Phase.Active)).toBe(false);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([true, false])(
    "Discord 1556889318151422033: Partition precedes Dragon Gene and Analog checks remaining sources (%s)",
    async (remainingEgg) => {
      const preferred: string[] = [];
      const s = setupEngine(
        {
          0: {
            battleArea: [
              {
                card: "BT23-047",
                as: "examon",
                under: remainingEgg ? ["EX13-002", "EX13-041", "EX13-021"] : ["EX13-041", "EX13-021"],
              },
              { card: "BT20-093", as: "gene" },
              { card: "EX1-066", as: "analog" },
            ],
            hand: [{ card: "BT23-047", as: "next" }],
            eggDeck: ["EX13-002"],
            deck: Array(12).fill("BT1-009"),
          },
          1: { security: ["ST1-16"] },
        },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          preferInstanceIds: preferred,
          preferTriggerKeys: ["BT23-047"],
          autoChooseOption: true,
        },
      );
      preferred.push(
        ...s
          .perm("examon")
          .stack.filter((c) => ["EX13-041", "EX13-021"].includes(c.cardId))
          .map((c) => c.instanceId),
      );
      s.state.memory = 3;
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("examon").permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).finishAttack();
      await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
      expect(s.state.players[0]!.battleArea.filter((p) => p.topCard.cardId === "BT23-047")).toHaveLength(1);
      expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("next").instanceId)).toBe(true);
      expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("gene").instanceId)).toBe(true);
      expect(s.perm("analog").isSuspended).toBe(remainingEgg);
      expect(s.state.memory).toBe(remainingEgg ? 4 : 3);
    },
  );
});
