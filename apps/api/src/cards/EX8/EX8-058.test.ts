import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "../index.js";
import { compiled } from "./EX8-058.js";

describe("EX8-058", () => {
  it("gains 1 memory on deletion", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({
      kind: "GainMemory",
      amount: 1,
    }));
  it("inherits once-per-turn deletion of an opposing level 3 Digimon when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Delete", target: { filter: { controller: "opponent", levels: [3] } } }],
    }));
  it("gains memory when the live permanent is deleted", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-058", as: "gesomon" }] } });
    await s.ready();
    s.state.memory = 0;
    await advance(s.engine).verb.deletePermanent([s.perm("gesomon").permanentId], "byEffect");
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
  it("deletes an exact opposing level 3 target but not a level 4 target", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-058"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "level3" }, { card: "EX8-058", as: "level4" }] },
    });
    const level3InstanceId = s.perm("level3").topCard!.instanceId;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === level3InstanceId));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === level3InstanceId)).toBe(true);
    expect(s.state.players[1]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX8-058")).toBe(true);
  });
});
