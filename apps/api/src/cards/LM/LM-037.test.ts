import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-037.js";

// "Yellow also meets this card's colour requirements" (Q4071/Q4072): the printed requirement
// still has to be met — by Black or by Yellow — it is not waived outright.
describe("LM-037 Sepia Memory Boost!", () => {
  it("reveals three, adds a black or yellow Digimon, bottoms the rest and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT2-052", as: "colorSource" }],
          hand: [{ card: "LM-037", as: "option" }],
          deck: ["BT3-059", "BT1-013", "BT2-011"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-013", "BT2-011"].sort());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037")).toBe(true);
  });

  it("can be used with only a yellow colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "altSource" }],
          hand: [{ card: "LM-037", as: "option" }],
          deck: ["BT1-013", "BT2-011"],
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

  it("counts a yellow Digimon in the breeding area too, per Q4072", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-045", as: "altSource" },
          hand: [{ card: "LM-037", as: "option" }],
          deck: ["BT1-013", "BT2-011"],
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

  it("is refused with no black or yellow colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "wrongSource" }],
          hand: [{ card: "LM-037", as: "option" }],
          deck: ["BT1-013", "BT2-011"],
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
      { 0: { security: [{ card: "LM-037", as: "securityOption", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-037")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-037");
    const compiled = runtimeCompiledCard("LM-037");
    expect(definition?.nameEn).toBe("Sepia Memory Boost!");
    expect(definition?.colors).toEqual(["Black"]);
    expect(definition?.playCost).toBe(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "yellow" });
    expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
  });
});
