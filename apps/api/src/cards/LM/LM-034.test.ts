import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-034.js";

// "Red also meets this card's colour requirements" (Q4065/Q4066): the printed requirement
// still has to be met — by Blue or by Red — it is not waived outright.
describe("LM-034 Wisteria Memory Boost!", () => {
  it("reveals three, adds a blue or red Digimon, bottoms the rest and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "colorSource" }],
          hand: [{ card: "LM-034", as: "option" }],
          deck: ["BT1-028", "BT1-047", "BT1-050"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-028")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-047", "BT1-050"].sort());
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034")).toBe(true);
  });

  it("can be used with only a red colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "altSource" }],
          hand: [{ card: "LM-034", as: "option" }],
          deck: ["BT1-047", "BT1-050"],
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

  it("counts a red Digimon in the breeding area too, per Q4066", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", as: "altSource" },
          hand: [{ card: "LM-034", as: "option" }],
          deck: ["BT1-047", "BT1-050"],
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

  it("is refused with no blue or red colour source in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-045", as: "wrongSource" }],
          hand: [{ card: "LM-034", as: "option" }],
          deck: ["BT1-047", "BT1-050"],
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
      { 0: { security: [{ card: "LM-034", as: "securityOption", faceUp: true }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-034")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-034");
    const compiled = runtimeCompiledCard("LM-034");
    expect(definition?.nameEn).toBe("Wisteria Memory Boost!");
    expect(definition?.colors).toEqual(["Blue"]);
    expect(definition?.playCost).toBe(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects[0]?.actions[0]).toMatchObject({ kind: "WaiveColorRequirement", color: "red" });
    expect(compiled?.effects.some((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"))).toBe(true);
  });
});
