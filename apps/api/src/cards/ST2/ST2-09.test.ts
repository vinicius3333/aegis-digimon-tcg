import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST2-09.js";

describe("ST2-09 Zudomon", () => {
  it("trashes two bottom sources of an opposing Digimon when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST2-06", as: "base" }], hand: [{ card: "ST2-09", as: "zudomon" }] },
      1: { battleArea: [{ card: "ST1-10", as: "target", under: [
        { card: "ST1-03", as: "bottom" },
        { card: "ST1-04", as: "next" },
        { card: "ST1-05", as: "topSource" },
      ] }] },
    }, { autoSelectCards: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("zudomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("bottom").instanceId, s.inst("next").instanceId]));
    expect(s.perm("target").stack.map((card) => card.instanceId)).toEqual([
      s.inst("topSource").instanceId,
    ]);
  });

  it("trashes the only source when the chosen Digimon has fewer than two", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST2-06", as: "base" }], hand: [{ card: "ST2-09", as: "zudomon" }] },
        1: {
          battleArea: [{ card: "ST1-10", as: "target", under: [{ card: "ST1-03", as: "onlySource" }] }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("zudomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("onlySource").instanceId,
    );
  });
});
