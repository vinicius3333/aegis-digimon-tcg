import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-025.js";

describe("LM-025 Cyberdramon", () => {
  it("reveals five, plays a qualifying black Tamer, and de-digivolves an opposing stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT11-092"],
          hand: [{ card: "LM-025", as: "cyberdramon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-015"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"));
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
    expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-015")!.stack).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081")).toBe(true);
  });

  it("does not de-digivolve when no qualifying Tamer is revealed", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-025", as: "cyberdramon" }],
          deck: ["BT1-001", "BT1-002", "BT1-003", "BT1-004", "BT1-005"],
        },
        1: { battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-015"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "LM-025"));
    expect(s.state.players[1]!.battleArea.find((perm) => perm.topCard?.cardId === "BT1-081")!.stack).toHaveLength(1);
  });

  it("plays a revealed black Tamer costing 4 or less for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-025", as: "cyberdramon" }],
          deck: ["BT11-092", "BT1-015", "BT1-016", "BT1-020", "BT1-024"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("cyberdramon"));
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("de-digivolves once per turn from the inherited attacking clause", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "host", under: ["LM-025"] }] },
        1: {
          battleArea: [{ card: "BT1-081", as: "target", under: ["BT1-015", "BT1-016"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.players[1]!.trash.some((card) => card.cardId === "BT1-081"), 2000);
    const afterFirst = s.state.players[1]!.trash.length;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[1]!.trash).toHaveLength(afterFirst);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-025");
    const compiled = runtimeCompiledCard("LM-025");
    expect(definition?.nameEn).toBe("Cyberdramon");
    expect(definition?.dp).toBe(8000);
    expect(definition?.overflowMemory).toBe(3);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
