import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-109.js";

describe("BT8-109 Flame Hellscythe", () => {
  it("reduces an opposing Digimon and may play a purple or yellow Digimon from trash", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT8-041"], hand: [{ card: "BT8-109", as: "option" }], trash: ["BT8-071"] },
      1: { battleArea: [{ card: "BT8-023", as: "target" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 8;
    const before = s.perm("target").currentDP;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP !== before);

    expect(s.perm("target").currentDP).toBe(before - 6000);
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT8-071")).toBe(true);
  });

  it("activates the same Main effect from Security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT8-109", as: "option", faceUp: true }] },
      1: { battleArea: [{ card: "BT8-023", as: "target" }] },
    }, { autoSelectCards: true });
    const before = s.perm("target").currentDP;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("target").currentDP !== before);

    expect(s.perm("target").currentDP).toBe(before - 6000);
  });
});
