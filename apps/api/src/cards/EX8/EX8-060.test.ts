import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-060.js";

describe("EX8-060", () => {
  it("plays an NSo Digimon costing 3 or less from trash when attacking", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking" && !entry.isInherited)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["trash"],
      payCost: false,
      optional: true,
      target: { count: 1, filter: { playCostLte: 3 } },
    }));
  it("DNA digivolves into NSo and may attack after an NSo is played or digivolves during your turn", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toHaveLength(2);
    expect(actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      actions: [{ kind: "DnaDigivolve" }, { kind: "Attack", optional: true }],
    });
    expect(actions[1]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
  });
  it("inherits a once-per-turn unsuspend by deleting another Digimon", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "Unsuspend", cost: { kind: "deleteOwn", target: { filter: { excludeSelf: true }, count: 1 } } }],
    }));
  it("unsuspends the exact host after deleting another Digimon as the inherited cost", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", suspended: true, under: ["EX8-060"] }, { card: "BT1-009", as: "other" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    const otherInstanceId = s.perm("other").topCard!.instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), { subjectPermanentId: s.perm("host").permanentId });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === otherInstanceId));

    expect(s.perm("host").isSuspended).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === otherInstanceId)).toBe(true);
  });
});
