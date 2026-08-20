import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-003.js";

describe("EX8-003", () => {
  it("inherits a once-per-turn attack effect that gives an opposing Digimon -2000 DP when you have another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: -2000,
          duration: "forTheTurn",
          target: { count: 1 },
          condition: { kind: "youHave" },
        },
      ],
    }));
  it("requires a distinct friendly Digimon for the DP reduction", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      condition: { kind: "youHave", filter: { excludeSelf: true, kind: ["Digimon"] } },
    }));

  it("reduces an opposing Digimon by 2000 DP when another friendly Digimon exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "AD1-001", as: "host", under: ["EX8-003"] },
            { card: "AD1-001", as: "ally" },
          ],
        },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => target.currentDP === before - 2000);
    expect(target.currentDP).toBe(before - 2000);
  });
});
