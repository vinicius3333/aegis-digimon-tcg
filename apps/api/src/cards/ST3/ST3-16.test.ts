import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST3-16.js";

describe("ST3-16 Seven Heavens", () => {
  it("gives an opposing Digimon -10000 DP from Main and Security", async () => {
    const main = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-16", as: "option" }] },
        1: { battleArea: [{ card: "ST3-10", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    main.state.memory = 8;
    expect(main.engine.applyIntent(0, { type: "playCard", instanceId: main.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => main.perm("target").currentDP === 2000);
    expect(main.perm("target").currentDP).toBe(2000);

    const security = setupEngine(
      {
        0: { security: [{ card: "ST3-16", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "ST3-10", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await advance(security.engine).fireForInstance(EffectTiming.SecuritySkill, security.inst("option"));
    expect(security.perm("target").currentDP).toBe(2000);
  });

  it("deletes a 10000 DP opposing Digimon from the Main effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-16", as: "option" }] },
        1: { battleArea: [{ card: "ST3-10", as: "target", dp: 10000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});

describe("ST3-16 Seven Heavens — KB Q&A rulings", () => {
  it("reduces a 10000 DP opposing Digimon to 0 DP and deletes it, while an 11000 DP one survives (Q646)", async () => {
    async function playOnTargetWithDp(dp: number) {
      const s = setupEngine(
        {
          0: { battleArea: ["ST3-07"], hand: [{ card: "ST3-16", as: "option" }] },
          1: { battleArea: [{ card: "ST3-10", as: "target", dp }] },
        },
        { autoSelectCards: true },
      );
      s.state.memory = 8;
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("option").instanceId));
      await settle();
      return s;
    }

    const deleted = await playOnTargetWithDp(10000);
    expect(deleted.state.players[1]!.battleArea).toHaveLength(0);
    expect(deleted.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("ST3-10");

    const survivor = await playOnTargetWithDp(11000);
    expect(survivor.state.players[1]!.battleArea).toHaveLength(1);
    expect(survivor.perm("target").currentDP).toBe(1000);
  });
});
