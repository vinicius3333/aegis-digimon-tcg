import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";
import { compiled } from "./EX4-006.js";

describe("EX4-006 Guilmon", () => {
  it("gains Rush for the turn on play when both trashes total at least 20 cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Rush" },
      duration: "forTheTurn",
      condition: { kind: "combinedTrashCount", op: "gte", value: 20 },
    });
  });
  it("uses the zero-cost Gigimon alternate digivolution requirement", () => {
    expect(compiled.digivolutionRequirement).toContainEqual(expect.objectContaining({ names: ["Gigimon"], cost: 0 }));
  });

  it("gains Rush from the combined trashes threshold and not below it", async () => {
    const card = "BT1-010";
    const enough = setupEngine({
      0: { battleArea: [{ card: "EX4-006", as: "guilmon" }], trash: Array(10).fill(card) },
      1: { trash: Array(10).fill(card) },
    });
    await enough.ready();
    await advance(enough.engine).fireForPermanent(EffectTiming.OnPlay, enough.perm("guilmon"));
    expect(observe(enough.engine).hasKeyword(enough.perm("guilmon"), "Rush")).toBe(true);

    const short = setupEngine({
      0: { battleArea: [{ card: "EX4-006", as: "guilmon" }], trash: Array(9).fill(card) },
      1: { trash: Array(10).fill(card) },
    });
    await short.ready();
    await advance(short.engine).fireForPermanent(EffectTiming.OnPlay, short.perm("guilmon"));
    expect(observe(short.engine).hasKeyword(short.perm("guilmon"), "Rush")).toBe(false);
  });
});
