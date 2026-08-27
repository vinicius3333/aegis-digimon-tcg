import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-029.js";

describe("BT5-029 WereGarurumon: Sagittarius Mode", () => {
  it("has Jamming with a WereGarurumon source and grants its Garurumon host +1000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-029", as: "sagittarius", under: ["BT1-040"] },
          { card: "BT4-114", as: "host", under: ["BT5-029"] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(true);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("keeps Jamming only on its owner's turn and recognizes the source name boundary", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT5-029",
            as: "sagittarius",
            // BT5-020 (Lv.3) -> BT5-024 (Lv.4) -> BT1-040 (Lv.5) -> BT5-029 (Lv.5).
            under: ["BT5-020", "BT5-024", "BT1-040"],
          },
        ],
      },
    });
    expect(s.perm("sagittarius").stack.map((card) => card.cardId)).toEqual(["BT5-020", "BT5-024", "BT1-040"]);

    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(true);

    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(false);

    const wrongSource = setupEngine({
      0: { battleArea: [{ card: "BT5-029", as: "sagittarius", under: ["BT5-024"] }] },
    });
    await wrongSource.ready();
    expect(observe(wrongSource.engine).hasKeyword(wrongSource.perm("sagittarius"), "Jamming")).toBe(false);
  });

  it("applies the inherited bonus to Omnimon on both turns and excludes unrelated names", async () => {
    const omnimon = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-029"] }] } });
    await omnimon.ready();
    expect(omnimon.perm("host").currentDP).toBe(omnimon.perm("host").baseDP + 1000);
    omnimon.state.turnSeat = 1;
    await omnimon.ready();
    expect(omnimon.perm("host").currentDP).toBe(omnimon.perm("host").baseDP + 1000);

    const unrelated = setupEngine({ 0: { battleArea: [{ card: "BT7-064", as: "host", under: ["BT5-029"] }] } });
    await unrelated.ready();
    expect(unrelated.perm("host").currentDP).toBe(unrelated.perm("host").baseDP);
  });

  it("does not gain Jamming without a WereGarurumon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-029", as: "sagittarius" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(false);
  });
});
