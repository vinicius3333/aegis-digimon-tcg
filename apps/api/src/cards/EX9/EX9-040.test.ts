import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-040.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("EX9-040", () => {
  it("has Blocker and once per turn suspends an opposing Digimon when suspended", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns" && !entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "Suspend", target: { filter: { controller: "opponent" } } }],
        },
      ],
    });
  });
  it("inherits +1000 DP", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }],
    }));

  it("suspends one opposing Digimon when this Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX9-040", as: "source" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("source").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("does not trigger when another Digimon suspends", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX9-040", as: "source" },
            { card: "BT1-009", as: "other" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "opponent" }] },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );

    await advance(s.engine).verb.suspend([s.perm("other").permanentId]);
    await settle();
    expect(s.perm("opponent").isSuspended).toBe(false);

    await advance(s.engine).verb.suspend([s.perm("source").permanentId]);
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
