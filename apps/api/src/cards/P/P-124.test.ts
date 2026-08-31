import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-124.js";

describe("P-124 Davis Motomiya", () => {
  it("uses the second On Play mode to digivolve a Digimon into ExVeemon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-064", as: "host" }],
          hand: [
            { card: "P-124", as: "davis" },
            { card: "BT12-022", as: "exveemon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("exveemon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("exveemon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Veemon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-124", as: "davis" },
            { card: "BT11-023", as: "veemon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("davis").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId),
    );
    expect(s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("veemon").instanceId)).toBe(
      true,
    );
    const beforeStart = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("davis"));
    await settle();
    expect(s.state.memory).toBe(beforeStart + 1);
    assertNoLoudGap(s);
  });
});
