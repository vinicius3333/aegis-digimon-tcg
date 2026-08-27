import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-077.js";
import "../ST2/ST2-13.js";

describe("BT3-077 Gazimon", () => {
  it("prevents the opponent from gaining memory through a security Option effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT3-077", as: "gazimon" },
          { card: "BT1-019", as: "attacker" },
        ],
      },
      1: { security: [{ card: "ST2-13", as: "hammerSpark" }] },
    });
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0, 5000);

    expect(s.state.memory).toBe(0);
  });

  it("blocks opposing Digimon and Option gains but allows Tamer and own effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-077", as: "gazimon" }] } });
    await s.ready();

    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Digimon"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Option"])).toBe(false);
    expect(observe(s.engine).canGainMemoryFromEffect(1, ["Tamer"])).toBe(true);
    expect(observe(s.engine).canGainMemoryFromEffect(0, ["Digimon"])).toBe(true);
  });
});
