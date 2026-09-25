import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-065.js";

describe("LM-065 Weight Training", () => {
  it("reveals two, adds a black or green card, bottoms the rest and places itself", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-065", as: "option" }],
          deck: ["BT2-052", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-052")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065")).toBe(true);
  });

  it("ignores its colour requirements while no copy of itself is in the battle area", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-065", as: "option" }], deck: ["BT1-009", "BT1-009"] },
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
          battleArea: [{ card: "BT1-009", as: "offColour" }],
          hand: [{ card: "LM-065", as: "option" }],
          deck: ["BT1-009", "BT1-009"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();
    s.putOnBoard(0, { card: "LM-065", as: "copy" });
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
            { card: "LM-065", as: "option" },
            { card: "BT2-052", as: "host" },
          ],
          hand: [{ card: "BT5-062", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `LM-065/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard?.cardId === "BT5-062", 2000);

    expect(s.perm("host").topCard?.cardId).toBe("BT5-062");
    expect(s.state.memory).toBe(0);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "LM-065", as: "securityOption", faceUp: true }], deck: ["BT2-052", "BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-052")).toBe(true);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065")).toBe(true);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-065");
    const compiled = runtimeCompiledCard("LM-065");
    expect(definition?.nameEn).toBe("Weight Training");
    expect(definition?.colors).toEqual(["Black", "Green"]);
    expect(definition?.playCost).toBe(2);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const delayEffect = compiled?.effects.find((effect) =>
      (effect.keywords ?? []).some((kw) => kw.keyword === "Delay"),
    );
    expect(delayEffect?.actions[0]).toMatchObject({ kind: "Digivolve", reduceCost: 2, payCost: true });
    expect(
      compiled?.effects.filter((effect) => (effect.keywords ?? []).some((kw) => kw.keyword === "Delay")),
    ).toHaveLength(1);
  });
  it("puts the revealed card it did not add under the untouched cards when played", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-065", as: "option" }],
          deck: ["BT2-052", "BT1-009", "BT1-028", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-052")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028", "BT1-045", "BT1-009"]);
  });

  it("puts the revealed card it did not add at the bottom on the security path too", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "LM-065", as: "securityOption", faceUp: true }],
          deck: ["BT2-052", "BT1-009", "BT1-028", "BT1-045"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-065"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT2-052")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-028", "BT1-045", "BT1-009"]);
  });

  it("pays Delay but does not digivolve a Digimon the opponent controls", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-065", as: "option" }],
          hand: [{ card: "BT5-062", as: "evolution" }],
        },
        1: { battleArea: [{ card: "BT2-052", as: "opponentHost" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `LM-065/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(s.perm("opponentHost").topCard?.cardId).toBe("BT2-052");
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT5-062")).toBe(true);
  });

  it("exposes the Delay clause as the only OnDeclaration effect key", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-065", as: "option" },
            { card: "BT2-052", as: "host" },
          ],
          hand: [{ card: "BT5-062", as: "evolution" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `LM-065/ir-${EffectTiming.OnDeclaration}-1`,
      }),
    ).not.toEqual({ ok: true });
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("option").topCard!.instanceId,
        effectKey: `LM-065/ir-${EffectTiming.OnDeclaration}-0`,
      }),
    ).toEqual({ ok: true });
  });
});
