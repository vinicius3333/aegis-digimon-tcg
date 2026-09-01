import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT19-011 WarGrowlmon", () => {
  it("publishes its ACE hand Counter Blast Digivolve marker", () => {
    expect(runtimeCompiledCard("BT19-011")?.effects[0]).toMatchObject({
      trigger: "Counter",
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve" }],
    });
  });

  it("naturally resolves its On Play deletion when played from hand", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT19-011", as: "warGrowlmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("warGrowlmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(6);
  });

  it("naturally resolves its deletion when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-009", as: "base" }], hand: [{ card: "BT19-011", as: "warGrowlmon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", dp: 3000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("warGrowlmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it.each([
    ["On Play", EffectTiming.OnPlay],
    ["When Digivolving", EffectTiming.WhenDigivolving],
  ])("%s deletes any combination within its scaled budget and gains memory per deletion", async (_label, timing) => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-011", as: "warGrowlmon" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 2000 },
            { card: "BT1-010", dp: 3000 },
            { card: "BT1-011", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(timing, s.perm("warGrowlmon"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.memory).toBe(3);
  });

  it("its inherited +3000 raises any printed numeric DP deletion maximum", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT19-015", as: "host", under: ["BT19-011", "BT19-009", "BT19-008"] }] },
        1: { battleArea: [{ card: "BT1-009", dp: 11000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;
    await advance(s.engine).recompute();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("host"));
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
