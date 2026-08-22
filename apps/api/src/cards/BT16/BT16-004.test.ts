import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-004.js";
import "../index.js";

describe("BT16-004", () => {
  it("once per turn gains memory when it deletes in battle and has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "selfColorCount", value: 2 } }],
        },
      ],
    }));

  it("gains memory once from a multicolor host when it wins battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-004"] }] } });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });

    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory from a one-color host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-006", as: "host", under: ["BT16-004"] }] } });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });

    expect(s.state.memory).toBe(0);
  });
});
