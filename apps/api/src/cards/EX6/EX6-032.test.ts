import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-032.js";

describe("EX6-032 Lopmon", () => {
  it("suspends one Digimon on play and inherits once-per-turn -2000 DP on attack", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
      target: { count: 1 },
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn" }],
    });
  });

  it("publicly suspends an opposing Digimon when played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-032", as: "lopmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lopmon"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("can suspend a friendly Digimon because the target is not opponent-scoped", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX6-032", as: "lopmon" },
            { card: "BT1-009", as: "ally" },
          ],
        },
        1: {},
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("ally").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("lopmon"));
    expect(s.perm("ally").isSuspended).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 2000 from its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-032"] }] },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
  });

  it("resolves its inherited attack reduction only once per turn", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-032"] }] },
        1: {
          battleArea: [
            { card: "EX6-031", as: "first" },
            { card: "EX6-031", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.inst("first").instanceId);
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("first").currentDP).toBe(13000);
    expect(s.perm("second").currentDP).toBe(15000);
  });

  it("expires the inherited attack reduction at the end of the turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-032"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent", dp: 15000 }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("opponent").currentDP).toBe(before);
  });
});
