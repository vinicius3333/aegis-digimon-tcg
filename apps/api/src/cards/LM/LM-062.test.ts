import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-062.js";

describe("LM-062 Breathing Training", () => {
  it("compiles the optional Delay digivolution with the printed cost reduction", () => {
    const compiled = runtimeCompiledCard("LM-062")!;
    const delay = compiled.effects.find((effect) => effect.keywords?.some((keyword) => keyword.keyword === "Delay"));
    expect(delay?.actions).toContainEqual(
      expect.objectContaining({ kind: "Digivolve", reduceCost: 2, payCost: true, optional: true }),
    );
  });

  it("keeps the Security reveal and placement effects marked as Security", () => {
    const compiled = runtimeCompiledCard("LM-062")!;
    const security = compiled.effects.find((effect) => effect.isSecurity);
    expect(security?.actions).toEqual([
      expect.objectContaining({ kind: "RevealAdd", revealCount: 2, rest: "deckBottom" }),
      { kind: "PlaceInBattleAreaSelf" },
    ]);
  });

  it("reveals two, adds a yellow or purple card, and places itself", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT1-045", "BT10-079"], hand: [{ card: "LM-062", as: "option" }], deck: ["BT1-045", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062")).toBe(true);
  });

  it("reveals two and places itself from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "LM-062", as: "option", faceUp: true }], deck: ["BT1-045", "BT1-009"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "LM-062")).toBe(true);
  });
});
