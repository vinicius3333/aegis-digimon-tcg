import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-033.js";

// "Black also meets this card's colour requirements" (Q4063/Q4064): the printed requirement
// still has to be met — by Red or by Black — it is not waived outright.
describe("LM-033 Garnet Memory Boost!", () => {
  it("reveals three, adds a red or black Digimon, bottoms the rest and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "colorSource" }],
          hand: [{ card: "LM-033", as: "option" }],
          deck: ["BT1-013", "BT1-028", "BT10-017"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-013")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-028", "BT10-017"].sort());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true);
  });

  it("can be used with only a black colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "altSource" }],
          hand: [{ card: "LM-033", as: "option" }],
          deck: ["BT1-028", "BT10-017"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("counts a black Digimon in the breeding area too, per Q4064", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT2-052", as: "altSource" },
          hand: [{ card: "LM-033", as: "option" }],
          deck: ["BT1-028", "BT10-017"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("is refused with no red or black colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "wrongSource" }],
          hand: [{ card: "LM-033", as: "option" }],
          deck: ["BT1-028", "BT10-017"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
      ok: true,
    });
  });

  it("places itself in the battle area from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-033", as: "securityOption", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-033")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-033");
    const compiled = runtimeCompiledCard("LM-033");
    expect(definition?.nameEn).toBe("Garnet Memory Boost!");
    expect(definition?.colors).toEqual(["Red"]);
    expect(definition?.playCost).toBe(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "black" });
    expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
  });
});
