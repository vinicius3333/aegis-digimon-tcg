import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { effectsOf } from "../../engine/effects/collect.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("EX11 exact-name boundaries", () => {
  it("requires exact Galemon for GrandGalemon's hand route", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX11-026", as: "pteromon" },
          { card: "EX11-062", as: "shoto" },
        ],
        hand: [{ card: "EX11-032", as: "grand" }],
        trash: [{ card: "EX7-034", as: "grandGalemon" }],
      },
    });
    await s.ready();
    const source = observe(s.engine).cardSource(s.inst("grand"));
    const effect = effectsOf(EffectTiming.OnDeclaration, source).find((entry) =>
      entry.effectKey.startsWith("EX11-032/"),
    );
    expect(effect).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: source.instanceId,
        effectKey: effect!.effectKey,
      }),
    ).toEqual({ ok: false, reason: "illegal-target" });
    expect(s.perm("pteromon").topCard.cardId).toBe("EX11-026");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("EX11-032");
    assertNoLoudGap(s);
  });

  it("uses EX11-041's ordinary cost on a level-4 non-Machine base", async () => {
    expect(getCardDefinition("BT1-037")).toMatchObject({ level: 4, colors: ["Blue"], types: ["Beastkin"] });
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-037", as: "base" }], hand: [{ card: "EX11-041", as: "target" }] },
    });
    await s.ready();
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX11-041");
    expect(s.state.memory).toBe(-1);
  });

  for (const [cardId, timing] of [
    ["EX11-029", EffectTiming.WhenMoving],
    ["EX11-040", EffectTiming.OnPlay],
  ] as const) {
    it(`${cardId} does not link ExMaquinamon as Maquinamon`, async () => {
      const s = setupEngine(
        { 0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX11-073", as: "ex" }] } },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      await s.ready();
      await advance(s.engine).fire(timing, s.perm("source"));
      expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toContain("EX11-073");
      expect(s.perm("source").linked).toHaveLength(0);
      assertNoLoudGap(s);
    });
  }
});
