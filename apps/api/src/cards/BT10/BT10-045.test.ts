import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT10-045.js";

describe("BT10-045 Kokuwamon", () => {
  it("gains 1 memory once per turn when its host deletes an opponent in battle", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT10-054", as: "host", under: ["BT10-045"] }] } });
    s.state.memory = 0;
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    expect(s.state.memory).toBe(1);
  });

  it("does not gain memory when a different Digimon wins the battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT10-054", as: "host", under: ["BT10-045"] },
          { card: "BT10-052", as: "otherWinner" },
        ],
      },
    });
    s.state.memory = 0;

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("otherWinner").permanentId,
    });
    expect(s.state.memory).toBe(0);

    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.memory).toBe(1);
  });
});
