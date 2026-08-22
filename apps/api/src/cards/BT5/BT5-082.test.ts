import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT5-082.js";

describe("BT5-082 Tactimon", () => {
  it("has complete residual-free runtime coverage", () => {
    expect(runtimeCompiledCard("BT5-082")).toMatchObject({ coverage: "full", residual: [] });
  });

  it("activates all 3 effects when no other own Digimon is in play", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-082", as: "tacti" }] }, 1: { battleArea: [{ card: "BT5-071", as: "a" }, { card: "BT5-072", as: "b" }, { card: "BT5-061", as: "c" }], security: ["BT1-009"] } }, { autoSelectCards: true });
    const tacti = s.perm("tacti");
    const before = tacti.currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: tacti.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1 && tacti.currentDP === before + 2000 && s.state.players[1]!.battleArea.length === 0);

    expect(s.state.memory).toBe(1);
    expect(tacti.currentDP).toBe(before + 2000);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("activates only the chosen mode when another own Digimon is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-082", as: "tacti" }, { card: "BT5-071", as: "ally" }] },
      1: { battleArea: [{ card: "BT5-061", as: "opponent" }], security: ["BT1-009"] },
    }, { autoSelectCards: true });
    const beforeDP = s.perm("tacti").currentDP;
    s.state.memory = 0;

    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("tacti").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.perm("tacti").currentDP).toBe(beforeDP);
    expect(s.state.players[1]?.battleArea.some((permanent) => permanent.permanentId === s.perm("opponent").permanentId)).toBe(true);
  });
});
