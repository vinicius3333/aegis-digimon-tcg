import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-016.js";

describe("BT8-016 MasterTyrannomon", () => {
  it("grants Security Attack +1 to every Tyrannomon during your turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-016", as: "master" },
          { card: "BT2-044", as: "tyrannomon" },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("master"), "SecurityAttack")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("tyrannomon"), "SecurityAttack")).toBe(true);
  });

  it("grants Security Attack +1 as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-016"] }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "SecurityAttack")).toBe(true);
  });

  it("does not grant its main effect to non-Tyrannomon, opposing Digimon, or during the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT8-016", as: "master" },
          { card: "BT2-044", as: "tyrannomon" },
          { card: "BT8-017", as: "nonTyrannomon" },
        ],
      },
      1: { battleArea: [{ card: "BT2-044", as: "opposingTyrannomon" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("master"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("tyrannomon"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("nonTyrannomon"), "SecurityAttack")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("opposingTyrannomon"), "SecurityAttack")).toBe(false);
  });

  it("checks two security cards through the inherited keyword", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT8-017", as: "host", under: ["BT8-016"] }] },
      1: { security: ["BT8-034", "BT8-034"] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
