import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX4-004.js";
import "../index.js";

describe("EX4-004 Pinamon", () => {
  it("gains 1 memory when deleted outside of battle", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });

  it("gains memory when its host is deleted by an effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-004"] }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect");

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });

  it("does not gain memory when its host is deleted in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX4-004"] }] } });
    s.state.turnSeat = 0;
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byBattle");

    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
