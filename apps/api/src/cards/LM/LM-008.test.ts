import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./LM-008.js";

describe("LM-008 Angoramon", () => {
  it("gains 1 memory at the start of its owner's main phase while a Tamer is in play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-008", as: "angoramon" },
            { card: "BT9-086", as: "tamer" },
          ],
          hand: ["BT1-029"],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(4);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("gains nothing without a Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-008", as: "angoramon" }], hand: ["BT1-029"], deck: ["BT1-009"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("stays silent on the opponent's main phase", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-008", as: "angoramon" },
            { card: "BT9-086", as: "tamer" },
          ],
        },
        1: { hand: ["BT1-029"], deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.isFirstPlayersFirstTurn = false;
    s.state.memory = 3;
    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("grants +2000 DP on your turn to a host whose text mentions Angoramon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-011", as: "host", under: ["LM-008"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    const printed = getCardDefinition("LM-011")!.dp!;
    expect(s.perm("host").currentDP).toBe(printed + 2000);
  });

  it("grants nothing to a host with no Angoramon in its text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "host", under: ["LM-008"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(getCardDefinition("BT1-024")!.dp);
  });

  it("grants nothing on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-011", as: "host", under: ["LM-008"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();
    await advance(s.engine).recompute();

    expect(s.perm("host").currentDP).toBe(getCardDefinition("LM-011")!.dp);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-008");
    const compiled = runtimeCompiledCard("LM-008");
    expect(definition?.nameEn).toBe("Angoramon");
    expect(definition?.dp).toBe(1000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toBeDefined();
  });
});
