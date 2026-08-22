import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-16.js";

describe("ST1-16 Gaia Force", () => {
  it("registers exact unrestricted deletion and Security activation as complete IR", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [], effects: [
      { trigger: "Main", actions: [{ kind: "Delete", target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } } }] },
      { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
    ] });
  });

  it("deletes any one opposing Digimon", async () => {
    const preferInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: ["ST1-03"], hand: [{ card: "ST1-16", as: "option" }] },
        1: {
          battleArea: [
            { card: "ST1-10", as: "target", under: [{ card: "ST1-01", as: "source" }] },
            { card: "ST1-06", as: "survivor" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds },
    );
    preferInstanceIds.push(s.perm("target").topCard.instanceId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("survivor").permanentId,
    ]);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("source").instanceId);
  });

  it("activates the same deletion effect from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST1-16", as: "securityOption", faceUp: true }] }, 1: { battleArea: ["ST1-10"] } },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
