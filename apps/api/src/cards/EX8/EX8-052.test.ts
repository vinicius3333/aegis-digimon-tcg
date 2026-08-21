import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./EX8-052.js";

describe("EX8-052", () => {
  it("may play a Device Option from hand or trash when Cyberdramon or X Antibody is in its stack", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
      optional: true,
      condition: { kind: "selfDigivolutionStackHasTrait" },
    }));
  it("can de-digivolve by 2 by trashing an Option in the battle area", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "WhenDigivolving")[1]?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 2,
      optional: true,
      cost: { kind: "trash" },
    });
  });
  it("inherits a once-per-turn attack effect that trashes an Option to trash the opponent's top security", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [{ kind: "SecurityManipulation", op: "trash", controller: "opponent", from: ["security"], cost: { kind: "trash" } }],
    }));
  it("trashes the exact opposing security card after paying with an Option", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "host", under: ["EX8-052"] }, { card: "EX8-070", as: "option" }] },
      1: { security: ["BT1-009"] },
    });
    s.perm("option").placedByEffect = true;
    const securityInstanceId = s.state.players[1]!.security[0]!.instanceId;

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), { subjectPermanentId: s.perm("host").permanentId });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === securityInstanceId)).toBe(true);
  });
});
