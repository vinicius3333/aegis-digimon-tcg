import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX6-033.js";

describe("EX6-033 Turuiemon", () => {
  it("suspends one Digimon on play and digivolving and inherits attack DP reduction", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "Suspend",
      optional: true,
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "ModifyDP", amount: -2000 }],
    });
  });

  it("publicly suspends an opposing Digimon when played", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX6-033", as: "turuiemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    s.state.memory = 10;
    await s.ready();
    preferred.push(s.perm("opponent").topCard!.instanceId);
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("turuiemon"));
    await settle(() => s.perm("opponent").isSuspended);
    expect(s.perm("opponent").isSuspended).toBe(true);
  });

  it("publicly reduces an opposing Digimon by 2000 from its inherited attack effect", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-060", as: "host", under: ["EX6-033"] }] },
      1: { battleArea: [{ card: "EX6-031", as: "opponent" }] },
    });
    await s.ready();
    const before = s.perm("opponent").currentDP;
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.perm("opponent").currentDP).toBe(before - 2000);
  });
});
