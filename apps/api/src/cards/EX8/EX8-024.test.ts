import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./EX8-024.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("EX8-024", () => {
  it("unsuspends one of your Digimon on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Unsuspend",
      target: { count: 1 },
    });
  });
  it("gates the attack restriction at the printed one-memory threshold", () =>
    expect(
      compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0],
    ).toMatchObject({
      kind: "Restrict",
      restriction: "suspend",
      condition: { kind: "memoryAtLeast", value: 1 },
      duration: "untilOpponentTurnEnd",
    }));
  it("unsuspends an allied Digimon on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX8-024", as: "source", suspended: true },
            { card: "EX8-021", as: "ally" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.perm("source").isSuspended).toBe(false);
  });
  it("restricts one opposing Digimon from suspending while you have memory", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-024", as: "source" }] },
      1: { battleArea: [{ card: "EX8-021", as: "opponent" }] },
    });
    s.state.memory = 1;
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("source"), {
      subjectPermanentId: s.perm("source").permanentId,
    });
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });
});
