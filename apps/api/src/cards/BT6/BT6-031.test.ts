import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT6-031.js";

describe("BT6-031 Tinkermon", () => {
  it("gives an opposing Digimon Security Attack -1 on deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT6-031", as: "tinkermon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).verb.deletePermanent([s.perm("tinkermon").permanentId], "byEffect");

    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-1);
  });
});
