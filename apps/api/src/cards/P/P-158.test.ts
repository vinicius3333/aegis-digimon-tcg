import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
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
      playCostCeiling: { base: 3, unit: "digivolutionCardsOfFiltered" },
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });

  it("plays itself from security without paying its memory cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-158", as: "jeri" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("jeri"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("jeri").instanceId)).toBe(true);
  });
});
