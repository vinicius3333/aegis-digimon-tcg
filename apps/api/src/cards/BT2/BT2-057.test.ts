import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-057.js";
import "./BT2-065.js";

describe("BT2-057 Greymon", () => {
  it("grants inherited Jamming during its turn while the host has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-057"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });

  it("survives battle against a stronger Security Digimon through Jamming", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-057"] }] },
      1: { security: ["BT2-083"] },
    });
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("does not grant Jamming when the host lacks Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-064", as: "host", under: ["BT2-057"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-057"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(false);
  });

  it("does not grant Jamming while Greymon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-057", as: "greymon" }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("greymon"), "Jamming")).toBe(false);
  });
});
