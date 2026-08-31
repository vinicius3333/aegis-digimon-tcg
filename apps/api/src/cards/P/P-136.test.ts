import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import "./P-136.js";

describe("P-136 Arisa Kinosaki", () => {
  it("suspends this Tamer and gains memory when your Digimon digivolves into Puppet", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-136", as: "arisa" },
            { card: "BT3-033", as: "host" },
          ],
          hand: [{ card: "BT13-039", as: "knightChessmon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("knightChessmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("knightChessmon").instanceId);
    expect(s.perm("arisa").isSuspended).toBe(true);
    expect(s.state.memory).toBe(8);
    assertNoLoudGap(s);
  });

  it("plays Shoemon from hand on play", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-136", as: "arisa" },
            { card: "P-134", as: "shoemon" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("arisa").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoemon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("shoemon").instanceId)).toBe(
      true,
    );
    assertNoLoudGap(s);
  });

  it("plays itself from security without paying its play cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "P-136", as: "arisa" }] } });
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("arisa"));
    await settle();
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("arisa").instanceId)).toBe(true);
  });
});
