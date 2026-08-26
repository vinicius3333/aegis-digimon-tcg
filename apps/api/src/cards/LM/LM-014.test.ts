import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-014.js";

describe("LM-014 Espimon", () => {
  it("reveals three, adds a revealed Tamer and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-014", as: "espimon" }],
          deck: ["AD1-020", "BT1-020", "BT1-024"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "AD1-020")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-020", "BT1-024"]);
  });

  it("adds a revealed card with Blocker rather than treating Draw as the missing catalog icon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-014", as: "espimon" }],
          deck: ["BT1-031", "BT1-020", "BT1-024"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT1-031"), 2000);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-031")).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["BT1-020", "BT1-024"]);
  });

  it("adds nothing when the three revealed cards are neither Tamers nor Blockers", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "LM-014", as: "espimon" }],
          deck: ["BT1-020", "BT1-024", "BT1-038"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;

    s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("espimon").instanceId });
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("draws once per opponent turn when the attack target is switched", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "host", under: ["LM-014"] }],
          deck: ["BT1-020", "BT1-038"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    await settle(() => s.state.players[0]!.hand.length === 1, 2000);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    await settle(() => s.state.pendingDecision === null);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("stays silent on its controller's own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-024", as: "host", under: ["LM-014"] }],
          deck: ["BT1-020", "BT1-038"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    await advance(s.engine).fireSubTrigger("whenAttackTargetSwitched", {});
    await settle(() => s.state.pendingDecision === null);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-014");
    const compiled = runtimeCompiledCard("LM-014");
    expect(definition?.nameEn).toBe("Espimon");
    expect(definition?.dp).toBe(1000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
