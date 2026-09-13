import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-025.js";
import "./LM-040.js";

describe("LM-025 Cyberdramon", () => {
  it("reveals five, plays a qualifying black Tamer, and de-digivolves an opposing stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT11-092"],
          hand: [{ card: "LM-025", as: "cyberdramon" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
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
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
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
          hand: [{ card: "LM-025", as: "cyberdramon" }],
          deck: ["BT11-092", "BT1-015", "BT1-016", "BT1-020", "BT1-024"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    s.state.memory = 0;
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cyberdramon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092"), 2000);

    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT11-092")).toBe(true);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck).toHaveLength(4);
  });

  it("de-digivolves once per turn from the inherited attacking clause", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "LM-040", as: "host", under: ["BT2-052", "BT2-056", "LM-025"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "target", under: ["BT1-009", "BT1-015"] }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-015", 2000);
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    await settle(() => !s.perm("host").isSuspended, 2000);
    const afterFirst = s.perm("target").topCard!.instanceId;
    expect(attack()).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    expect(s.perm("target").topCard!.instanceId).toBe(afterFirst);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-009"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => !s.perm("host").isSuspended, 2000);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("target").topCard?.cardId === "BT1-009", 2000);
    await settle(() => !observe(s.engine).isAttacking(), 2000);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === afterFirst)).toBe(true);
    expect(s.perm("target").stack).toHaveLength(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
