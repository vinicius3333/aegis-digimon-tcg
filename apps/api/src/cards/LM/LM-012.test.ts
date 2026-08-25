import { describe, expect, it } from "vitest";
import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-012.js";

describe("LM-012 Lamortmon", () => {
  it("suspends the last opposing Digimon and locks it down for the turn", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "LM-012", as: "lamortmon" }] },
        1: { battleArea: [{ card: "ST1-08", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lamortmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend"), 2000);

    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target").permanentId, "unsuspend")).toBe(true);
  });

  it("skips the lock while the opponent keeps an unsuspended Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "LM-012", as: "lamortmon" }] },
        1: {
          battleArea: [
            { card: "BT1-080", as: "victim" },
            { card: "BT2-064", as: "survivor" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("victim").permanentId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("lamortmon"));
    await settle(() => s.perm("victim").isSuspended, 2000);

    expect(s.perm("victim").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim").permanentId, "unsuspend")).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("survivor").permanentId, "unsuspend")).toBe(false);
  });

  it("trashes the opponent's top security card once per turn when an Angoramon-text host wins a battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "LM-013", as: "host", under: ["LM-012"] },
            { card: "LM-013", as: "second" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-080", as: "first", dp: 3000, suspended: true },
            { card: "BT2-064", as: "other", dp: 3000, suspended: true },
          ],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("first").permanentId },
    });
    await settle(() => s.state.players[1]!.security.length === 2, 3000);
    expect(s.state.players[1]!.security).toHaveLength(2);

    // The watcher lives on the single LM-012 in the stack and watches every Angoramon-text
    // Digimon, so a second winning battle this turn is outside its [Once Per Turn] budget.
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("second").permanentId,
      target: { kind: "permanent", permanentId: s.perm("other").permanentId },
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 3000);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.security).toHaveLength(2);
  });

  it("stays silent when the winning Digimon has no Angoramon in its text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-024", as: "host", under: ["LM-012"] }] },
        1: {
          battleArea: [{ card: "BT1-080", as: "victim", dp: 3000, suspended: true }],
          security: 3,
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("host").permanentId,
      target: { kind: "permanent", permanentId: s.perm("victim").permanentId },
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0, 3000);

    expect(s.state.players[1]!.security).toHaveLength(3);
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("LM-012");
    const compiled = runtimeCompiledCard("LM-012");
    expect(definition?.nameEn).toBe("Lamortmon");
    expect(definition?.dp).toBe(8000);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
