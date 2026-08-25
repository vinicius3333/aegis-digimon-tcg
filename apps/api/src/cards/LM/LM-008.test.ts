import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
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
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("angoramon"));

    expect(s.state.memory).toBe(1);
  });

  it("gains nothing without a Tamer", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "LM-008", as: "angoramon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 0;
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("angoramon"));

    expect(s.state.memory).toBe(0);
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
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("angoramon"));

    expect(s.state.memory).toBe(0);
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
