import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-070.js";

describe("EX1-070 Fight for Your Pride!", () => {
  it("plays a purple level-4-or-lower Digimon from trash and gives one Blocker when Myotismon is present", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX1-070", as: "option" }], battleArea: [{ card: "EX1-063", as: "myotismon" }, { card: "EX1-056", as: "purpleSource" }], trash: [{ card: "EX1-057", as: "played" }] } }, { autoSelectCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "EX1-057"));
    await settle(() => s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker")));
    expect(s.state.players[0]!.battleArea.some((p) => observe(s.engine).hasKeyword(p, "Blocker"))).toBe(true);
  });

  it("plays a purple level-4-or-lower Digimon from its owner's trash in security", async () => {
    const s = setupEngine(
      {
        1: {
          security: [{ card: "EX1-070", as: "option", faceUp: true }],
          trash: [
            { card: "EX1-057", as: "eligible" },
            { card: "EX1-061", as: "tooHigh" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const eligibleId = s.inst("eligible").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[1]!.battleArea.some((p) => p.topCard.instanceId === eligibleId)).toBe(true);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("tooHigh").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
  });
});
