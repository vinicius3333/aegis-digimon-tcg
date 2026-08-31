import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-125.js";

describe("P-125 Ken Ichijoji", () => {
  it("uses the second On Play mode to digivolve a Digimon into Stingmon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host" }],
          hand: [
            { card: "P-125", as: "ken" },
            { card: "BT12-050", as: "stingmon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ken").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("stingmon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("stingmon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Wormmon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-125", as: "ken" },
            { card: "BT12-047", as: "wormmon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ken").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("wormmon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("wormmon").instanceId)).toBe(
      true,
    );
    const beforeStart = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("ken"));
    await settle();
    expect(s.state.memory).toBe(beforeStart + 1);
    assertNoLoudGap(s);
  });
});
