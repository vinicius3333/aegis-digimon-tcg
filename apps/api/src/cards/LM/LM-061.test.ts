import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-061.js";

// The nine Training Options share one printed card; each is proven on its own colour pair so a
// colour-swapped or clause-dropping regression in one module cannot hide behind another.
describe("LM-061 Punching Training", () => {
  it("reveals two, adds a black or red card, bottoms the rest and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-061", as: "option" }],
          deck: ["BT3-059", "BT1-028"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
  });

  it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
    const s = setupEngine(
      {
        // No Digimon or Tamer at all: only the printed waiver makes this legal.
        0: { hand: [{ card: "LM-061", as: "option" }], deck: ["BT1-028", "BT1-028"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
  });

  it("loses the waiver once a copy of itself is already in the battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-028", as: "offColour" }],
          hand: [{ card: "LM-061", as: "option" }],
          deck: ["BT1-028", "BT1-028"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    s.putOnBoard(0, { card: "LM-061", as: "copy" });
    await advance(s.engine).recompute();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).not.toEqual({
      ok: true,
    });
  });

  it("digivolves for the printed cost reduced by 2 through its Delay clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-061", as: "option" },
            { card: "BT10-058", as: "host" },
          ],
          hand: [{ card: "BT10-061", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // The printed digivolution cost is 3; the reduction leaves 1.
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `LM-061/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT10-061", 2000);

    expect(s.perm("host").topCard?.cardId).toBe("BT10-061");
    expect(s.state.memory).toBe(0);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-061", as: "securityOption", faceUp: true }], deck: ["BT3-059", "BT1-028"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT3-059")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-061")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-061");
    const compiled = runtimeCompiledCard("LM-061");
    expect(definition?.nameEn).toBe("Punching Training");
    expect(definition?.colors).toEqual(["Black", "Red"]);
    expect(definition?.playCost).toBe(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const delayEffect = compiled?.effects.find((effect) =>
      (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"),
    );
    expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
  });
});
