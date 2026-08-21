import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT25-098.js";
import "../index.js";

describe("BT25-098 Cyber Engage", () => {
  it("maps every printed clause to full IR without residual behavior", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", actions: [expect.objectContaining({ kind: "WaiveColorRequirement" })] }),
        expect.objectContaining({
          trigger: "Main",
          actions: [expect.objectContaining({ kind: "RevealAdd", revealCount: 3 }), { kind: "PlaceInBattleAreaSelf" }],
        }),
        expect.objectContaining({
          trigger: "Main",
          keywords: [{ keyword: "Delay" }],
          actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: true, reduceCostBy: 3 })],
        }),
        expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] }),
      ]),
    );
  });

  it("reveals three, adds only an Appmon, trashes the rest, and places itself", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT25-098", as: "option" }], battleArea: [{ card: "BT25-089", as: "appmon" }], deck: ["BT1-001", { card: "BT25-061", as: "revealedAppmon" }, "BT1-002"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("revealedAppmon").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-001", "BT1-002"]));
  });

  it("consumes Delay and pays printed Appmon cost reduced by exactly 3", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-098", as: "delay" }], hand: [{ card: "BT25-061", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount - 1;
    s.state.memory = 10;
    await s.ready();
    const [entry] = JSON.parse(s.perm("delay").activatableEffectsJson) as { effectKey: string }[];
    expect(entry).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("delay").topCard.instanceId,
        effectKey: entry!.effectKey,
      }).ok,
    ).toBe(true);
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-061")).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.cardId === "BT25-098")).toBe(true);
    expect(s.state.memory).toBe(10);
  });

  it("cannot consume Delay on the turn it entered the battle area", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT25-098", as: "delay" }], hand: [{ card: "BT25-061", as: "target" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.perm("delay").enterFieldTurnCount = s.state.turnCount;
    await s.ready();
    expect(s.perm("delay").activatableEffectsJson).toBe("");
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098")).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT25-061")).toBe(true);
  });

  it("places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT25-098", as: "security", faceUp: true }] } });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("security"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-098")).toBe(true);
  });
});
