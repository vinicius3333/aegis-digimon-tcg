import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, settleAcrossTimers, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../ST19/ST19-12.js";
import "../BT19/BT19-003.js";
import "../EX2/EX2-066.js";
import "./P-191.js";
import "./P-165.js";

describe("P-165 ShoeShoemon", () => {
  it("encodes Security end-of-battle play and On Play/When Digivolving Familiar Token creation", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Security",
      timing: "endOfBattle",
      actions: [{ kind: "PlayWithoutCost", from: ["security"], payCost: false }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          { kind: "PlayToken", tokens: ["Familiar Token"], count: 1, payCost: false, bindResultAs: "familiarToken" },
          {
            kind: "DelayedDelete",
            timing: "endOfOpponentTurn",
            target: {
              filter: {
                controller: "mine",
                boundRef: "familiarToken",
                nameOrTrait: [{ tokens: ["Familiar Token"], match: "name" }],
              },
              count: 1,
            },
          },
        ],
      });
    }
  });

  it("uses the Familiar Token's own deletion effect and encodes inherited Barrier", () => {
    const compiled = runtimeCompiledCard("P-165")!;
    expect(
      compiled.effects.some((effect) => (effect.actions ?? []).some((action) => action.kind === "SubTrigger")),
    ).toBe(false);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
    expect(runtimeCompiledCard("TOKEN-Familiar-Token")?.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnDeletion",
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" })],
        }),
      ]),
    );
  });

  it("plays exactly one Familiar Token from On Play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "P-165", as: "shoe" }] } });
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle();
    expect(s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toHaveLength(1);
  });

  it("plays the token from When Digivolving and its deletion reduces an opposing Digimon by 3000", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "host" },
            { card: "BT1-057", as: "barrierHost", under: ["P-165"] },
          ],
          hand: [{ card: "P-165", as: "shoe" }],
        },
        1: { battleArea: [{ card: "BT1-025", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const shoeId = s.inst("shoe").instanceId;
    const baseSourceId = s.perm("host").topCard.instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("host").permanentId, instanceId: shoeId }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === shoeId && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(8);
    expect(s.perm("host").stack.some((card) => card.instanceId === baseSourceId)).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("barrierHost"), "Barrier")).toBe(true);
    const token = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "TOKEN-Familiar-Token");
    expect(token).toBeDefined();
    await advance(s.engine).verb.deletePermanent([token!.permanentId], "byEffect");
    await settle();
    expect(s.perm("opponent").currentDP).toBe(8000);
  });

  it("plays from Security at end of a real battle", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-165", as: "shoe" }, "BT1-009"] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-165"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-165")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("deletes its Familiar Token at the real opponent-turn boundary", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "P-165", as: "shoe" }] }, 1: { battleArea: [{ card: "BT1-009", as: "opponent" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toBe(true);
    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "TOKEN-Familiar-Token")).toBe(false);
  });

  it("deletes only the token this effect played, leaving another Familiar Token alone", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-165", as: "shoe" },
            { card: "TOKEN-Familiar-Token", as: "olderToken" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle(
      () => s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "TOKEN-Familiar-Token").length === 2,
    );
    const playedToken = s.state.players[0]!.battleArea.find(
      (p) => p.topCard?.cardId === "TOKEN-Familiar-Token" && p.permanentId !== s.perm("olderToken").permanentId,
    )!;
    expect(playedToken).toBeDefined();

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);

    const remaining = s.state.players[0]!.battleArea.filter((p) => p.topCard?.cardId === "TOKEN-Familiar-Token");
    expect(remaining.map((p) => p.permanentId)).toEqual([s.perm("olderToken").permanentId]);
  });
});

describe("P-165 ShoeShoemon — KB Q&A rulings", () => {
  const FAMILIAR = "TOKEN-Familiar-Token";
  const filler = (count: number) => Array.from({ length: count }, () => "BT3-059");
  const familiarCount = (s: EngineSetup, seat: 0 | 1) =>
    s.state.players[seat]!.battleArea.filter((permanent) => permanent.topCard?.cardId === FAMILIAR).length;

  it("keeps a token played during the opponent's end-of-turn attack until their next turn end (Q4275)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 10000, under: ["P-191"] }],
          deck: filler(20),
          security: filler(5),
        },
        1: { deck: filler(20), security: [{ card: "P-165", as: "shoe" }, ...filler(4)] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await settle(() => familiarCount(s, 1) === 1 && s.state.pendingDecision === undefined);

    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.players[1]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoe").instanceId)).toBe(true);
    expect(familiarCount(s, 1)).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await advance(s.engine).waitForMainPhase(0);
    expect(familiarCount(s, 1)).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(familiarCount(s, 1)).toBe(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("survives its owner's turn end and is deleted at the end of the opponent's turn (Q5756)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-165", as: "shoe" }], deck: filler(10), security: filler(3) },
        1: { deck: filler(10), security: filler(3) },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
    await settle(() => familiarCount(s, 0) === 1);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(familiarCount(s, 0)).toBe(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(familiarCount(s, 0)).toBe(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it.each([
    ["the token deletion first", /Delete this Digimon/i],
    ["the end-of-turn effect first", /BT19-003/],
  ])(
    "lets the turn player order an end-of-turn effect against the token deletion: %s (Q5757)",
    async (_label, first) => {
      const s = setupEngine(
        {
          0: { battleArea: [{ card: "P-165", as: "shoe" }], deck: filler(10), security: filler(3) },
          1: {
            battleArea: [{ card: "BT1-009", as: "plugHost", dp: 10000, under: ["BT19-003"] }],
            trash: [{ card: "EX2-066", as: "plugIn" }],
            deck: filler(10),
            security: filler(3),
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: false },
      );
      await s.ready();
      await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("shoe"));
      await settle(() => familiarCount(s, 0) === 1);
      const loop = s.engine.startTurnLoop();
      await advance(s.engine).waitForMainPhase(0);
      advance(s.engine).endMainPhaseIfOpen(0);
      await advance(s.engine).waitForMainPhase(1);
      advance(s.engine).endMainPhaseIfOpen(1);
      await settleAcrossTimers(() => s.state.pendingDecision?.kind === "orderTriggers");
      const pending = s.state.pendingDecision!;
      expect(pending.kind).toBe("orderTriggers");
      expect(pending.seat).toBe(1);
      const keys = (JSON.parse(pending.payloadJson) as { triggerKeys?: string[] }).triggerKeys ?? [];
      expect(keys).toHaveLength(2);
      expect(keys.some((key) => /Delete this Digimon/i.test(key))).toBe(true);
      const chosen = keys.find((key) => first.test(key)) ?? keys.find((key) => !/Delete this Digimon/i.test(key))!;
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: pending.decisionId,
          response: { kind: "orderTriggers", order: [chosen] },
        }),
      ).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(familiarCount(s, 0)).toBe(0);
      expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toContain(s.inst("plugIn").instanceId);
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
    },
  );
});
