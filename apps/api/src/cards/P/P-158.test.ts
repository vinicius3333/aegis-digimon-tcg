import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-158.js";

describe("P-158 Jeri (Fake)", () => {
  it("adds the selected D-Reaper card to hand and bottoms the other revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-158", as: "jeri" }],
          deck: [
            { card: "BT1-009", as: "nonMatch1" },
            { card: "EX2-046", as: "searcher" },
            { card: "BT1-010", as: "nonMatch2" },
            { card: "BT1-011", as: "nonMatch3" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("jeri").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("searcher").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("searcher").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("nonMatch1").instanceId,
      s.inst("nonMatch2").instanceId,
      s.inst("nonMatch3").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("registers Main return-and-play and Security self-play timings", () => {
    const compiled = runtimeCompiledCard("P-158")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      cost: { kind: "return", to: "deckBottom", target: { isSelf: true } },
      playCostCeiling: { base: 3, unit: "digivolutionCards" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });

  it("returns itself to the deck bottom and plays only within the Mother D-Reaper ceiling", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-158", as: "jeri" },
            { card: "EX2-007", as: "mother", under: ["EX2-046", "EX2-046"] },
          ],
          hand: [
            { card: "BT19-078", as: "eligible" },
            { card: "EX2-051", as: "overCeiling" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-012"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT1-012"), security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    const ability = JSON.parse(s.perm("jeri").activatableEffectsJson) as { effectKey: string }[];
    expect(ability).toHaveLength(1);
    const jeriId = s.inst("jeri").instanceId;
    const eligibleId = s.inst("eligible").instanceId;
    const overCeilingId = s.inst("overCeiling").instanceId;
    preferred.push(overCeilingId, eligibleId);
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: jeriId, effectKey: ability[0]!.effectKey }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === eligibleId),
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(jeriId);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === overCeilingId)).toBe(true);
  });

  it("plays a play-cost-3 D-Reaper with no Mother D-Reaper sources", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-158", as: "jeri" },
            { card: "EX2-007", as: "mother" },
          ],
          hand: [{ card: "EX2-046", as: "searcher" }],
          deck: Array.from({ length: 20 }, () => "BT1-012"),
        },
        1: { deck: Array.from({ length: 20 }, () => "BT1-012"), security: ["BT1-011"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const jeriId = s.inst("jeri").instanceId;
    const searcherId = s.inst("searcher").instanceId;
    const ability = JSON.parse(s.perm("jeri").activatableEffectsJson) as { effectKey: string }[];
    expect(
      s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: jeriId, effectKey: ability[0]!.effectKey }),
    ).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === searcherId),
    );
    expect(s.state.memory).toBe(10);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(jeriId);
  });

  it("plays itself from security after a public opponent attack without paying memory", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "P-158", as: "jeri" }], deck: Array.from({ length: 20 }, () => "BT1-012") },
        1: {
          battleArea: [{ card: "BT1-009", as: "attacker" }],
          deck: Array.from({ length: 20 }, () => "BT1-012"),
          security: ["BT1-011", "BT1-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    const memoryBefore = s.state.memory;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("jeri").instanceId),
    );
    expect(s.state.memory).toBe(memoryBefore);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
