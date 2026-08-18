import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-087.js";

describe("BT9-087 T.K. Takaishi & Izzy Izumi", () => {
  it("independently gains memory for each player controlling a level 5 or higher Digimon", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-087", as: "tamer" }, "BT9-065"] }, 1: { battleArea: ["BT9-065"] } });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));
    expect(s.state.memory).toBe(2);
  });

  it("may suspend after a yellow or green digivolution to give -1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-087", as: "tamer" }, { card: "BT9-052", as: "ally" }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } }, { autoAcceptOptional: true, autoSelectCards: true });
    await advance(s.engine).fireSubTrigger("whenOneOfYoursDigivolves", { subjectPermanentId: s.perm("ally").permanentId });
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("target").currentDP).toBe(2000);
  });
});
