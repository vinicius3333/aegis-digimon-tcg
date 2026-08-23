import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST6-04.js";
import "./ST6-16.js";

describe("ST6-16 Nail Bone", () => {
  it("plays a purple level 3 and level 4 from trash without their On Play effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST6-03"],
          hand: [{ card: "ST6-16", as: "option" }],
          deck: ["ST6-01", "ST6-03"],
          trash: [
            { card: "ST6-04", as: "lv3" },
            { card: "ST6-08", as: "lv4" },
            { card: "ST6-15", as: "wouldReturn" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.length === 3);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("wouldReturn").instanceId)).toBe(true);
  });

  it("plays one purple level 4 or lower from trash from security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "ST6-16", as: "option", faceUp: true }], trash: [{ card: "ST6-08", as: "digimon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === s.inst("digimon").instanceId)).toBe(
      true,
    );
  });

  it("may play only the available purple level 3 and ignores invalid trash cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["ST6-03"],
          hand: [{ card: "ST6-16", as: "option" }],
          trash: [
            { card: "ST6-04", as: "onlyValid" },
            { card: "ST1-03", as: "redLevel3" },
            { card: "ST6-11", as: "purpleLevel5" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard.instanceId === s.inst("onlyValid").instanceId,
      ),
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("redLevel3").instanceId, s.inst("purpleLevel5").instanceId]),
    );
  });
});
