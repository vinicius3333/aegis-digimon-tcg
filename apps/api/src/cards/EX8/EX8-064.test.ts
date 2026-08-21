import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-064.js";

describe("EX8-064", () => {
  it("de-digivolves an opposing Digimon by 3 and gives all opposing Digimon -6000 DP when digivolving", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: -6000, duration: "forTheTurn", target: { count: "all" } });
  });
  it("plays NSo cards from trash up to total play cost 10 during DNA digivolving and inherits security trash after another Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { totalPlayCost: 10 }, condition: { kind: "isDnaDigivolving" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controllerDefault: "both", excludeSelf: true }, actions: [{ kind: "Trash" }] }] });
  });
  it("applies the printed -6000 DP turn modifier to every opposing Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-064", as: "source" }] },
      1: { battleArea: [{ card: "BT1-010", as: "first", dp: 10000 }, { card: "BT1-011", as: "second", dp: 8000 }] },
    }, { autoSelectCards: true });
    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("source"));
    await settle(() => s.perm("first").currentDP === 4000 && s.perm("second").currentDP === 2000);
    expect(s.perm("first").currentDP).toBe(4000);
    expect(s.perm("second").currentDP).toBe(2000);
  });
  it("trashes the opponent's top security card after another Digimon is deleted", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX8-064", as: "source" }] },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId], "byEffect");
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });
});
