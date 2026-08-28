import { describe, expect, it } from "vitest";
import { Phase, EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-03.js";

describe("ST16-03 Gabumon", () => {
  it("gains 1 memory at the start of main when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-03", as: "gabumon" }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponentDigimon" }] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when the opponent has no Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-03", as: "gabumon" }] } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));

    expect(s.state.memory).toBe(0);
  });

  it("does not count a Digimon in the opponent's breeding area (Q821)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-03", as: "gabumon" }] },
      1: { breeding: { card: "BT1-009" } },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("gabumon"));

    expect(s.state.memory).toBe(0);
  });

  it("draws then trashes only once per turn from an evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-009", as: "host", dp: 10000, under: [{ card: "ST16-03" }] }],
          hand: [{ card: "BT1-001" }, { card: "BT1-002" }],
          deck: [{ card: "BT1-003" }, { card: "BT1-004" }],
        },
        1: { security: [{ card: "BT1-009" }, { card: "BT1-009" }, { card: "BT1-009" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    await settle(() => s.state.players[0]!.trash.length === 1 && s.state.phase === Phase.Main);
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").isSuspended);

    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
