import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-039.js";

describe("BT3-039 Angewomon", () => {
  it("gives Security Attack -2 to an opponent", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-051", as: "base" }], hand: [{ card: "BT3-039", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("target"), "SecurityAttack"));
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
  });

  it("plays a yellow level 3 from hand when its host attacks at 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-041", as: "host", under: ["BT3-039"] }],
          hand: [{ card: "BT3-032", as: "rookie" }],
          security: ["BT1-001", "BT1-002", "BT1-003"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId)).toBe(true);
  });

  it("does not play the inherited card above 3 security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-041", as: "host", under: ["BT3-039"] }],
          hand: [{ card: "BT3-032", as: "rookie" }],
          security: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("rookie").instanceId)).toBe(
      false,
    );
  });
});
