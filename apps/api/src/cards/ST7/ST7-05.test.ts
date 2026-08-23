import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST7-05.js";

describe("ST7-05 Growlmon", () => {
  it("gains 1 memory once per turn when an opposing Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-05"] }] },
        1: { battleArea: ["ST7-02"], security: ["ST7-01"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 3);
  });

  it("does not gain memory again from a second deletion in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST7-09", as: "host", under: ["ST7-05"] }] },
      1: {
        battleArea: [
          { card: "ST7-02", as: "first" },
          { card: "ST7-02", as: "second" },
        ],
      },
    });
    s.state.memory = 0;
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);
    expect(s.state.memory).toBe(1);
  });
});
