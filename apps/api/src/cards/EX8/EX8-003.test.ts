import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./index.js";
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

  it("reduces an opposing Digimon by 2000 DP only once per turn when another friendly Digimon exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-045", as: "host", under: ["EX8-003"], dp: 20_000 },
            { card: "BT1-046", as: "ally" },
          ],
        },
        1: {
          security: ["EX8-003", "EX8-003"],
          battleArea: [{ card: "AD1-001", as: "target" }],
        },
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
    await settle(() => !observe(s.engine).isAttacking());
    await advance(s.engine).verb.unsuspend([s.perm("host").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(target.currentDP).toBe(before - 2000);
    s.state.memory = 0;
    await advance(s.engine).runTurn(0);
    expect(target.currentDP).toBe(before);
  });

  it("does not reduce DP when the inherited host is the controller's only Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-045", as: "host", under: ["EX8-003"] }] },
      1: { security: ["EX8-003"], battleArea: [{ card: "AD1-001", as: "target" }] },
    });
    const target = s.perm("target");
    const before = target.currentDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(target.currentDP).toBe(before);
  });
});
