import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-035.js";
import { EffectTiming } from "@aegis/shared";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";

describe("EX7-035", () => {
  it("suspends an opposing Digimon and prevents it from unsuspending on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd", target: { sameTarget: true } },
    ]);
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([
      { kind: "Suspend" },
      { kind: "Restrict", restriction: "unsuspend", target: { sameTarget: true } },
    ]);
  });
  it("has Dinosaur as a rule trait and inherits trashing the opponent's top security after a battle deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({
      kind: "GrantStatic",
      grant: "trait",
      tokens: ["Dinosaur"],
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenDeletesInBattle",
      sourceFilter: { isSelfRef: true },
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    });
  });

  it("suspends an opposing Digimon and restricts that same target from unsuspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX7-035", as: "source" }] },
        1: { battleArea: [{ card: "EX7-011", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => s.perm("target").isSuspended && observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("trashes one opposing security card after its inherited battle deletion trigger", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX7-030", as: "host", under: ["EX7-035"] }] },
      1: { security: ["BT1-045", "BT1-046"] },
    });
    await s.ready();
    await advance(s.engine).fireSubTrigger("whenDeletesInBattle", { attackerPermanentId: s.perm("host").permanentId });
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.state.players[1]!.security).toHaveLength(1);
  });
});
