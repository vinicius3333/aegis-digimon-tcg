import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT2-079.js";

describe("BT2-079 VenomMyotismon", () => {
  it("has Security Attack +1 and gains memory when an opposing Digimon suspends on their turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-079", as: "venom" }] },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 0;

    await advance(s.engine).verb.suspend([s.perm("opponent").permanentId]);

    expect(observe(s.engine).hasKeyword(s.perm("venom"), "SecurityAttack")).toBe(true);
    expect(s.state.memory).toBe(-1);
  });
});
