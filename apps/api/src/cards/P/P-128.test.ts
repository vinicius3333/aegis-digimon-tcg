import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-128.js";

describe("P-128 Cody Hida", () => {
  it("uses the second On Play mode to digivolve a Digimon into Ankylomon for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT3-033", as: "host" }],
          hand: [
            { card: "P-128", as: "cody" },
            { card: "BT8-036", as: "ankylomon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 1, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cody").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("host").topCard.instanceId === s.inst("ankylomon").instanceId);
    expect(s.perm("host").topCard.instanceId).toBe(s.inst("ankylomon").instanceId);
    expect(s.state.memory).toBe(7);
    assertNoLoudGap(s);
  });

  it("plays Armadillomon from hand through the first On Play mode", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "P-128", as: "cody" },
            { card: "P-121", as: "armadillomon" },
          ],
        },
      },
      { autoChooseOption: true, preferOptionIndex: 0, autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cody").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armadillomon").instanceId),
    );
    expect(
      s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === s.inst("armadillomon").instanceId),
    ).toBe(true);
    const beforeStart = s.state.memory;
    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("cody"));
    await settle();
    expect(s.state.memory).toBe(beforeStart + 1);
    assertNoLoudGap(s);
  });
});
