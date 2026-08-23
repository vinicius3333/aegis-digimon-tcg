import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT17-032.js";

describe("BT17-032", () => {
  it("plays Rika Nonaka on digivolution if you do not already have one", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHaveNone" } },
      ],
    });
  });

  it("has inherited cost 2+ option Security Attack -1", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          actions: [{ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }],
        },
      ],
    });
  });

  it("reduces an opposing Digimon's Security Attack after a cost 2 option", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT17-033", as: "host", under: ["BT17-032"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target" }] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenOptionUsed", { usedOptionCost: 2, subjectPermanentId: "option-used" });
    expect(observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack")).toBe(true);
  });
});
