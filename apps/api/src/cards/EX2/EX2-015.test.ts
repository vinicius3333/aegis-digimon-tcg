import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX2-015.js";
import "../BT1/BT1-082.js";

describe("EX2-015 Seasarmon", () => {
  it("has Jamming", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("seasarmon"), "Jamming")).toBe(true);
  });

  it("survives a losing battle against a Security Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-015", as: "seasarmon" }] },
      1: { security: ["BT1-082"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("seasarmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});
