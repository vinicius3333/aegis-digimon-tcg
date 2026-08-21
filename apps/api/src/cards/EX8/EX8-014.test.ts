import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-014.js";

describe("EX8-014", () => {
  it("has Fortitude and may suspend a Digimon to delete an opposing Digimon with 8000 DP or less", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited && entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Fortitude", raw: "＜Fortitude＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { isSelfRef: true } }, { kind: "Suspend", optional: true }]);
  });
  it("inherits Security Attack +1", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }));
  it("suspends a Digimon and deletes an opposing Digimon at the 8000 DP boundary", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master" }] },
        1: { battleArea: [{ card: "EX8-015", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("master").permanentId);
    const targetInstanceId = s.perm("target").topCard!.instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("master"));
    await settle(() => s.perm("master").isSuspended);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === targetInstanceId)).toBe(true);
  });
  it("does not delete an opposing Digimon above 8000 DP after suspending", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX8-014", as: "master" }] },
        1: { battleArea: [{ card: "AD1-004", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("master"));
    await settle(() => s.perm("master").isSuspended);

    expect(s.perm("master").isSuspended).toBe(true);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.perm("target").topCard!.instanceId)).toBe(false);
  });
});
