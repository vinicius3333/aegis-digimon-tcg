import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-069.js";

describe("BT18-069 Knightmon", () => {
  it("declares the optional once-per-turn forced attack at the opponent's end turn", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      optional: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Attack",
          mandatory: true,
          attackPlayer: true,
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("keeps Blocker and the inherited Knightmon DP effect", () => {
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }],
    });
  });

  it("makes the chosen opponent Digimon attack at a natural opponent-turn end", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT18-069", as: "knightmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "attacker" }], deck: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = -4;
    await s.ready();

    await advance(s.engine).runTurn(1);

    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(true);
    assertNoLoudGap(s);
  });

  it("applies inherited +2000 DP only to Digimon with Knightmon text", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-078", dp: 5000, as: "host", under: ["BT18-069"] },
          { card: "BT1-078", dp: 5000, as: "other" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("host").currentDP).toBe(7000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });
});
