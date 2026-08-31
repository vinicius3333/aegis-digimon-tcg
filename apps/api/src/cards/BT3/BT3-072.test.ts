import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-071.js";
import "./BT3-072.js";
import "../BT2/BT2-083.js";

describe("BT3-072 BryweLudramon", () => {
  it("grants Blocker to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-083", as: "host", under: ["BT3-072"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });

  it("grants inherited Blocker through a legal black level 5 evolution", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT3-071", as: "base" }],
        hand: [
          { card: "BT3-072", as: "evolving" },
          { card: "BT2-083", as: "levelSeven" },
        ],
      },
    });
    s.state.memory = 9;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT3-072");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("levelSeven").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT2-083");

    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blocker")).toBe(true);
  });
});
