import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-014 Thetismon", () => {
  it("pays blue cards and trashes cards under an opponent stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-013", as: "base" }],
          hand: [{ card: "RB1-014", as: "thetismon" }, "RB1-011", "RB1-013"],
        },
        1: {
          battleArea: [
            { card: "RB1-024", as: "stacked", under: ["RB1-017", "RB1-020"] },
            { card: "EX2-045", as: "empty" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stacked").stack.length === 0);

    expect(s.state.players[0]!.trash.filter((card) => ["RB1-011", "RB1-013"].includes(card.cardId))).toHaveLength(2);
    expect(s.perm("stacked").stack).toHaveLength(0);
    expect(
      [s.perm("stacked"), s.perm("empty")].some((permanent) => observe(s.engine).hasRestriction(permanent, "suspend")),
    ).toBe(true);
  });

  it("leaves cards untouched when no blue payment cards are available", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "RB1-013", as: "base" }], hand: [{ card: "RB1-014", as: "thetismon" }] },
        1: { battleArea: [{ card: "RB1-024", as: "stacked", under: ["RB1-017"] }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
      }),
    ).toEqual({ ok: true });

    expect(s.perm("stacked").stack).toHaveLength(1);
  });
});
