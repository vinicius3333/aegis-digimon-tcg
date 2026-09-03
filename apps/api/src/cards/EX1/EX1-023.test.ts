import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-023.js";

describe("EX1-023 Elecmon", () => {
  it("gives an opposing Digimon Security Attack -1 when its host is deleted", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT1-006", "EX1-023"] }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("does not grant the reduction to an opposing Tamer", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT1-006", "EX1-023"] }] },
      1: { battleArea: [{ card: "ST1-12", as: "tamer" }] },
    }, { autoSelectCards: true });
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("tamer"), "SecurityAttack")).toBe(0);
  });

  it("expires the Security Attack reduction at the end of the turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-051", as: "host", under: ["BT1-006", "EX1-023"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
    });
    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
    await advance(s.engine).runTurn(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });
});
